import test from 'node:test';
import assert from 'node:assert/strict';
import { runMonitor, handleMonitor, parseHtml, parseSource, summarizeState } from '../api/_monitor.mjs';

const BASE = 'https://site.example';
const env = { SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'k', GROQ_API_KEY: 'gsk', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: 'chat', MONITOR_SECRET: 's3cret' };
const page = (title, extra = '') => `<!doctype html><html lang="es"><head><title>${title}</title><meta name="description" content="d"><meta property="og:image" content="${BASE}/og.png">${extra}</head><body></body></html>`;

function site({ brokenImage = false, previous = null, slow = false } = {}) {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options });
    const u = new URL(url);
    if (u.host === 'db.example.co') {
      if (u.pathname.endsWith('/solicitudes')) return Response.json([{ id: '1', brand: 'Chess', created_at: new Date(Date.now() - 3600e3).toISOString(), ai: null }]);
      if (options.method === 'POST') return Response.json([{ ...JSON.parse(options.body), id: 'r1', created_at: new Date().toISOString() }]);
      if (options.method === 'DELETE') return new Response('');
      return Response.json(previous ? [previous] : []);
    }
    if (u.host === 'api.groq.com') return Response.json({ choices: [{ message: { content: 'Arreglar ya: la imagen rota.' } }] });
    if (u.host === 'api.telegram.org') return Response.json({ ok: true });
    if (u.host === 'www.googleapis.com') return Response.json({ lighthouseResult: { categories: { performance: { score: 0.42, auditRefs: [{ id: 'unused-javascript', weight: 0 }] }, seo: { score: 1, auditRefs: [] } }, audits: { 'unused-javascript': { title: 'Reduce unused JavaScript', score: 0.1, displayValue: 'Potential savings of 900 KiB', details: { overallSavingsMs: 2400 } }, 'largest-contentful-paint': { displayValue: '6.1 s' } } } });
    if (u.host === 'unpkg.com') return new Response('', { status: 200 });
    if (u.host === 'wa.me') return new Response('', { status: 404 });
    if (u.pathname === '/') {
      if (slow) await new Promise(r => setTimeout(r, 5));
      return new Response(page('Inicio', '<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"></script><script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script><script type="text/babel" src="home.jsx"></script><link rel="stylesheet" href="styles.css">'), { headers: { 'content-type': 'text/html', 'x-content-type-options': 'nosniff' } });
    }
    if (u.pathname === '/about.html') return new Response(`<html><head><title>Sobre mí</title></head></html>`);
    if (['/work.html', '/contact.html', '/admin.html'].includes(u.pathname)) return new Response(page('x'));
    if (u.pathname === '/home.jsx') return new Response(`<img src="assets/hero.jpg"/> <a href="work.html">x</a> <a href="https://wa.me/123">wa</a> const big = 'assets/foto grande.png';`);
    if (u.pathname.endsWith('.jsx')) return new Response('');
    if (u.pathname === '/assets/hero.jpg') return brokenImage ? new Response('', { status: 404 }) : new Response('', { headers: { 'content-length': '1000' } });
    if (u.pathname === '/assets/foto%20grande.png') return new Response('', { headers: { 'content-length': String(2 * 1024 * 1024) } });
    if (u.pathname === '/styles.css') return new Response('');
    if (u.pathname === '/api/brief' || u.pathname === '/api/agent') return Response.json({ error: 'method' }, { status: 405 });
    if (u.pathname === '/api/payment-rate') return Response.json({ error: 'date' }, { status: 503 });
    return new Response('', { status: 404 });
  };
  return { calls, fetcher };
}

test('parsers find SEO data, resources and links', () => {
  const info = parseHtml(page('Hola', '<script src="a.js"></script><img src="assets/x.png">'));
  assert.equal(info.title, 'Hola'); assert.equal(info.lang, 'es'); assert.deepEqual(info.refs, ['a.js', 'assets/x.png']);
  const src = parseSource(`<img src="assets/a.png"/> <a href="about.html#x">a</a> <a href={"https://instagram.com/x"}>i</a> url('/uploads/b.webp')`);
  assert.deepEqual(src.local, ['/assets/a.png', '/uploads/b.webp']);
  assert.deepEqual(src.pages, ['/about.html']);
  assert.deepEqual(src.external, ['https://instagram.com/x']);
  assert.equal(summarizeState([{ tipo: 'mejora' }, { tipo: 'aviso' }]), 'avisos');
});

