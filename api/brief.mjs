import { createHash } from 'node:crypto';

const MAX_BODY = 4 * 1024 * 1024;
const MAX_FILES = 3 * 1024 * 1024;
const MAX_FILE = MAX_FILES;
const services = {
  logo: { name: 'Logo', prices: [50, 100, 160], required: ['existing', 'style', 'uses'] },
  identidad: { name: 'Identidad', prices: [200, 350, 600], required: ['existing', 'style', 'uses'] },
  wordpress: { name: 'WordPress', prices: [250, 500, 850], required: ['scope'] },
  vibecode: { name: 'Vibecode', prices: [300, 700, 1400], required: ['scope'] },
  redes: { name: 'Redes', prices: [60, 110, 180], required: ['scope'] }
};
const labels = {
  name: 'Nombre', email: 'Correo', brand: 'Marca', business: 'Actividad', audience: 'Público',
  existing: 'Marca nueva o rediseño', goals: 'Objetivo', style: 'Estilo', colors: 'Colores',
  uses: 'Usos del logo', slogan: 'Eslogan', scope: 'Alcance', platform: 'Web o redes actuales',
  deadline: 'Fecha deseada', links: 'Enlaces de referencia', notes: 'Notas de referencias', reference: 'Proyecto de referencia'
};
// Best-effort safeguards per running function instance. Vercel Firewall rules can add global limits.
const attempts = new Map();
const completed = new Map();
function json(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
function paymentUrl(env) {
  if (!env.BRIEF_PAYMENT_URL) return null;
  try { const url = new URL(env.BRIEF_PAYMENT_URL); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
function isFile(bytes, type) {
  if (type === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return type === 'image/webp' && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
}
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
async function deliverTelegram(env, summary, files, caption, fetcher) {
  const attachments = [{ name: 'brief.txt', type: 'text/plain', bytes: Buffer.from(summary) }, ...files];
  const body = new FormData(); body.set('chat_id', env.TELEGRAM_CHAT_ID);
  let method;
  if (attachments.length === 1) {
    method = 'sendDocument'; body.set('caption', caption);
    body.set('document', new Blob([attachments[0].bytes], { type: 'text/plain' }), 'brief.txt');
  } else {
    method = 'sendMediaGroup';
    body.set('media', JSON.stringify(attachments.map((f, i) => ({ type: 'document', media: `attach://file${i}`, ...(i === 0 ? { caption } : {}) }))));
    attachments.forEach((f, i) => body.set(`file${i}`, new Blob([f.bytes], { type: f.type }), f.name));
  }
  const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', body, signal: AbortSignal.timeout(18000) });
  if (!response.ok || !(await response.json()).ok) throw new Error('telegram_delivery');
}
async function deliverEmail(env, summary, files, subject, replyTo, id, fetcher) {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `brief-${id}` },
    body: JSON.stringify({ from: env.BRIEF_EMAIL_FROM, to: [env.BRIEF_EMAIL_TO], reply_to: replyTo, subject, text: summary,
      attachments: files.map(f => ({ filename: f.name, content: f.bytes.toString('base64'), content_type: f.type })) }),
    signal: AbortSignal.timeout(18000)
  });
  if (!response.ok || !(await response.json()).id) throw new Error('email_delivery');
}

export async function handleBrief(request, { env = process.env, fetcher = fetch, ip = 'unknown', now = Date.now() } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json(415, { error: 'format' });
  const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'BRIEF_EMAIL_FROM', 'BRIEF_EMAIL_TO'];
  if (requiredEnv.some(key => !env[key]?.trim())) return json(503, { error: 'unavailable' });
  if (Number(request.headers.get('content-length')) > MAX_BODY) return json(413, { error: 'size' });
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  for (const [key, value] of completed) if (value.until <= now) completed.delete(key);
  let limit = attempts.get(ip);
  if (!limit) { if (attempts.size > 10000) attempts.clear(); limit = { count: 0, until: now + 600000 }; attempts.set(ip, limit); }
  if (++limit.count > 5) return json(429, { error: 'rate' });
  let form;
  try {
    const bytes = await boundedBody(request);
    form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') }, body: bytes }).formData();
  } catch (error) { return json(error.message === 'large' ? 413 : 400, { error: 'format' }); }
  if (form.get('website')) return json(400, { error: 'invalid' });
  let input;
  try { input = JSON.parse(form.get('brief')); } catch { return json(400, { error: 'invalid' }); }
  if (!input || typeof input !== 'object' || !input.values || typeof input.values !== 'object') return json(400, { error: 'invalid' });
  const service = Object.hasOwn(services, input.service) ? services[input.service] : null;
  if (!service || !Number.isInteger(input.tier) || input.tier < 0 || input.tier > 2) return json(400, { error: 'plan' });
  const values = {};
  for (const key of Object.keys(labels)) {
    const value = input.values[key] ?? '';
    const max = ['name', 'email', 'brand', 'slogan', 'platform', 'deadline', 'reference'].includes(key) ? 200 : 2000;
    if (typeof value !== 'string' || value.length > max) return json(400, { error: 'invalid' });
    values[key] = value.trim();
  }
  if (['name', 'email', 'brand', 'business', 'audience', 'goals', ...service.required].some(key => !values[key]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || /[\r\n]/.test(values.name + values.email + values.brand)) return json(400, { error: 'required' });
  const uploads = form.getAll('files');
  if (uploads.length > 5) return json(413, { error: 'files' });
  const files = []; let total = 0;
  for (const [index, file] of uploads.entries()) {
    if (typeof file === 'string' || !file.size || file.size > MAX_FILE) return json(413, { error: 'files' });
    total += file.size; if (total > MAX_FILES) return json(413, { error: 'files' });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isFile(bytes, file.type)) return json(400, { error: 'files' });
    const safe = file.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(-140) || 'reference';
    files.push({ name: `${index + 1}-${safe}`, type: file.type, bytes });
  }
  const hash = createHash('sha256').update(JSON.stringify({ service: input.service, tier: input.tier, values }));
  for (const file of files) hash.update(file.name).update(file.bytes);
  const id = hash.digest('hex');
  const price = service.prices[input.tier], tier = ['Básico', 'Estándar', 'Premium'][input.tier];
  const title = `${service.name} ${tier}`;
  const summary = [`Solicitud ${id.slice(0, 12)}`, `Plan: ${title}`, `Precio publicado: $${price} USD`, 'Solicitud de proyecto. No es una confirmación de pago.',
    ...Object.entries(values).filter(([, value]) => value).map(([key, value]) => `${labels[key]}: ${value}`),
    `Referencias adjuntas: ${files.map(f => f.name).join(', ') || 'Ninguna'}`].join('\n\n');
  const prior = completed.get(id);
  if (prior?.telegram && prior?.email) return json(200, { accepted: true, complete: true, requestId: id.slice(0, 12), paymentUrl: paymentUrl(env) });
  const caption = `Nuevo brief ${id.slice(0, 12)}\n${title} · $${price}\n${values.name} · ${values.brand}\n${values.email}`;
  const results = await Promise.allSettled([
    prior?.telegram ? Promise.resolve() : deliverTelegram(env, summary, files, caption, fetcher),
    prior?.email ? Promise.resolve() : deliverEmail(env, summary, files, `Nuevo brief: ${title} — ${values.brand}`, values.email, id, fetcher)
  ]);
  const telegram = results[0].status === 'fulfilled', email = results[1].status === 'fulfilled';
  if (!telegram) console.error('Brief notification: Telegram delivery failed');
  if (!email) console.error('Brief notification: email delivery failed');
  if (telegram || email) {
    if (completed.size > 1000) completed.clear();
    completed.set(id, { telegram, email, until: now + 3600000 });
    return json(200, { accepted: true, complete: telegram && email, requestId: id.slice(0, 12), paymentUrl: telegram && email ? paymentUrl(env) : null });
  }
  return json(502, { error: 'delivery' });
}

// Vercel's Node runtime supports Web-standard fetch handlers.
export default {
  fetch(request) {
    const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 100);
    return handleBrief(request, { ip });
  }
};
