// Pagos de los clientes: comprobantes, correos de «verificando» y «confirmado».
// La web nunca confirma un pago sola: Luis lo revisa y lo confirma desde la oficina.
import { updateSolicitud, sendTelegram } from './_solicitudes.mjs';

export const PAY_BUCKET = 'pagos';
export const METODOS = {
  binance: { es: 'Binance Pay (USDT)', en: 'Binance Pay (USDT)' },
  pagomovil: { es: 'Pago Móvil', en: 'Pago Móvil (Venezuela)' },
  otro: { es: 'Otro método', en: 'Other method' }
};
export const PAY_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const MAX_PROOF = 3 * 1024 * 1024;
export const WHATSAPP = '584127449626';

export const emailReady = env => Boolean(env.RESEND_API_KEY?.trim() && env.BRIEF_EMAIL_FROM?.trim());

// Comprueba la firma real del archivo, no solo su tipo declarado.
export function isProofFile(bytes, type) {
  if (type === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return type === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

const storageBase = env => `${env.SUPABASE_URL.trim().replace(/\/$/, '')}/storage/v1`;
const storageHeaders = env => {
  const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();
  return { apikey: key, Authorization: `Bearer ${key}` };
};

export async function uploadProof(env, path, bytes, type, fetcher = fetch) {
  const response = await fetcher(`${storageBase(env)}/object/${PAY_BUCKET}/${path}`, {
    method: 'POST', body: bytes,
    headers: { ...storageHeaders(env), 'Content-Type': type, 'x-upsert': 'false' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`storage_${response.status}`);
}

export async function signedProofUrl(env, path, fetcher = fetch) {
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/i.test(path || '')) return null;
  const response = await fetcher(`${storageBase(env)}/object/sign/${PAY_BUCKET}/${path}`, {
    method: 'POST', body: JSON.stringify({ expiresIn: 900 }),
    headers: { ...storageHeaders(env), 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`storage_${response.status}`);
  const { signedURL } = await response.json();
  return signedURL ? `${storageBase(env)}${signedURL.startsWith('/') ? '' : '/'}${signedURL}` : null;
}

export async function sendEmail(env, { to, subject, html, text, attachments = [], key, replyTo }, fetcher = fetch) {
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: JSON.stringify({
      from: env.BRIEF_EMAIL_FROM, to: [to], subject, html, text,
      ...(replyTo ? { reply_to: replyTo } : env.BRIEF_EMAIL_TO ? { reply_to: env.BRIEF_EMAIL_TO } : {}),
      attachments: attachments.map(f => ({ filename: f.name, content: f.bytes.toString('base64'), content_type: f.type }))
    }),
    signal: AbortSignal.timeout(18000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.id) throw new Error('email_delivery');
  return body.id;
}

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const maskEmail = email => {
  const [user, domain] = String(email || '').split('@');
  if (!user || !domain) return '';
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, Math.min(5, user.length - 2)))}@${domain}`;
};
const LOGO_URL = 'https://navasvisual.com/assets/email-logo.jpg';
export const EMAIL_FONT = "'Elms Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const EMAIL_HEAD = '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<link href="https://fonts.googleapis.com/css2?family=Elms+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"></head>';
// Encabezado de marca de los correos: logo + «Navas Visual» + eslogan traducido.
export const brandHeader = tagline => `<tr><td style="padding:28px 32px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:10px"><img src="${LOGO_URL}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0"></td>
<td style="vertical-align:middle;font-family:${EMAIL_FONT}"><div style="font-size:21px;line-height:1.1;font-weight:400;color:#111;letter-spacing:.01em">Navas Visual</div>
<div style="margin-top:4px;font-size:8.5px;line-height:1;font-weight:500;color:#8a8a8a;letter-spacing:.32em">${escapeHtml(String(tagline).toUpperCase())}</div></td>
</tr></table></td></tr>`;
const formatDate = (iso, lang) => new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'es-VE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Caracas' });

const COPY = {
  es: {
    verificando: {
      subject: code => `Recibimos tu comprobante · Solicitud ${code}`,
      badge: 'Pago en verificación', color: '#9a6400', bg: '#fff6e0',
      title: 'Estamos verificando tu pago',
      intro: name => `Hola ${name}, recibimos tu comprobante de pago. Lo estoy revisando y en cuanto lo confirme te llegará otro correo con la confirmación.`,
      note: 'Guarda este correo como constancia de que enviaste tu comprobante. Adjuntamos una copia del archivo que subiste.'
    },
    confirmado: {
      subject: code => `Pago confirmado · Solicitud ${code}`,
      badge: 'Pago confirmado', color: '#1f7a3d', bg: '#e8f6ec',
      title: 'Tu pago está confirmado',
      intro: name => `Hola ${name}, confirmé tu pago. ¡Gracias por confiar en Navas Visual! Este correo es tu recibo.`,
      note: 'Me pondré en contacto contigo en breve para empezar tu proyecto y coordinar los siguientes pasos.'
    },
    rechazado: {
      subject: code => `No pude confirmar tu pago · Solicitud ${code}`,
      badge: 'Pago no confirmado', color: '#b42318', bg: '#fdeeee',
      title: 'No pude confirmar tu pago',
      intro: name => `Hola ${name}, revisé tu comprobante pero todavía no pude confirmar el pago.`,
      note: 'Si crees que es un error, responde a este correo o escríbeme por WhatsApp y lo revisamos juntos.'
    },
    labels: { code: 'N.º de solicitud', plan: 'Plan', amount: 'Monto', method: 'Método de pago', reference: 'Referencia', sent: 'Comprobante enviado', confirmed: 'Pago confirmado', reason: 'Motivo' },
    tagline: 'Diseño visual digital',
    footer: '¿Dudas? Responde a este correo o escríbeme por WhatsApp.', whatsapp: 'Escribir por WhatsApp'
  },
  en: {
    verificando: {
      subject: code => `We received your payment receipt · Request ${code}`,
      badge: 'Payment being verified', color: '#9a6400', bg: '#fff6e0',
      title: 'We are verifying your payment',
      intro: name => `Hi ${name}, we received your payment receipt. I'm reviewing it and you'll get another email as soon as it's confirmed.`,
      note: 'Keep this email as proof that you sent your receipt. A copy of the file you uploaded is attached.'
    },
    confirmado: {
      subject: code => `Payment confirmed · Request ${code}`,
      badge: 'Payment confirmed', color: '#1f7a3d', bg: '#e8f6ec',
      title: 'Your payment is confirmed',
      intro: name => `Hi ${name}, your payment is confirmed. Thank you for trusting Navas Visual! This email is your receipt.`,
      note: "I'll get in touch with you shortly to start your project and plan the next steps."
    },
    rechazado: {
      subject: code => `I couldn't confirm your payment · Request ${code}`,
      badge: 'Payment not confirmed', color: '#b42318', bg: '#fdeeee',
      title: "I couldn't confirm your payment",
      intro: name => `Hi ${name}, I reviewed your receipt but couldn't confirm the payment yet.`,
      note: "If you think this is a mistake, reply to this email or message me on WhatsApp and we'll sort it out."
    },
    labels: { code: 'Request no.', plan: 'Plan', amount: 'Amount', method: 'Payment method', reference: 'Reference', sent: 'Receipt sent', confirmed: 'Payment confirmed', reason: 'Reason' },
    tagline: 'Digital visual design',
    footer: 'Questions? Reply to this email or message me on WhatsApp.', whatsapp: 'Message on WhatsApp'
  }
};
const TIERS_EN = { 'Básico': 'Basic', 'Estándar': 'Standard', 'Premium': 'Premium' };