test('a full review finds broken files, SEO gaps, heavy images, agent issues and PageSpeed tips', async () => {
  const { calls, fetcher } = site({ brokenImage: true });
  const report = await runMonitor(env, { base: BASE, modo: 'completo' }, fetcher);
  const ids = report.hallazgos.map(h => h.id);
  assert.equal(report.estado, 'problemas');
  assert.ok(ids.includes('asset:/assets/hero.jpg'));
  assert.ok(ids.includes('ext:https://wa.me/123'));
  assert.ok(ids.includes('desc:/about.html'));
  assert.ok(ids.includes('heavy:/assets/foto grande.png'));
  assert.ok(ids.includes('agents:marta'));
  assert.ok(ids.includes('react-dev') && ids.includes('babel-browser') && ids.includes('headers'));
  assert.ok(ids.includes('psi:unused-javascript'));
  assert.ok(!ids.includes('api:rate'), 'BCV sin tasa del día no es un problema');
  assert.ok(!ids.some(id => id.endsWith('/admin.html') && id.startsWith('desc')), 'el admin no se evalúa para SEO');
  assert.equal(report.hallazgos[0].tipo, 'error');
  assert.equal(report.metricas.pagespeed.rendimiento, 42);
  assert.equal(report.resumen, 'Arreglar ya: la imagen rota.');
  const texts = calls.filter(c => c.url.includes('sendMessage')).map(c => JSON.parse(c.options.body).text);
  assert.match(texts[0], /Vega encontró \d+ problemas nuevos/);
  assert.match(texts[0], /Archivo roto: \/assets\/hero.jpg/);
  assert.match(texts.at(-1), /Resumen de Vega/);
});

test('only new problems are announced and fixes are reported as resolved', async () => {
  const previous = { id: 'p', created_at: new Date().toISOString(), visto: true, hallazgos: [
    { id: 'asset:/assets/hero.jpg', tipo: 'error', titulo: 'Archivo roto: /assets/hero.jpg' },
    { id: 'agents:marta', tipo: 'aviso', titulo: 'Marta no analizó 1 solicitud' },
    { id: 'ext:https://wa.me/123', tipo: 'error', titulo: 'Enlace externo roto' }
  ] };
  const { calls, fetcher } = site({ brokenImage: false, previous });
  await runMonitor(env, { base: BASE, modo: 'rapido' }, fetcher);
  const texts = calls.filter(c => c.url.includes('sendMessage')).map(c => JSON.parse(c.options.body).text);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /se resolvió un problema[\s\S]*hero\.jpg/);
  assert.equal(calls.some(c => c.url.includes('googleapis')), false, 'la revisión rápida no llama a PageSpeed');
  const saved = JSON.parse(calls.find(c => c.url.endsWith('/monitor_reports') && c.options.method === 'POST').options.body);
  assert.equal(saved.visto, true);
});

test('the scheduled route requires the shared secret', async () => {
  const { fetcher } = site();
  const denied = await handleMonitor(new Request(`${BASE}/api/monitor`, { method: 'POST' }), { env, fetcher });
  assert.equal(denied.status, 401);
  const wrong = await handleMonitor(new Request(`${BASE}/api/monitor`, { method: 'POST', headers: { Authorization: 'Bearer nope' } }), { env, fetcher });
  assert.equal(wrong.status, 401);
  const noSecret = await handleMonitor(new Request(`${BASE}/api/monitor`, { method: 'POST', headers: { Authorization: 'Bearer ' } }), { env: { ...env, MONITOR_SECRET: '' }, fetcher });
  assert.equal(noSecret.status, 401);
  const ok = await handleMonitor(new Request(`${BASE}/api/monitor?modo=completo`, { method: 'POST', headers: { Authorization: 'Bearer s3cret' } }), { env, fetcher });
  assert.equal(ok.status, 202);
  assert.equal((await ok.json()).modo, 'completo');
});
