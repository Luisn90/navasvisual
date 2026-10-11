import test from 'node:test';
import assert from 'node:assert/strict';
import { processNewSolicitud, buildRecord, telegramAnalysis } from '../api/_solicitudes.mjs';
import { handleAgent } from '../api/agent.mjs';
import { handleBrief } from '../api/brief.mjs';

const env = {
  SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key', ANTHROPIC_API_KEY: 'claude-key',
  ADMIN_EMAILS: 'luis@example.com', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: 'chat'
};
const ROW_ID = '11111111-2222-3333-4444-555555555555';
const analysis = { resumen: 'Quiere un logo para su heladería.', encaje: 'Cabe en Estándar.', faltantes: ['¿Tiene colores definidos?'], prioridad: 'alta', siguiente_paso: 'Responder hoy.', borrador_asunto: 'Tu logo', borrador: 'Hola, soy Luis…' };
const record = buildRecord({ id: 'a'.repeat(64), serviceKey: 'logo', tierIndex: 1, values: { name: 'Ana', email: 'ana@example.com', brand: 'Helados Ana', business: 'Heladería' }, files: [{ name: '1-ref.png', type: 'image/png', bytes: Buffer.alloc(10) }] });

function network({ duplicate = false, claudeFails = false, user = 'luis@example.com' } = {}) {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('/auth/v1/user')) return user ? Response.json({ email: user }) : new Response('{}', { status: 401 });
    if (url.includes('/rest/v1/solicitudes?on_conflict')) return Response.json(duplicate ? [] : [{ ...JSON.parse(options.body), id: ROW_ID, created_at: '2026-10-11T07:00:00Z' }]);
    if (url.includes('/rest/v1/solicitudes?id=eq.') && options.method === 'PATCH') return Response.json([{ ...record, id: ROW_ID, ...JSON.parse(options.body) }]);
    if (url.includes('/rest/v1/solicitudes?id=eq.')) return Response.json([{ ...record, id: ROW_ID, created_at: '2026-10-11T07:00:00Z' }]);
    if (url.includes('/rest/v1/solicitudes?select=')) return Response.json([{ ...record, id: ROW_ID, created_at: '2026-10-11T07:00:00Z', ai: analysis }]);
    if (url.includes('api.anthropic.com')) {
      if (claudeFails) return Response.json({ error: 'down' }, { status: 529 });
      const body = JSON.parse(options.body);
      if (body.tools) return Response.json({ content: [{ type: 'tool_use', name: 'registrar_analisis', input: analysis }] });
      return Response.json({ content: [{ type: 'text', text: 'Tienes 1 solicitud pendiente: Helados Ana.' }] });
    }
    if (url.includes('api.telegram.org')) return Response.json({ ok: true });
    throw new Error(`unexpected ${url}`);
  };
  return { calls, fetcher };
}

test('stores a new request, analyzes it and sends the summary with a link to Telegram', async () => {
  const { calls, fetcher } = network();
  const result = await processNewSolicitud(env, record, 'https://site.example', fetcher);
  assert.deepEqual(result, { stored: true, id: ROW_ID, analyzed: true });
  const claude = calls.find(c => c.url.includes('anthropic'));
  assert.equal(claude.options.headers['x-api-key'], 'claude-key');
  assert.match(JSON.parse(claude.options.body).messages[0].content, /<brief>[\s\S]*Helados Ana[\s\S]*<\/brief>/);
  const patch = calls.find(c => c.options.method === 'PATCH');
  assert.equal(JSON.parse(patch.options.body).ai.prioridad, 'alta');
  const telegram = JSON.parse(calls.find(c => c.url.includes('sendMessage')).options.body);
  assert.match(telegram.text, /Quiere un logo/);
  assert.match(telegram.text, new RegExp(`https://site.example/admin.html#solicitud-${ROW_ID}`));
});

test('does not analyze a request that was already stored', async () => {
  const { calls, fetcher } = network({ duplicate: true });
  const result = await processNewSolicitud(env, record, 'https://site.example', fetcher);
  assert.equal(result.duplicate, true);
  assert.equal(calls.some(c => c.url.includes('anthropic') || c.url.includes('telegram')), false);
});

test('still links the request on Telegram when Claude is unavailable', async () => {
  const { calls, fetcher } = network({ claudeFails: true });
  const result = await processNewSolicitud(env, record, 'https://site.example', fetcher);
  assert.equal(result.analyzed, false);
  assert.match(JSON.parse(calls.find(c => c.url.includes('sendMessage')).options.body).text, /no está disponible/);
});

test('does nothing without Supabase configuration', async () => {
  const { calls, fetcher } = network();
  assert.deepEqual(await processNewSolicitud({}, record, 'https://site.example', fetcher), { stored: false });
  assert.equal(calls.length, 0);
});

test('telegram text survives a missing analysis', () => {
  assert.match(telegramAnalysis({ ...record, id: ROW_ID }, null, 'https://x/admin.html'), /Helados Ana/);
});