// Correo para el cliente. kind: verificando | confirmado | rechazado.
export function paymentEmail(kind, row, pago) {
  const lang = pago?.lang === 'en' ? 'en' : 'es';
  const t = COPY[lang], k = t[kind], L = t.labels;
  const code = String(row.request_id).slice(0, 12);
  const name = String(row.name || '').split(/\s+/)[0] || (lang === 'en' ? 'there' : '');
  const rows = [
    [L.code, code],
    [L.plan, `${row.service_name} ${lang === 'en' ? TIERS_EN[row.tier] || row.tier : row.tier}`],
    [L.amount, `$${row.price} USD`],
    pago?.metodo && [L.method, METODOS[pago.metodo]?.[lang] || pago.metodo],
    pago?.referencia && [L.reference, pago.referencia],
    pago?.enviado_at && [L.sent, formatDate(pago.enviado_at, lang)],
    kind === 'confirmado' && pago?.confirmado_at && [L.confirmed, formatDate(pago.confirmado_at, lang)],
    kind === 'rechazado' && pago?.motivo && [L.reason, pago.motivo]
  ].filter(Boolean);
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent((lang === 'en' ? 'Hi Luis, about my payment for request ' : 'Hola Luis, te escribo por el pago de la solicitud ') + code)}`;
  const html = `<!doctype html><html lang="${lang}">${EMAIL_HEAD}
