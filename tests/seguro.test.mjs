import test from 'node:test';
import assert from 'node:assert/strict';
import { envolverFetch, nodeParcheado } from '../api/_seguro.mjs';

const respuesta = (encoding, body = 'hola') => new Response(body, { headers: encoding ? { 'content-encoding': encoding } : {} });

test('pide las respuestas sin Brotli', async () => {
  let enviado;
  const f = envolverFetch(async (url, init) => { enviado = init.headers.get('accept-encoding'); return respuesta(''); });
  await f('https://example.com', { headers: { Authorization: 'x' } });
  assert.equal(enviado, 'gzip, deflate');
});

test('bloquea una respuesta Brotli sin leerla y deja pasar las normales', async () => {
  let cancelado = false;
  const br = new Response(new ReadableStream({ cancel() { cancelado = true; } }), { headers: { 'content-encoding': 'br' } });
  await assert.rejects(envolverFetch(async () => br)('https://bcv.example'), /Brotli bloqueada/);
  assert.ok(cancelado, 'el cuerpo se descarta sin descomprimir');
  await assert.rejects(envolverFetch(async () => respuesta('gzip, br'))('https://x.example'), /Brotli/);
  assert.equal(await (await envolverFetch(async () => respuesta('gzip'))('https://x.example')).text(), 'hola');
  const head = await envolverFetch(async () => respuesta('br', null))('https://x.example', { method: 'HEAD' });
  assert.equal(head.status, 200, 'un HEAD no tiene cuerpo que descomprimir');
});

test('se instala una sola vez y conserva los datos de la petición', async () => {
  let recibido;
  const base = async (input, init) => { recibido = { input, init }; return respuesta(''); };
  const f = envolverFetch(base);
  assert.equal(envolverFetch(f), f);
  const form = new FormData(); form.set('a', '1');
  await f('https://api.telegram.org/x', { method: 'POST', body: form });
  assert.equal(recibido.init.method, 'POST');
  assert.equal(recibido.init.body, form);
  assert.equal(recibido.init.headers.get('content-type'), null, 'el navegador/undici pone el boundary del FormData');
});

test('reconoce las versiones de Node.js parcheadas', () => {
  assert.equal(nodeParcheado('v24.22.0'), false);
  assert.equal(nodeParcheado('v24.22.1'), true);
  assert.equal(nodeParcheado('v24.23.0'), true);
  assert.equal(nodeParcheado('v22.23.3'), false);
  assert.equal(nodeParcheado('v22.23.4'), true);
  assert.equal(nodeParcheado('v26.12.1'), true);
  assert.equal(nodeParcheado('v20.19.0'), false);
});
