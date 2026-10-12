import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePresupuesto } from '../api/presupuesto.mjs';
import { handleAgent } from '../api/agent.mjs';
import { cleanPresupuesto, presupuestoEmail, vistaPublica, numeroDe, vencido, firmaHtml } from '../api/_presupuestos.mjs';

const TOKEN = 'b'.repeat(64);
const NOW = Date.parse('2026-10-12T12:00:00Z');
const ROW = {
  id: '11111111-2222-3333-4444-555555555555', numero: 7, token: TOKEN, estado: 'enviado', lang: 'es',
  cliente_nombre: 'Ana Pérez', cliente_email: 'ana@example.com', marca: 'Café Luna', titulo: 'Identidad para Café Luna', intro: '',
  conceptos: [{ descripcion: 'Logo', detalle: '', precio: 300 }, { descripcion: 'Manual', detalle: '', precio: 150 }],
  entregables: ['Logo en SVG'], plazo: '3 semanas', rondas: 2, rondas_extra: '', anticipo: 50, metodos: ['binance'],
  validez_dias: 15, notas: 'nota', total: 450, solicitud_id: null, enviado_at: '2026-10-10T12:00:00Z', visto_at: null,
  created_at: '2026-10-10T11:00:00Z'
};
const env = { SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service', RESEND_API_KEY: 're_test', BRIEF_EMAIL_FROM: 'Navas Visual <hola@navasvisual.com>', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: 'chat', ADMIN_EMAILS: 'luis@example.com' };

function fakeFetch({ row = ROW, patchMatches = true } = {}) {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    url = String(url); calls.push({ url, options });
    if (url.includes('/auth/v1/user')) return Response.json({ email: 'luis@example.com' });
    if (url.includes('/rest/v1/presupuestos') && (!options.method || options.method === 'GET')) return Response.json(row ? [row] : []);
    if (url.includes('/rest/v1/presupuestos') && options.method === 'PATCH') return Response.json(patchMatches ? [{ ...row, ...JSON.parse(options.body) }] : []);
    if (url.includes('/rest/v1/presupuestos') && options.method === 'POST') return Response.json([{ ...JSON.parse(options.body), id: ROW.id, numero: 8, estado: 'borrador' }]);
    if (url.includes('api.resend.com')) return Response.json({ id: 'email_1' });
    if (url.includes('api.telegram.org')) return Response.json({ ok: true });
    return Response.json({}, { status: 404 });
  };
  return { fetcher, calls };
}
const get = (q) => new Request(`https://navasvisual.com/api/presupuesto?${q}`);
const post = (body) => new Request('https://navasvisual.com/api/presupuesto', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const agent = (body) => new Request('https://navasvisual.com/api/agent', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' } });

test('valida el formulario y calcula el total', () => {
  const { data } = cleanPresupuesto({ cliente_nombre: ' Ana ', cliente_email: 'ANA@example.com', titulo: 'Web', conceptos: [{ descripcion: 'Diseño', precio: '100.5' }, { descripcion: 'Desarrollo', precio: 200 }, {}], entregables: 'Uno\n\nDos', metodos: ['binance', 'hack'], anticipo: 150 });
  assert.equal(data.total, 300.5);
  assert.equal(data.conceptos.length, 2);
  assert.deepEqual(data.entregables, ['Uno', 'Dos']);
  assert.deepEqual(data.metodos, ['binance']);
  assert.equal(data.anticipo, 100);
  assert.equal(data.cliente_email, 'ana@example.com');
  assert.equal(cleanPresupuesto({ cliente_nombre: 'A', cliente_email: 'mal', titulo: 'x', conceptos: [{ descripcion: 'a', precio: 1 }] }).error, 'cliente_email');
  assert.equal(cleanPresupuesto({ cliente_nombre: 'A', cliente_email: 'a@b.co', titulo: 'x', conceptos: [] }).error, 'conceptos');
  assert.equal(cleanPresupuesto({ cliente_nombre: 'A', cliente_email: 'a@b.co', titulo: 'x', conceptos: [{ descripcion: 'a', precio: -5 }] }).error, 'conceptos');
});

test('la vista pública no expone datos internos y detecta vencidos', () => {
  const v = vistaPublica(ROW, NOW);
  assert.equal(v.numero, 'P-0007');
  assert.equal(v.cliente_email, undefined);
  assert.equal(v.token, undefined);
  assert.equal(v.estado, 'enviado');
  assert.equal(vencido(ROW, Date.parse('2026-11-01T00:00:00Z')), true);
  assert.equal(vistaPublica(ROW, Date.parse('2026-11-01T00:00:00Z')).estado, 'vencido');
});

test('el correo lleva enlace, firma y escapa el contenido', () => {
  const mail = presupuestoEmail('enviado', { ...ROW, titulo: '<script>x</script>' });
  assert.match(mail.html, /presupuesto\.html\?p=b{64}/);
  assert.match(mail.html, /Fundador y diseñador/);
  assert.match(mail.html, /@navasvisual\.design/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.subject, /P-0007/);
  const en = presupuestoEmail('enviado', { ...ROW, lang: 'en' });
  assert.match(en.html, /DIGITAL VISUAL DESIGN/);
  assert.match(firmaHtml('en'), /Founder &amp; designer/);
});

test('GET muestra el presupuesto, marca visto y avisa a Luis', async () => {
  const { fetcher, calls } = fakeFetch();
  const res = await handlePresupuesto(get(`p=${TOKEN}`), { env, fetcher, now: NOW, ip: 'g1' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.presupuesto.titulo, ROW.titulo);
  assert.ok(calls.some(c => c.options.method === 'PATCH' && c.options.body.includes('visto_at')));
  assert.ok(calls.some(c => c.url.includes('api.telegram.org')));
});

test('un borrador solo se ve como vista previa', async () => {
  const { fetcher } = fakeFetch({ row: { ...ROW, estado: 'borrador', enviado_at: null } });
  assert.equal((await handlePresupuesto(get(`p=${TOKEN}`), { env, fetcher, now: NOW, ip: 'g2' })).status, 404);
  const res = await handlePresupuesto(get(`p=${TOKEN}&vista=1`), { env, fetcher, now: NOW, ip: 'g2' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).preview, true);
});

test('token inválido o inexistente da 404', async () => {
  const { fetcher } = fakeFetch({ row: null });
  assert.equal((await handlePresupuesto(get('p=nope'), { env, fetcher, now: NOW, ip: 'g3' })).status, 404);
  assert.equal((await handlePresupuesto(get(`p=${TOKEN}`), { env, fetcher, now: NOW, ip: 'g3' })).status, 404);
});

test('aceptar cambia el estado, envía correo y avisa por Telegram', async () => {
  const { fetcher, calls } = fakeFetch();
  const res = await handlePresupuesto(post({ p: TOKEN, accion: 'aceptar' }), { env, fetcher, now: NOW, ip: 'p1' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).presupuesto.estado, 'aceptado');
  const patch = calls.find(c => c.options.method === 'PATCH');
  assert.match(patch.url, /estado=eq\.enviado/);
  assert.ok(calls.some(c => c.url.includes('api.resend.com')));
  assert.ok(calls.some(c => c.url.includes('api.telegram.org') && c.options.body.includes('ACEPTADO')));
});

test('no se puede responder dos veces ni uno vencido', async () => {
  let { fetcher } = fakeFetch({ row: { ...ROW, estado: 'aceptado' } });
  assert.equal((await handlePresupuesto(post({ p: TOKEN, accion: 'rechazar' }), { env, fetcher, now: NOW, ip: 'p2' })).status, 409);
  ({ fetcher } = fakeFetch());
  assert.equal((await handlePresupuesto(post({ p: TOKEN, accion: 'aceptar' }), { env, fetcher, now: Date.parse('2026-12-01T00:00:00Z'), ip: 'p2' })).status, 409);
  ({ fetcher } = fakeFetch({ patchMatches: false }));
  assert.equal((await handlePresupuesto(post({ p: TOKEN, accion: 'aceptar' }), { env, fetcher, now: NOW, ip: 'p2' })).status, 409);
});

test('rechaza peticiones mal formadas y de otro origen', async () => {
  const { fetcher } = fakeFetch();
  assert.equal((await handlePresupuesto(post({ p: TOKEN, accion: 'borrar' }), { env, fetcher, now: NOW, ip: 'p3' })).status, 400);
  const foreign = new Request('https://navasvisual.com/api/presupuesto', { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } });
  assert.equal((await handlePresupuesto(foreign, { env, fetcher, now: NOW, ip: 'p3' })).status, 403);
});

test('la oficina guarda y envía presupuestos', async () => {
  let { fetcher, calls } = fakeFetch();
  const save = await handleAgent(agent({ action: 'presupuesto_guardar', presupuesto: { cliente_nombre: 'Ana', cliente_email: 'ana@example.com', titulo: 'Web', conceptos: [{ descripcion: 'Diseño', precio: 100 }] } }), { env, fetcher });
  assert.equal(save.status, 200);
  const created = JSON.parse(calls.find(c => c.options.method === 'POST' && c.url.includes('presupuestos')).options.body);
  assert.match(created.token, /^[0-9a-f]{64}$/);
  const bad = await handleAgent(agent({ action: 'presupuesto_guardar', presupuesto: { cliente_nombre: 'Ana' } }), { env, fetcher });
  assert.equal(bad.status, 400);

  ({ fetcher, calls } = fakeFetch({ row: { ...ROW, estado: 'borrador', enviado_at: null } }));
  const send = await handleAgent(agent({ action: 'presupuesto_enviar', id: ROW.id }), { env, fetcher });
  assert.equal(send.status, 200);
  assert.equal((await send.json()).presupuesto.estado, 'enviado');
  const mail = JSON.parse(calls.find(c => c.url.includes('api.resend.com')).options.body);
  assert.deepEqual(mail.to, ['ana@example.com']);

  ({ fetcher } = fakeFetch({ row: { ...ROW, estado: 'aceptado' } }));
  assert.equal((await handleAgent(agent({ action: 'presupuesto_enviar', id: ROW.id }), { env, fetcher })).status, 409);
  assert.equal(numeroDe({ numero: 12 }), 'P-0012');
});