<body style="margin:0;background:#f2f1ee;font-family:${EMAIL_FONT};color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
${brandHeader(t.tagline)}
<tr><td style="padding:24px 32px 0"><span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;color:${k.color};background:${k.bg}">${escapeHtml(k.badge)}</span>
<h1 style="margin:16px 0 10px;font-size:26px;line-height:1.15;letter-spacing:-.02em">${escapeHtml(k.title)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#333">${escapeHtml(k.intro(name))}</p></td></tr>
<tr><td style="padding:22px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e0;border-radius:14px;border-collapse:separate">
${rows.map(([label, value], i) => `<tr><td style="padding:11px 16px;font-size:13px;color:#777;${i ? 'border-top:1px solid #efede9;' : ''}">${escapeHtml(label)}</td><td style="padding:11px 16px;font-size:14px;text-align:right;font-weight:500;${i ? 'border-top:1px solid #efede9;' : ''}">${escapeHtml(value)}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:18px 32px 0;font-size:14px;line-height:1.55;color:#333">${escapeHtml(k.note)}</td></tr>
<tr><td style="padding:22px 32px 30px"><a href="${wa}" style="display:inline-block;background:#0b0b0b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:500">${escapeHtml(t.whatsapp)}</a>
<p style="margin:16px 0 0;font-size:12px;color:#888">${escapeHtml(t.footer)}</p></td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:#999">Navas Visual · navasvisual.com</p>
</td></tr></table></body></html>`;
  const text = [k.title, '', k.intro(name), '', ...rows.map(([label, value]) => `${label}: ${value}`), '', k.note, '', `${t.whatsapp}: ${wa}`, '', 'Navas Visual · navasvisual.com'].join('\n');
  return { subject: k.subject(code), html, text };
}

// Avisa a Luis por Telegram con el comprobante adjunto.
export async function telegramProof(env, row, pago, file, link, fetcher = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const caption = [
    `💳 Comprobante de pago · ${String(row.request_id).slice(0, 12)}`,
    `${row.brand} · ${row.service_name} ${row.tier} · $${row.price}`,
    `${METODOS[pago.metodo]?.es || pago.metodo}${pago.referencia ? ` · Ref. ${pago.referencia}` : ''}`,
    `${row.name} · ${row.email}`,
    '', 'Revísalo y confírmalo en la oficina:', link
  ].join('\n').slice(0, 1000);
  const body = new FormData();
  body.set('chat_id', env.TELEGRAM_CHAT_ID);
  body.set('caption', caption);
  body.set('document', new Blob([file.bytes], { type: file.type }), file.name);
  const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('telegram_proof');
}

// Luis confirma o rechaza el pago desde la oficina. Devuelve la fila actualizada.
export async function decidePayment(env, row, { decision, motivo = '' }, { link, now = Date.now() } = {}, fetcher = fetch) {
  const at = new Date(now).toISOString();
  const prev = row.pago || {};
  if (decision === 'confirmar' && prev.estado === 'confirmado') return { solicitud: row, email: Boolean(prev.correo_confirmado), already: true };
  const pago = decision === 'confirmar'
    ? { ...prev, metodo: prev.metodo || 'otro', estado: 'confirmado', confirmado_at: at, motivo: undefined }
    : { ...prev, estado: 'rechazado', rechazado_at: at, motivo: String(motivo).trim().slice(0, 500) };
  const patch = { pago };
  if (decision === 'confirmar' && ['nueva', 'revision', 'propuesta'].includes(row.status)) patch.status = 'aceptada';
  let email = false;
  if (emailReady(env) && row.email) {
    try {
      const mail = paymentEmail(decision === 'confirmar' ? 'confirmado' : 'rechazado', row, pago);
      await sendEmail(env, { to: row.email, ...mail, key: `pago-${decision}-${row.id}-${now}` }, fetcher);
      email = true;
    } catch (error) { console.error('Pago: correo al cliente falló', error.message); }
  }
  pago[decision === 'confirmar' ? 'correo_confirmado' : 'correo_rechazado'] = email;
  const updated = await updateSolicitud(env, row.id, patch, fetcher);
  const note = decision === 'confirmar'
    ? `✅ Pago confirmado · ${row.brand} · $${row.price}\n${email ? 'El cliente recibió el correo de confirmación.' : 'No se pudo enviar el correo al cliente; avísale tú.'}`
    : `❌ Pago no confirmado · ${row.brand}\n${email ? 'El cliente recibió el correo con el motivo.' : 'No se pudo enviar el correo al cliente; avísale tú.'}`;
  await sendTelegram(env, `${note}\n${link || ''}`.trim(), fetcher).catch(() => {});
  return { solicitud: updated || { ...row, ...patch }, email };
}
