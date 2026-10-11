// El cliente sube el comprobante de su pago. Le llega un correo de «estamos verificando tu pago»
// y Luis recibe el comprobante por Telegram para confirmarlo desde la oficina.
import { supabaseReady, getSolicitudByRequest, updateSolicitud } from './_solicitudes.mjs';
import { METODOS, PAY_TYPES, MAX_PROOF, isProofFile, uploadProof, sendEmail, emailReady, paymentEmail, telegramProof, maskEmail } from './_pagos.mjs';

const MAX_BODY = 4 * 1024 * 1024;
const attempts = new Map();
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new Error('large'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function handlePago(request, { env = process.env, fetcher = fetch, ip = 'unknown', now = Date.now(), wait = sleep } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json(415, { error: 'format' });
  if (!supabaseReady(env)) return json(503, { error: 'unavailable' });
  if (Number(request.headers.get('content-length')) > MAX_BODY) return json(413, { error: 'size' });
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  let limit = attempts.get(ip);
  if (!limit) { if (attempts.size > 10000) attempts.clear(); limit = { count: 0, until: now + 600000 }; attempts.set(ip, limit); }
  if (++limit.count > 6) return json(429, { error: 'rate' });

  let form;
  try {
    const bytes = await boundedBody(request);
    form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') }, body: bytes }).formData();
  } catch (error) { return json(error.message === 'large' ? 413 : 400, { error: 'format' }); }
  if (form.get('website')) return json(400, { error: 'invalid' });

  const key = String(form.get('key') || '');
  const metodo = String(form.get('metodo') || '');
  const referencia = String(form.get('referencia') || '').trim();
  const lang = form.get('lang') === 'en' ? 'en' : 'es';
  if (!/^[0-9a-f]{64}$/.test(key)) return json(400, { error: 'invalid' });
  if (!Object.hasOwn(METODOS, metodo) || referencia.length > 80 || /[\r\n]/.test(referencia)) return json(400, { error: 'invalid' });
  const upload = form.get('comprobante');
  if (!upload || typeof upload === 'string' || !upload.size) return json(400, { error: 'file' });
  if (upload.size > MAX_PROOF || !PAY_TYPES[upload.type]) return json(413, { error: 'file' });
  const bytes = Buffer.from(await upload.arrayBuffer());
  if (!isProofFile(bytes, upload.type)) return json(400, { error: 'file' });

  // La solicitud se guarda unos segundos después de enviar el brief; si el cliente es muy rápido, espera.
  let row = null;
  for (let i = 0; i < 6 && !row; i++) {
    try { row = await getSolicitudByRequest(env, key, fetcher); } catch { row = null; }
    if (!row && i < 5) await wait(1500);
  }
  if (!row) return json(404, { error: 'not_found' });
  if (row.pago?.estado === 'confirmado') return json(409, { error: 'confirmed' });

  const ext = PAY_TYPES[upload.type];
  const path = `${row.id}/${now}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const file = { name: `comprobante-${String(row.request_id).slice(0, 12)}.${ext}`, type: upload.type, bytes };
  try { await uploadProof(env, path, bytes, upload.type, fetcher); }
  catch (error) { console.error('Pago: no se pudo guardar el comprobante', error.message); return json(502, { error: 'storage' }); }

  const at = new Date(now).toISOString();
  const pago = {
    estado: 'verificando', metodo, referencia, lang, enviado_at: at,
    archivo: { path, name: file.name, type: upload.type, size: upload.size },
    intentos: (row.pago?.intentos || 0) + 1
  };
  try { await updateSolicitud(env, row.id, { pago }, fetcher); }
  catch (error) { console.error('Pago: no se pudo registrar', error.message); return json(502, { error: 'storage' }); }

  const link = `${new URL(request.url).origin}/admin.html#solicitud-${row.id}`;
  const [mail, telegram] = await Promise.allSettled([
    emailReady(env) && row.email
      ? sendEmail(env, { to: row.email, ...paymentEmail('verificando', row, pago), attachments: [file], key: `pago-verificando-${row.id}-${now}` }, fetcher)
      : Promise.reject(new Error('email_config')),
    telegramProof(env, row, pago, file, link, fetcher)
  ]);
  const emailed = mail.status === 'fulfilled';
  if (!emailed) console.error('Pago: correo de verificación falló', mail.reason?.message);
  if (telegram.status !== 'fulfilled') console.error('Pago: aviso de Telegram falló', telegram.reason?.message);
  if (emailed) await updateSolicitud(env, row.id, { pago: { ...pago, correo_verificando: true } }, fetcher).catch(() => {});
  return json(200, { ok: true, estado: 'verificando', emailed, email: emailed ? maskEmail(row.email) : null });
}

export default {
  fetch(request) {
    const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 100);
    return handlePago(request, { ip });
  }
};
