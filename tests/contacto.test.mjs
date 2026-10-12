import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContacto, cleanContacto, contactoEmails } from '../api/contacto.mjs';

const env = { RESEND_API_KEY: 're_test', BRIEF_EMAIL_FROM: 'Navas Visual <hola@navasvisual.com>', BRIEF_EMAIL_TO: 'luis@example.com', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: 'chat' };
const OK = { name: 'Ana Pérez', email: 'ana@example.com', company: 'Café Luna', service: 'Diseño gráfico', message: 'Necesito un logo y tarjetas.', lang: 'es' };

function fakeFetch({ failLuis = false } = {}) {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    url = String(url); calls.push({ url, options });
    if (url.includes('api.resend.com')) {
      const to = JSON.parse(options.body).to[0];
      return failLuis && to === 'luis@example.com' ? Response.json({}, { status: 500 }) : Response.json({ id: 'e1' });
    }
    if (url.includes('api.telegram.org')) return Response.json({ ok: true });
    return Response.json({}, { status: 404 });
  };
  return { fetcher, calls };
}
const req = (body, headers = {}) => new Request('https://navasvisual.com/api/contacto', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } });

test('valida los campos', () => {
  assert.equal(cleanContacto({ ...OK, email: 'mal' }).error, 'email');
  assert.equal(cleanContacto({ ...OK, name: ' ' }).error, 'name');
  assert.equal(cleanContacto({ ...OK, message: 'hi' }).error, 'message');
  assert.equal(cleanContacto({ ...OK, name: 'Ana\nBcc: x' }).data.name, 'Ana Bcc: x');
});

test('envía el mensaje a Luis (respondiendo al cliente), confirma al cliente y avisa por Telegram', async () => {
  const { fetcher, calls } = fakeFetch();
  const res = await handleContacto(req(OK), { env, fetcher, ip: 'a' });
  assert.equal(res.status, 200);
  const mails = calls.filter(c => c.url.includes('resend')).map(c => JSON.parse(c.options.body));
  const toLuis = mails.find(m => m.to[0] === 'luis@example.com');
  assert.equal(toLuis.reply_to, 'ana@example.com');
  assert.match(toLuis.subject, /Ana Pérez/);
  assert.ok(mails.find(m => m.to[0] === 'ana@example.com'));
  assert.ok(calls.some(c => c.url.includes('telegram')));
});

test('si el correo a Luis falla, el cliente ve el error', async () => {
  const { fetcher } = fakeFetch({ failLuis: true });
  assert.equal((await handleContacto(req(OK), { env, fetcher, ip: 'b' })).status, 502);
});

test('ignora bots, otros orígenes y abusos', async () => {
  let { fetcher, calls } = fakeFetch();
  assert.equal((await handleContacto(req({ ...OK, website: 'spam' }), { env, fetcher, ip: 'c' })).status, 200);
  assert.equal(calls.length, 0);
  assert.equal((await handleContacto(req(OK, { origin: 'https://evil.example' }), { env, fetcher, ip: 'c' })).status, 403);
  for (let i = 0; i < 5; i++) await handleContacto(req(OK), { env, fetcher, ip: 'd' });
  assert.equal((await handleContacto(req(OK), { env, fetcher, ip: 'd' })).status, 429);
  assert.equal((await handleContacto(req(OK), { env: {}, fetcher, ip: 'e' })).status, 503);
});

test('el correo escapa el contenido y lleva la firma', () => {
  const { cliente, luis } = contactoEmails(cleanContacto({ ...OK, message: '<script>x</script> hola' }).data);
  assert.doesNotMatch(luis.html, /<script>/);
  assert.match(cliente.html, /Fundador y diseñador/);
  const en = contactoEmails(cleanContacto({ ...OK, lang: 'en' }).data);
  assert.match(en.cliente.subject, /I got your message/);
});
