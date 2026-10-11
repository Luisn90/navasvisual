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
const concepts = { enfoque: 'Frescura artesanal.', conceptos: [
  { titulo: 'Cono geométrico', idea: 'Un cono simple.', simbolo: 'Triángulo y círculo', estilo: 'Minimal', colores: ['#FF5A4E', 'rojo', '#1FB5C9'], tipografia: 'Sans redonda', prompt_imagen: 'minimal ice cream cone mark' },
  { titulo: 'Gota', idea: 'Helado que se derrite.', simbolo: 'Gota', estilo: 'Orgánico', colores: ['#FFB020'], tipografia: 'Serif suave', prompt_imagen: 'melting drop mark' },
  { titulo: 'Monograma', idea: 'Inicial A.', simbolo: 'A redondeada', estilo: 'Tipográfico', colores: ['#111111'], tipografia: 'Geométrica', prompt_imagen: 'rounded letter A monogram shape' }
] };
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
      if (body.tools?.[0]?.name === 'registrar_conceptos') return Response.json({ content: [{ type: 'tool_use', name: 'registrar_conceptos', input: concepts }] });
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
  assert.deepEqual(result, { stored: true, id: ROW_ID, analyzed: true, design: 'listo' });
  const claude = calls.find(c => c.url.includes('anthropic'));
  assert.equal(claude.options.headers['x-api-key'], 'claude-key');
  assert.match(JSON.parse(claude.options.body).messages[0].content, /<brief>[\s\S]*Helados Ana[\s\S]*<\/brief>/);
  const patch = calls.find(c => c.options.method === 'PATCH');
  assert.equal(JSON.parse(patch.options.body).ai.prioridad, 'alta');
  const telegram = JSON.parse(calls.find(c => c.url.includes('sendMessage')).options.body);
  assert.match(telegram.text, /Quiere un logo/);
  assert.match(telegram.text, new RegExp(`https://site.example/admin.html#solicitud-${ROW_ID}`));
  assert.match(telegram.text, /Camilo/);
  // Camilo recibe el brief y el análisis de Marta
  const design = calls.filter(c => c.url.includes('anthropic')).map(c => JSON.parse(c.options.body)).find(b => b.tools?.[0]?.name === 'registrar_conceptos');
  assert.match(design.messages[0].content, /<analisis_de_marta>[\s\S]*Quiere un logo/);
  const saved = calls.filter(c => c.options.method === 'PATCH').map(c => JSON.parse(c.options.body)).find(b => b.diseno?.estado === 'listo');
  assert.equal(saved.diseno.conceptos.length, 3);
  assert.deepEqual(saved.diseno.conceptos[0].colores, ['#FF5A4E', '#1FB5C9']);
  assert.equal(saved.diseno.con_imagenes, false);
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

test('Camilo generates one image per concept with Cloudflare and sends them to Telegram', async () => {
  const { calls, fetcher: base } = network();
  const jpeg = Buffer.from([255, 216, 255, 0, 1]);
  const fetcher = async (url, options = {}) => {
    if (url.includes('api.cloudflare.com')) { calls.push({ url, options }); return Response.json({ success: true, result: { image: jpeg.toString('base64') } }); }
    if (url.includes('/storage/v1/object/disenos/')) { calls.push({ url, options }); return Response.json({ Key: 'ok' }); }
    if (url.includes('sendMediaGroup')) { calls.push({ url, options }); return Response.json({ ok: true }); }
    return base(url, options);
  };
  const result = await processNewSolicitud({ ...env, CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_TOKEN: 'cf-token' }, record, 'https://site.example', fetcher);
  assert.equal(result.design, 'listo');
  const images = calls.filter(c => c.url.includes('cloudflare'));
  assert.equal(images.length, 3);
  assert.match(images[0].url, /accounts\/acc\/ai\/run\/@cf\/black-forest-labs\/flux-2-klein-4b$/);
  assert.equal(images[0].options.headers.Authorization, 'Bearer cf-token');
  assert.ok(images[0].options.body instanceof FormData);
  assert.equal(images[0].options.body.get('width'), '1024');
  assert.match(images[0].options.body.get('prompt'), /^minimal ice cream cone mark\. Professional minimalist logo mark/);
  assert.ok(calls.some(c => c.url.endsWith(`/storage/v1/object/disenos/${ROW_ID}/r1-1.jpg`)));
  const media = calls.find(c => c.url.includes('sendMediaGroup')).options.body;
  assert.equal(JSON.parse(media.get('media')).length, 3);
  const saved = calls.filter(c => c.options.method === 'PATCH').map(c => JSON.parse(c.options.body)).find(b => b.diseno?.estado === 'listo');
  assert.equal(saved.diseno.con_imagenes, true);
  assert.equal(saved.diseno.conceptos[0].imagen, `${ROW_ID}/r1-1.jpg`);
});

test('non-design services are not passed to Camilo', async () => {
  const { calls, fetcher } = network();
  const web = buildRecord({ id: 'b'.repeat(64), serviceKey: 'wordpress', tierIndex: 0, values: { name: 'Ana', email: 'ana@example.com', brand: 'Web Ana', scope: 'Landing' }, files: [] });
  const result = await processNewSolicitud(env, web, 'https://site.example', fetcher);
  assert.equal(result.design, null);
  assert.equal(calls.filter(c => c.url.includes('anthropic')).length, 1);
});

