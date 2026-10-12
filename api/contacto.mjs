// Formulario de la página de Contacto: el mensaje le llega a Luis por correo (para responder
// directamente al cliente) y por Telegram, y el cliente recibe una confirmación.
import { sendTelegram } from './_solicitudes.mjs';
import { sendEmail, emailReady, escapeHtml, brandHeader, EMAIL_FONT, EMAIL_HEAD } from './_pagos.mjs';
import { firmaHtml, FIRMA } from './_presupuestos.mjs';

const attempts = new Map();
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const line = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const block = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

export function cleanContacto(input = {}) {
  const data = {
    name: line(input.name, 120), email: line(input.email, 160).toLowerCase(), company: line(input.company, 120),
    service: line(input.service, 80), message: block(input.message, 4000), lang: input.lang === 'en' ? 'en' : 'es'
  };
  if (!data.name) return { error: 'name' };
  if (!EMAIL.test(data.email)) return { error: 'email' };
  if (data.message.length < 5) return { error: 'message' };
  return { data };
}

const COPY = {
  es: { tagline: 'Diseño visual digital', subject: 'Recibí tu mensaje · Navas Visual', title: 'Recibí tu mensaje', intro: n => `Hola ${n}, gracias por escribirme. Lo leo y te respondo lo antes posible a este mismo correo.`, yours: 'Tu mensaje' },
  en: { tagline: 'Digital visual design', subject: 'I got your message · Navas Visual', title: 'I got your message', intro: n => `Hi ${n}, thanks for reaching out. I'll read it and reply as soon as possible to this same email.`, yours: 'Your message' }
};

export function contactoEmails(d) {
  const t = COPY[d.lang];
  const first = d.name.split(' ')[0];
  const shell = (inner, lang) => `<!doctype html><html lang="${lang}">${EMAIL_HEAD}
<body style="margin:0;background:#f2f1ee;font-family:${EMAIL_FONT};color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
${brandHeader(COPY[lang].tagline)}${inner}
</table></td></tr></table></body></html>`;
  const quote = `<div style="margin-top:18px;padding:16px 18px;border:1px solid #e7e5e0;border-radius:14px;font-size:14px;line-height:1.55;color:#333;white-space:pre-line">${escapeHtml(d.message)}</div>`;
  const cliente = {
    subject: t.subject,
    html: shell(`<tr><td style="padding:24px 32px 0"><h1 style="margin:0 0 10px;font-size:26px;line-height:1.15;letter-spacing:-.02em">${escapeHtml(t.title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#333">${escapeHtml(t.intro(first))}</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(t.yours)}</p>${quote}</td></tr>
<tr><td style="padding:26px 32px 30px"><div style="border-top:1px solid #efede9;padding-top:20px">${firmaHtml(d.lang)}</div></td></tr>`, d.lang),
    text: [t.title, '', t.intro(first), '', `${t.yours}:`, d.message, '', `${FIRMA.nombre} · ${FIRMA.cargo[d.lang]} · Navas Visual`, FIRMA.web].join('\n')
  };
  const rows = [['Nombre', d.name], ['Correo', d.email], d.company && ['Empresa', d.company], d.service && ['Servicio', d.service], ['Idioma', d.lang === 'en' ? 'Inglés' : 'Español']].filter(Boolean);
  const luis = {
    subject: `Nuevo mensaje de ${d.name}${d.service ? ` · ${d.service}` : ''}`,
    html: shell(`<tr><td style="padding:24px 32px 30px"><h1 style="margin:0 0 6px;font-size:22px;letter-spacing:-.02em">Nuevo mensaje desde Contacto</h1>
<p style="margin:0 0 16px;font-size:13px;color:#777">Responde a este correo y le llega directamente a ${escapeHtml(d.email)}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e0;border-radius:14px;border-collapse:separate">
${rows.map(([l, v], i) => `<tr><td style="padding:10px 16px;font-size:13px;color:#777;${i ? 'border-top:1px solid #efede9;' : ''}">${l}</td><td style="padding:10px 16px;font-size:14px;text-align:right;${i ? 'border-top:1px solid #efede9;' : ''}">${escapeHtml(v)}</td></tr>`).join('')}
</table>${quote}</td></tr>`, 'es'),
    text: [...rows.map(([l, v]) => `${l}: ${v}`), '', d.message].join('\n')
  };
  return { cliente, luis };
}

export async function handleContacto(request, { env = process.env, fetcher = fetch, ip = 'unknown', now = Date.now() } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  if (!emailReady(env) || !env.BRIEF_EMAIL_TO) return json(503, { error: 'unavailable' });
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  let limit = attempts.get(ip);
  if (!limit) { if (attempts.size > 10000) attempts.clear(); limit = { count: 0, until: now + 600000 }; attempts.set(ip, limit); }
  if (++limit.count > 5) return json(429, { error: 'rate' });

  let body;
  try {
    const text = await request.text();
    if (text.length > 16384) return json(413, { error: 'size' });
    body = JSON.parse(text);
  } catch { return json(400, { error: 'invalid' }); }
  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  if (body?.website) return json(200, { ok: true });
  const { data, error } = cleanContacto(body);
  if (error) return json(400, { error });

  const { cliente, luis } = contactoEmails(data);
  try {
    await sendEmail(env, { to: env.BRIEF_EMAIL_TO, ...luis, replyTo: data.email, key: `contacto-${now}-${Math.random().toString(36).slice(2, 8)}` }, fetcher);
  } catch (e) {
    console.error('Contacto: no se pudo enviar el correo a Luis', e.message);
    return json(502, { error: 'email' });
  }
  await Promise.allSettled([
    sendEmail(env, { to: data.email, ...cliente }, fetcher),
    sendTelegram(env, `✉️ Mensaje desde Contacto\n${data.name} · ${data.email}${data.company ? ` · ${data.company}` : ''}${data.service ? `\nServicio: ${data.service}` : ''}\n\n${data.message.slice(0, 1500)}`, fetcher)
  ]);
  return json(200, { ok: true });
}

export default {
  fetch(request) {
    const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 100);
    return handleContacto(request, { ip });
  }
};
