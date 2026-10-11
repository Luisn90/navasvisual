import test from 'node:test';
import assert from 'node:assert/strict';
import { handleOgImage } from '../api/og-image.mjs';

const env = { SUPABASE_URL: 'https://db.example.co' };
const req = (method = 'GET') => new Request('https://site.example/api/og-image', { method });

test('serves the image uploaded from the office', async () => {
  let asked;
  const fetcher = async url => { asked = url; return new Response(new Uint8Array([255, 216, 255]), { headers: { 'content-type': 'image/jpeg' } }); };
  const res = await handleOgImage(req(), { env, fetcher });
  assert.equal(asked, 'https://db.example.co/storage/v1/object/public/web/og/compartir.jpg');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/jpeg');
  assert.match(res.headers.get('cache-control'), /s-maxage=300/);
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [255, 216, 255]);
  const head = await handleOgImage(req('HEAD'), { env, fetcher });
  assert.equal(head.status, 200);
});

test('falls back to the default image when none was uploaded or storage fails', async () => {
  for (const fetcher of [async () => new Response('{}', { status: 400, headers: { 'content-type': 'application/json' } }), async () => { throw new Error('down'); }]) {
    const res = await handleOgImage(req(), { env, fetcher });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), 'https://site.example/assets/Candy%20conos%20brand.jpg');
  }
  const noEnv = await handleOgImage(req(), { env: {}, fetcher: async () => { throw new Error('no'); } });
  assert.equal(noEnv.status, 302);
  assert.equal((await handleOgImage(req('POST'), { env })).status, 405);
});
