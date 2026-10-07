import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBrief } from '../api/brief.mjs';

const env = { TELEGRAM_BOT_TOKEN: 'test-bot-token', TELEGRAM_CHAT_ID: 'test-chat', RESEND_API_KEY: 'test-email-key', BRIEF_EMAIL_FROM: 'Studio <studio@example.com>', BRIEF_EMAIL_TO: 'owner@example.com', BRIEF_PAYMENT_URL: 'https://pay.example.com/plan' };
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
let sequence = 0;
function input(overrides = {}) {
  return { service: 'logo', tier: 1, values: { name: 'Cliente', email: 'client@example.com', brand: `Brand ${++sequence}`, business: 'Helados', audience: 'Familias', goals: 'Logo legible', existing: 'Nueva marca', style: 'Simple', uses: 'Envases' }, ...overrides };
}
function request(data, files = [], extra = {}) {
  const body = new FormData(); body.set('brief', JSON.stringify(data));
  for (const file of files) body.append('files', new Blob([file.bytes], { type: file.type }), file.name);
  if (extra.website) body.set('website', extra.website);
  return new Request('https://site.example/api/brief', { method: 'POST', body, headers: extra.headers });
}
function client(fail = '') {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (fail === 'all' || (fail === 'email' && url.includes('resend')) || (fail === 'telegram' && url.includes('telegram'))) return Response.json({ error: 'test failure' }, { status: 500 });
    return Response.json(url.includes('telegram') ? { ok: true } : { id: 'email-id' });
  };
  return { calls, fetcher };
}
async function run(data, files = [], options = {}, extra = {}) {
  const network = client(options.fail);
  const response = await handleBrief(request(data, files, extra), { env, ip: `test-${++sequence}`, fetcher: network.fetcher, ...options });
  return { response, body: await response.json(), ...network };
}

test('delivers a full brief and exact reference bytes to both fixed recipients', async () => {
  const data = input(); data.price = 1; data.to = 'attacker@example.com';
  const { response, body, calls } = await run(data, [{ name: 'reference.png', bytes: png, type: 'image/png' }]);
  assert.equal(response.status, 200); assert.equal(body.complete, true); assert.equal(body.paymentUrl, env.BRIEF_PAYMENT_URL);
  assert.equal(calls.length, 2);
  const telegram = calls.find(c => c.url.includes('telegram'));
  assert.match(telegram.url, /sendMediaGroup$/); assert.equal(telegram.options.body.get('chat_id'), env.TELEGRAM_CHAT_ID);
  assert.match(await telegram.options.body.get('file0').text(), /\$100 USD/);
  assert.deepEqual(Buffer.from(await telegram.options.body.get('file1').arrayBuffer()), png);
  const email = JSON.parse(calls.find(c => c.url.includes('resend')).options.body);
  assert.deepEqual(email.to, [env.BRIEF_EMAIL_TO]); assert.equal(email.reply_to, data.values.email);
  assert.match(email.text, /Logo Estándar/); assert.deepEqual(Buffer.from(email.attachments[0].content, 'base64'), png);
});

test('sends briefs without optional attachments as a Telegram document', async () => {
  const { body, calls } = await run(input()); assert.equal(body.complete, true);
  assert.match(calls.find(c => c.url.includes('telegram')).url, /sendDocument$/);
});

test('rejects missing configuration without calling either provider', async () => {
  const { response, calls } = await run(input(), [], { env: {} }); assert.equal(response.status, 503); assert.equal(calls.length, 0);
});

test('validates required fields and rejects unknown plans', async () => {
  const data = input(); data.values.uses = ' ';
  const first = await run(data); assert.equal(first.response.status, 400); assert.equal(first.calls.length, 0);
  const second = await run(input({ service: '__proto__' })); assert.equal(second.response.status, 400);
  const third = await run(input({ tier: 9 })); assert.equal(third.response.status, 400);
});

test('validates non-logo scope instead of logo-only fields', async () => {
  const data = input({ service: 'wordpress', tier: 0 }); delete data.values.uses; delete data.values.style; delete data.values.existing;
  const bad = await run(data); assert.equal(bad.response.status, 400);
  data.values.scope = 'Landing con formulario'; const good = await run(data); assert.equal(good.body.complete, true);
});

test('rejects forged attachment types, oversized files and excessive counts', async () => {
  const forged = await run(input(), [{ name: 'reference.png', bytes: Buffer.from('<script>test</script>'), type: 'image/png' }]); assert.equal(forged.response.status, 400);
  const large = await run(input(), [{ name: 'large.png', bytes: Buffer.alloc(3 * 1024 * 1024 + 1), type: 'image/png' }]); assert.equal(large.response.status, 413);
  const many = await run(input(), Array.from({ length: 6 }, (_, i) => ({ name: `${i}.png`, bytes: png, type: 'image/png' }))); assert.equal(many.response.status, 413);
});

test('rejects cross-origin requests, bots and email header injection', async () => {
  const cross = await run(input(), [], {}, { headers: { origin: 'https://other.example' } }); assert.equal(cross.response.status, 403);
  const bot = await run(input(), [], {}, { website: 'spam' }); assert.equal(bot.response.status, 400);
  const data = input(); data.values.brand = 'Brand\r\nBcc: attacker@example.com'; const header = await run(data); assert.equal(header.response.status, 400);
});

test('reports partial delivery honestly and retries only the missing channel on the same instance', async () => {
  const data = input(); const first = await run(data, [], { fail: 'email' });
  assert.equal(first.body.accepted, true); assert.equal(first.body.complete, false); assert.equal(first.body.paymentUrl, null);
  const retry = await run(data); assert.equal(retry.body.complete, true); assert.equal(retry.calls.length, 1); assert.match(retry.calls[0].url, /resend/);
  const duplicate = await run(data); assert.equal(duplicate.body.complete, true); assert.equal(duplicate.calls.length, 0);
});

test('does not report success or expose credentials when providers fail', async () => {
  const { response, body } = await run(input(), [], { fail: 'all' }); assert.equal(response.status, 502); assert.equal(body.error, 'delivery'); assert.equal(body.accepted, undefined);
  assert.ok(!JSON.stringify(body).includes(env.TELEGRAM_BOT_TOKEN));
});

test('never returns an unsafe payment URL', async () => {
  const { body } = await run(input(), [], { env: { ...env, BRIEF_PAYMENT_URL: 'javascript:alert(1)' } }); assert.equal(body.paymentUrl, null);
});

test('limits repeated submissions per function instance', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await run(input(), [], { ip: 'limited-ip' })).response.status, 200);
  const sixth = await run(input(), [], { ip: 'limited-ip' }); assert.equal(sixth.response.status, 429); assert.equal(sixth.calls.length, 0);
});

test('Vercel fetch adapter serves the production route with server-only environment', async () => {
  const { default: adapter } = await import('../api/brief.mjs');
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const network = client();
  try {
    Object.assign(process.env, env); globalThis.fetch = network.fetcher;
    const response = await adapter.fetch(request(input(), [], { headers: { 'x-vercel-forwarded-for': '192.0.2.1' } }));
    assert.equal(response.status, 200); assert.equal((await response.json()).complete, true); assert.equal(network.calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
