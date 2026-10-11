import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePago } from '../api/pago.mjs';
import { decidePayment, paymentEmail, maskEmail } from '../api/_pagos.mjs';

const KEY = 'a'.repeat(64);
const ROW = { id: '11111111-2222-3333-4444-555555555555', request_id: KEY, status: 'revision', service_name: 'Logo', tier: 'Básico', price: 50, name: 'Ana Pérez', email: 'ana@example.com', brand: 'Café Luna', pago: null };
const env = { SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service', RESEND_API_KEY: 're_test', BRIEF_EMAIL_FROM: 'Navas Visual <hola@navasvisual.com>', BRIEF_EMAIL_TO: 'luis@example.com', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: 'chat' };
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

function fakeFetch({ row = ROW, lookupsUntilFound = 0, failEmail = false } = {}) {
  const calls = []; let lookups = 0;
  const fetcher = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rest/v1/solicitudes?request_id=eq.')) { lookups++; return Response.json(lookups > lookupsUntilFound && row ? [row] : []); }
    if (String(url).includes('/rest/v1/solicitudes?id=eq.')) return Response.json([{ ...row, ...JSON.parse(options.body) }]);
    if (String(url).includes('/storage/v1/object/pagos/')) return Response.json({ Key: 'ok' });
    if (String(url).includes('api.resend.com')) return failEmail ? Response.json({ error: 'x' }, { status: 500 }) : Response.json({ id: 'email_1' });
    if (String(url).includes('api.telegram.org')) return Response.json({ ok: true });
    return Response.json({}, { status: 404 });
  };
  return { fetcher, calls };
}
function request(fields = {}, file = { bytes: PNG, type: 'image/png', name: 'pago.png' }) {
  const body = new FormData();
  body.set('key', KEY); body.set('metodo', 'binance'); body.set('referencia', '123456'); body.set('lang', 'es');
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  if (file) body.set('comprobante', new Blob([file.bytes], { type: file.type }), file.name);
  return new Request('https://navasvisual.com/api/pago', { method: 'POST', body });
}
const wait = async () => {};

test('subir comprobante: guarda el archivo, marca «verificando», avisa al cliente y a Luis', async () => {
  const { fetcher, calls } = fakeFetch();
  const response = await handlePago(request(), { env, fetcher, wait, ip: 'a' });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.estado, 'verificando');
  assert.equal(body.emailed, true);
  assert.equal(body.email, 'an•@example.com');
  assert.ok(calls.some(c => c.url.includes(`/storage/v1/object/pagos/${ROW.id}/`)));
  const patch = JSON.parse(calls.find(c => c.url.includes('/rest/v1/solicitudes?id=eq.')).options.body);
  assert.equal(patch.pago.estado, 'verificando');
  assert.equal(patch.pago.metodo, 'binance');
  assert.equal(patch.pago.referencia, '123456');
  const email = JSON.parse(calls.find(c => c.url.includes('api.resend.com')).options.body);
  assert.deepEqual(email.to, ['ana@example.com']);
  assert.equal(email.reply_to, 'luis@example.com');
  assert.match(email.subject, /Recibimos tu comprobante/);
  assert.match(email.html, /Estamos verificando tu pago/);
  assert.equal(email.attachments.length, 1);
  assert.ok(calls.some(c => c.url.includes('/sendDocument')));
});

test('espera a que la solicitud se guarde si el cliente sube el pago enseguida', async () => {
  const { fetcher } = fakeFetch({ lookupsUntilFound: 2 });
  const response = await handlePago(request(), { env, fetcher, wait, ip: 'b' });
  assert.equal(response.status, 200);
});

test('rechaza claves inválidas, archivos falsos y pagos ya confirmados', async () => {
  const { fetcher } = fakeFetch();
  assert.equal((await handlePago(request({ key: 'abc' }), { env, fetcher, wait, ip: 'c' })).status, 400);
  assert.equal((await handlePago(request({}, { bytes: Buffer.from('hola'), type: 'image/png', name: 'x.png' }), { env, fetcher, wait, ip: 'c' })).status, 400);
  assert.equal((await handlePago(request({ metodo: 'tarjeta' }), { env, fetcher, wait, ip: 'c' })).status, 400);
  assert.equal((await handlePago(request({}, null), { env, fetcher, wait, ip: 'c' })).status, 400);
  const confirmed = fakeFetch({ row: { ...ROW, pago: { estado: 'confirmado' } } });
  assert.equal((await handlePago(request(), { env, fetcher: confirmed.fetcher, wait, ip: 'd' })).status, 409);
  const missing = fakeFetch({ row: null });
  assert.equal((await handlePago(request(), { env, fetcher: missing.fetcher, wait, ip: 'e' })).status, 404);
});

test('si el correo falla, el comprobante queda registrado igual', async () => {
  const { fetcher } = fakeFetch({ failEmail: true });
  const response = await handlePago(request(), { env, fetcher, wait, ip: 'f' });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.emailed, false);
});

test('confirmar el pago envía el recibo al cliente y acepta la solicitud', async () => {
  const { fetcher, calls } = fakeFetch();
  const row = { ...ROW, pago: { estado: 'verificando', metodo: 'pagomovil', referencia: '998877', enviado_at: '2026-10-11T20:00:00Z', lang: 'es' } };
  const result = await decidePayment(env, row, { decision: 'confirmar' }, { link: 'https://navasvisual.com/admin.html' }, fetcher);
  assert.equal(result.email, true);
  const patch = JSON.parse(calls.find(c => c.url.includes('/rest/v1/solicitudes?id=eq.')).options.body);
  assert.equal(patch.pago.estado, 'confirmado');
  assert.equal(patch.status, 'aceptada');
  const email = JSON.parse(calls.find(c => c.url.includes('api.resend.com')).options.body);
  assert.match(email.subject, /Pago confirmado/);
  assert.match(email.html, /Pago Móvil/);
  assert.match(email.html, /998877/);
  // Confirmar dos veces no repite el correo.
  const again = await decidePayment(env, { ...row, pago: { ...row.pago, estado: 'confirmado', correo_confirmado: true } }, { decision: 'confirmar' }, {}, fetcher);
  assert.equal(again.already, true);
  assert.equal(calls.filter(c => c.url.includes('api.resend.com')).length, 1);
});

test('rechazar el pago explica el motivo al cliente', async () => {
  const { fetcher, calls } = fakeFetch();
  await decidePayment(env, { ...ROW, pago: { estado: 'verificando', metodo: 'binance' } }, { decision: 'rechazar', motivo: 'No veo el pago en Binance' }, {}, fetcher);
  const email = JSON.parse(calls.find(c => c.url.includes('api.resend.com')).options.body);
  assert.match(email.subject, /No pude confirmar/);
  assert.match(email.html, /No veo el pago en Binance/);
});

test('los correos escapan los datos del cliente y salen en inglés si el cliente usó EN', () => {
  const mail = paymentEmail('verificando', { ...ROW, name: '<script>x</script>' }, { metodo: 'binance', referencia: '<b>1</b>', lang: 'en' });
  assert.doesNotMatch(mail.html, /<script>|<b>1<\/b>/);
  assert.match(mail.subject, /We received your payment receipt/);
  assert.equal(maskEmail('luis@gmail.com'), 'lu••@gmail.com');
});