test('agent API regenerates design concepts with feedback and signs image URLs', async () => {
  const { calls, fetcher: base } = network();
  const fetcher = async (url, options = {}) => {
    if (url.includes('/storage/v1/object/sign/disenos')) { calls.push({ url, options }); return Response.json([{ path: `${ROW_ID}/r1-1.jpg`, signedURL: `/object/sign/disenos/${ROW_ID}/r1-1.jpg?token=t` }]); }
    if (url.includes('/rest/v1/solicitudes?id=eq.') && options.method !== 'PATCH') return Response.json([{ ...record, id: ROW_ID, diseno: { estado: 'listo', ronda: 1, conceptos: [{ titulo: 'A', imagen: `${ROW_ID}/r1-1.jpg` }, { titulo: 'B', imagen: '../otro/secreto.jpg' }] } }]);
    return base(url, options);
  };
  const regen = await handleAgent(agentRequest({ action: 'disenar', id: ROW_ID, feedback: 'Más minimalista' }), { env, fetcher });
  assert.equal(regen.status, 200);
  const body = (await regen.json()).solicitud;
  assert.equal(body.diseno.ronda, 2);
  const prompt = calls.map(c => c.url.includes('anthropic') && JSON.parse(c.options.body)).find(b => b && b.tools?.[0]?.name === 'registrar_conceptos');
  assert.match(prompt.messages[0].content, /Más minimalista/);
  const signed = await handleAgent(agentRequest({ action: 'imagenes', id: ROW_ID }), { env, fetcher });
  const { urls } = await signed.json();
  assert.equal(urls[`${ROW_ID}/r1-1.jpg`], `https://db.example.co/storage/v1/object/sign/disenos/${ROW_ID}/r1-1.jpg?token=t`);
  const signCall = calls.find(c => c.url.includes('/object/sign/'));
  assert.deepEqual(JSON.parse(signCall.options.body).paths, [`${ROW_ID}/r1-1.jpg`]);
});

test('chat with Camilo uses his persona', async () => {
  const { calls, fetcher } = network();
  const response = await handleAgent(agentRequest({ action: 'chat', agent: 'diseno', message: '¿Qué dirección recomiendas?' }), { env, fetcher });
  assert.equal(response.status, 200);
  const body = JSON.parse(calls.find(c => c.url.includes('anthropic')).options.body);
  assert.match(body.system, /^Eres Camilo/);
});

test('Groq falls back to JSON mode when the tool call is rejected', async () => {
  const bodies = [];
  const fetcher = async (url, options = {}) => {
    if (url.includes('api.groq.com')) {
      const body = JSON.parse(options.body); bodies.push(body);
      if (body.tools) return Response.json({ error: { code: 'tool_use_failed' } }, { status: 400 });
      return Response.json({ choices: [{ message: { content: JSON.stringify(analysis) } }] });
    }
    throw new Error(`unexpected ${url}`);
  };
  const { analyzeSolicitud } = await import('../api/_solicitudes.mjs');
  const ai = await analyzeSolicitud({ GROQ_API_KEY: 'gsk_test' }, { ...record, id: ROW_ID }, fetcher);
  assert.equal(ai.resumen, analysis.resumen);
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[1].response_format, { type: 'json_object' });
});

test('Cloudflare account id is extracted from a pasted dashboard URL', async () => {
  const { cloudflareAccount } = await import('../api/_diseno.mjs');
  assert.equal(cloudflareAccount({ CLOUDFLARE_ACCOUNT_ID: 'https://dash.cloudflare.com/0123456789abcdef0123456789abcdef/home' }), '0123456789abcdef0123456789abcdef');
  assert.equal(cloudflareAccount({ CLOUDFLARE_ACCOUNT_ID: ' 0123456789abcdef0123456789abcdef ' }), '0123456789abcdef0123456789abcdef');
});

test('image generation falls back to FLUX.1 schnell when FLUX.2 fails', async () => {
  const { generateImage } = await import('../api/_diseno.mjs');
  const urls = [];
  const fetcher = async (url, options) => {
    urls.push(url);
    if (url.includes('flux-2')) return Response.json({ errors: [{ code: 5007, message: 'No such model' }] }, { status: 400 });
    assert.equal(JSON.parse(options.body).steps, 8);
    return Response.json({ result: { image: Buffer.from([1, 2, 3]).toString('base64') } });
  };
  const bytes = await generateImage({ CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_TOKEN: 't' }, 'gear', fetcher);
  assert.deepEqual([...bytes], [1, 2, 3]);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /flux-1-schnell$/);
});

test('a new round requested from the admin is announced on Telegram', async () => {
  const { calls, fetcher: base } = network();
  const fetcher = async (url, options = {}) => {
    if (url.includes('/rest/v1/solicitudes?id=eq.') && options.method !== 'PATCH') return Response.json([{ ...record, id: ROW_ID, diseno: { estado: 'listo', ronda: 2 } }]);
    return base(url, options);
  };
  const response = await handleAgent(agentRequest({ action: 'disenar', id: ROW_ID, feedback: 'Más elegante' }), { env, fetcher });
  assert.equal(response.status, 200);
  const text = JSON.parse(calls.find(c => c.url.includes('sendMessage')).options.body).text;
  assert.match(text, /ronda 3/);
  assert.match(text, /Tus comentarios: Más elegante/);
  assert.match(text, new RegExp(`https://site.example/admin.html#solicitud-${ROW_ID}`));
});