const agentRequest = (body, token = 'session-token') => new Request('https://site.example/api/agent', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
});

test('agent API rejects requests without a session', async () => {
  const { fetcher } = network();
  const response = await handleAgent(agentRequest({ action: 'chat', message: 'hola' }, null), { env, fetcher });
  assert.equal(response.status, 401);
});

test('agent API rejects sessions that are not on the admin list', async () => {
  const { calls, fetcher } = network({ user: 'otra@example.com' });
  const response = await handleAgent(agentRequest({ action: 'chat', message: 'hola' }), { env, fetcher });
  assert.equal(response.status, 403);
  assert.equal(calls.some(c => c.url.includes('anthropic')), false);
});

test('agent API reports missing configuration instead of failing silently', async () => {
  const { fetcher } = network();
  const response = await handleAgent(agentRequest({ action: 'chat', message: 'hola' }), { env: { ...env, ADMIN_EMAILS: '' }, fetcher });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'config');
});

test('agent API chats about stored requests', async () => {
  const { calls, fetcher } = network();
  const response = await handleAgent(agentRequest({ action: 'chat', message: '¿Qué tengo pendiente?', history: [{ from: 'agent', text: 'Hola' }, { from: 'me', text: 'Hola Marta' }, { from: 'agent', text: '¿En qué te ayudo?' }] }), { env, fetcher });
  assert.equal(response.status, 200);
  assert.match((await response.json()).reply, /Helados Ana/);
  const body = JSON.parse(calls.find(c => c.url.includes('anthropic')).options.body);
  assert.match(body.system, /Helados Ana/);
  assert.equal(body.messages[0].role, 'user');
  assert.equal(body.messages.at(-1).role, 'user');
  for (let i = 1; i < body.messages.length; i++) assert.notEqual(body.messages[i].role, body.messages[i - 1].role);
});

test('agent API re-analyzes one request', async () => {
  const { fetcher } = network();
  const response = await handleAgent(agentRequest({ action: 'analizar', id: ROW_ID }), { env, fetcher });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).solicitud.ai.resumen, analysis.resumen);
});

test('brief submission stores the request for Marta after notifying Telegram', async () => {
  const { calls, fetcher } = network();
  const body = new FormData();
  body.set('brief', JSON.stringify({ service: 'logo', tier: 1, values: { name: 'Ana', email: 'ana@example.com', brand: 'Helados Ana 2', business: 'Heladería', audience: 'Familias', goals: 'Logo', existing: 'Nueva', style: 'Simple', uses: 'Envases' } }));
  const response = await handleBrief(new Request('https://site.example/api/brief', { method: 'POST', body }), { env, fetcher, ip: 'agent-test' });
  assert.equal(response.status, 200);
  const urls = calls.map(c => c.url);
  assert.ok(urls.findIndex(u => u.includes('sendDocument')) < urls.findIndex(u => u.includes('on_conflict')));
  assert.ok(urls.some(u => u.includes('sendMessage')));
});

test('uses Groq when there is no Claude key', async () => {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes('on_conflict')) return Response.json([{ ...JSON.parse(options.body), id: ROW_ID, created_at: '2026-10-11T07:00:00Z' }]);
    if (url.includes('id=eq.')) return Response.json([{ id: ROW_ID }]);
    if (url.includes('api.groq.com')) return Response.json({ choices: [{ message: { tool_calls: [{ function: { name: 'registrar_analisis', arguments: JSON.stringify(analysis) } }] } }] });
    if (url.includes('telegram')) return Response.json({ ok: true });
    throw new Error(`unexpected ${url}`);
  };
  const groqEnv = { ...env, ANTHROPIC_API_KEY: '', GROQ_API_KEY: 'gsk_test' };
  const result = await processNewSolicitud(groqEnv, record, 'https://site.example', fetcher);
  assert.equal(result.analyzed, true);
  const call = calls.find(c => c.url.includes('groq'));
  assert.equal(call.options.headers.Authorization, 'Bearer gsk_test');
  const body = JSON.parse(call.options.body);
  assert.equal(body.model, 'openai/gpt-oss-120b');
  assert.equal(body.tool_choice.function.name, 'registrar_analisis');
  assert.equal(calls.some(c => c.url.includes('anthropic')), false);
});

test('Groq chat replies come from the message content', async () => {
  const fetcher = async url => {
    if (url.includes('/auth/v1/user')) return Response.json({ email: 'luis@example.com' });
    if (url.includes('select=')) return Response.json([]);
    if (url.includes('api.groq.com')) return Response.json({ choices: [{ message: { content: 'No tienes solicitudes pendientes.' } }] });
    throw new Error(`unexpected ${url}`);
  };
  const response = await handleAgent(agentRequest({ action: 'chat', message: 'hola' }), { env: { ...env, ANTHROPIC_API_KEY: '', GROQ_API_KEY: 'gsk_test' }, fetcher });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, 'No tienes solicitudes pendientes.');
});
