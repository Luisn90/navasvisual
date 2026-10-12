// Presupuestos personalizados: Luis los prepara en la oficina, el cliente recibe un correo con
// el enlace, los ve en navasvisual.com/presupuesto.html y los acepta o rechaza desde ahí.
import { randomBytes } from 'node:crypto';
import { sbRest, sendTelegram, updateSolicitud } from './_solicitudes.mjs';
import { sendEmail, emailReady, escapeHtml, brandHeader, EMAIL_FONT, EMAIL_HEAD, METODOS, WHATSAPP } from './_pagos.mjs';

export const SITE = 'https://navasvisual.com';
export const ESTADOS = ['borrador', 'enviado', 'aceptado', 'rechazado'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOKEN = /^[0-9a-f]{64}$/;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

// Firma de Luis en los correos (y la misma que va en Zoho).
export const FIRMA = {
  nombre: 'Luis Navas',
  cargo: { es: 'Fundador y diseñador', en: 'Founder & designer' },
  web: 'navasvisual.com',
  instagram: 'navasvisual.design'
};

const line = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const block = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const int = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def; };
const money = v => Math.round(Number(v) * 100) / 100;

// Valida lo que llega del formulario de la oficina. Devuelve { data } o { error: 'campo' }.
export function cleanPresupuesto(input = {}) {
  const data = {
    lang: input.lang === 'en' ? 'en' : 'es',
    cliente_nombre: line(input.cliente_nombre, 120),
    cliente_email: line(input.cliente_email, 160).toLowerCase(),
    marca: line(input.marca, 120),
    titulo: line(input.titulo, 140),
    intro: block(input.intro, 1200),
    plazo: line(input.plazo, 200),
    rondas: int(input.rondas, 0, 10, 2),
    rondas_extra: line(input.rondas_extra, 240),
    anticipo: int(input.anticipo, 0, 100, 50),
    validez_dias: int(input.validez_dias, 1, 90, 15),
    notas: block(input.notas, 1500)
  };
  if (!data.cliente_nombre) return { error: 'cliente_nombre' };
  if (!EMAIL.test(data.cliente_email)) return { error: 'cliente_email' };
  if (!data.titulo) return { error: 'titulo' };
  const conceptos = (Array.isArray(input.conceptos) ? input.conceptos : []).slice(0, 25)
    .map(c => ({ descripcion: line(c?.descripcion, 160), detalle: block(c?.detalle, 500), precio: money(c?.precio) }))
    .filter(c => c.descripcion || c.detalle || c.precio);
  if (!conceptos.length) return { error: 'conceptos' };
  if (conceptos.some(c => !c.descripcion || !Number.isFinite(c.precio) || c.precio < 0 || c.precio > 1e6)) return { error: 'conceptos' };
  data.conceptos = conceptos;
  data.entregables = (Array.isArray(input.entregables) ? input.entregables : String(input.entregables || '').split('\n'))
    .map(e => line(e, 200)).filter(Boolean).slice(0, 25);
  data.metodos = [...new Set((Array.isArray(input.metodos) ? input.metodos : []).filter(m => Object.hasOwn(METODOS, m)))];
  data.total = money(conceptos.reduce((sum, c) => sum + c.precio, 0));
  if (input.solicitud_id && UUID.test(input.solicitud_id)) data.solicitud_id = input.solicitud_id;
  return { data };
}

export const numeroDe = row => `P-${String(row?.numero ?? 0).padStart(4, '0')}`;
export const venceEl = row => row?.enviado_at ? new Date(new Date(row.enviado_at).getTime() + row.validez_dias * 86400000) : null;
export const vencido = (row, now = Date.now()) => row?.estado === 'enviado' && venceEl(row) && venceEl(row).getTime() < now;
export const formatMoney = (n, lang = 'es') => '$' + Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'de-DE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const formatDay = (d, lang) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-VE', { dateStyle: 'long', timeZone: 'America/Caracas' });
export const linkDe = row => `${SITE}/presupuesto.html?p=${row.token}`;

// Lo que ve el cliente: nada de notas internas ni datos de la oficina.
export function vistaPublica(row, now = Date.now()) {
  const metodos = (row.metodos || []).map(m => METODOS[m]?.[row.lang] || m);
  return {
    numero: numeroDe(row), estado: vencido(row, now) ? 'vencido' : row.estado, lang: row.lang,
    cliente_nombre: row.cliente_nombre, marca: row.marca, titulo: row.titulo, intro: row.intro,
    conceptos: row.conceptos || [], entregables: row.entregables || [], plazo: row.plazo,
    rondas: row.rondas, rondas_extra: row.rondas_extra, anticipo: row.anticipo, metodos,
    validez_dias: row.validez_dias, notas: row.notas, total: Number(row.total),
    fecha: row.enviado_at || row.created_at, vence: venceEl(row)?.toISOString() || null,
    aceptado_at: row.aceptado_at, rechazado_at: row.rechazado_at,
    whatsapp: WHATSAPP, firma: { nombre: FIRMA.nombre, cargo: FIRMA.cargo[row.lang], web: FIRMA.web, instagram: FIRMA.instagram }
  };
}

// --- Base de datos ---
const SELECT = 'presupuestos?select=*';
export async function getPresupuesto(env, id, fetcher = fetch) {
  if (!UUID.test(id || '')) return null;
  const rows = await sbRest(env, `${SELECT}&id=eq.${id}`, {}, fetcher);
  return rows?.[0] || null;
}
export async function getPresupuestoByToken(env, token, fetcher = fetch) {
  if (!TOKEN.test(token || '')) return null;
  const rows = await sbRest(env, `${SELECT}&token=eq.${token}`, {}, fetcher);
  return rows?.[0] || null;
}
export async function patchPresupuesto(env, id, patch, fetcher = fetch, where = '') {
  const rows = await sbRest(env, `presupuestos?id=eq.${id}${where}`, {
    method: 'PATCH', body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }), headers: { Prefer: 'return=representation' }
  }, fetcher);
  return rows?.[0] || null;
}

// Crea o actualiza un presupuesto. Solo se pueden editar los que aún no se aceptaron ni rechazaron.
export async function guardarPresupuesto(env, input, fetcher = fetch) {
  const { data, error } = cleanPresupuesto(input);
  if (error) return { error };
  if (input.id) {
    const row = await getPresupuesto(env, input.id, fetcher);
    if (!row) return { error: 'not_found' };
    if (!['borrador', 'enviado'].includes(row.estado)) return { error: 'cerrado' };
    return { presupuesto: await patchPresupuesto(env, row.id, data, fetcher) };
  }
  const rows = await sbRest(env, 'presupuestos', {
    method: 'POST', body: JSON.stringify({ ...data, token: randomBytes(32).toString('hex') }), headers: { Prefer: 'return=representation' }
  }, fetcher);
  return { presupuesto: rows?.[0] || null };
}

// --- Correos ---
const COPY = {
  es: {
    tagline: 'Diseño visual digital',
    enviado: {
      subject: row => `Tu presupuesto: ${row.titulo} · ${numeroDe(row)}`,
      badge: 'Presupuesto', title: row => row.titulo,
      intro: row => `Hola ${row.cliente_nombre.split(' ')[0]}, te comparto el presupuesto que preparé para ${row.marca || 'tu proyecto'}. Puedes verlo completo, descargarlo en PDF y aceptarlo desde el enlace.`,
      cta: 'Ver y aceptar el presupuesto'
    },
    aceptado: {
      subject: row => `Presupuesto aceptado · ${numeroDe(row)}`,
      badge: 'Presupuesto aceptado', title: () => '¡Gracias por aceptar el presupuesto!',
      intro: row => `Hola ${row.cliente_nombre.split(' ')[0]}, recibí tu aceptación. Para empezar el proyecto, el siguiente paso es el anticipo. Te escribo en breve para coordinarlo.`,
      cta: 'Ver el presupuesto'
    },
    labels: { numero: 'N.º de presupuesto', total: 'Total', anticipo: 'Anticipo', plazo: 'Plazo estimado', vence: 'Válido hasta' },
    footer: '¿Dudas? Responde a este correo o escríbeme por WhatsApp.', whatsapp: 'WhatsApp'
  },
  en: {
    tagline: 'Digital visual design',
    enviado: {
      subject: row => `Your quote: ${row.titulo} · ${numeroDe(row)}`,
      badge: 'Quote', title: row => row.titulo,
      intro: row => `Hi ${row.cliente_nombre.split(' ')[0]}, here is the quote I prepared for ${row.marca || 'your project'}. You can see it in full, download it as a PDF and accept it from the link.`,
      cta: 'View and accept the quote'
    },
    aceptado: {
      subject: row => `Quote accepted · ${numeroDe(row)}`,
      badge: 'Quote accepted', title: () => 'Thank you for accepting the quote!',
      intro: row => `Hi ${row.cliente_nombre.split(' ')[0]}, I received your acceptance. To start the project, the next step is the deposit. I'll write to you shortly to arrange it.`,
      cta: 'View the quote'
    },
    labels: { numero: 'Quote no.', total: 'Total', anticipo: 'Deposit', plazo: 'Estimated timeline', vence: 'Valid until' },
    footer: 'Questions? Reply to this email or message me on WhatsApp.', whatsapp: 'WhatsApp'
  }
};

// Firma en HTML para correos (la misma que se pega en Zoho).
export function firmaHtml(lang = 'es') {
  const f = FIRMA;
  const a = 'color:#111;text-decoration:none';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:${EMAIL_FONT}"><tr>
<td style="padding-right:12px;border-right:1px solid #e3e1dc;vertical-align:top"><div style="font-size:15px;font-weight:600;color:#111;line-height:1.3">${f.nombre}</div>
<div style="font-size:12px;color:#777;line-height:1.4">${escapeHtml(f.cargo[lang])} · Navas Visual</div></td>
<td style="padding-left:12px;vertical-align:top;font-size:12px;line-height:1.6;color:#555">
<a href="https://${f.web}" style="${a}">${f.web}</a><br>
<a href="https://wa.me/${WHATSAPP}" style="${a}">WhatsApp +${WHATSAPP.replace(/^58(\d{3})(\d{7})$/, '58 $1 $2')}</a><br>
<a href="https://instagram.com/${f.instagram}" style="${a}">@${f.instagram}</a></td>
</tr></table>`;
}

export function presupuestoEmail(kind, row) {
  const lang = row.lang === 'en' ? 'en' : 'es';
  const t = COPY[lang], k = t[kind], L = t.labels;
  const rows = [
    [L.numero, numeroDe(row)],
    [L.total, `${formatMoney(row.total, lang)} USD`],
    row.anticipo > 0 && [L.anticipo, `${row.anticipo}% · ${formatMoney(row.total * row.anticipo / 100, lang)} USD`],
    row.plazo && [L.plazo, row.plazo],
    kind === 'enviado' && venceEl(row) && [L.vence, formatDay(venceEl(row), lang)]
  ].filter(Boolean);
  const link = linkDe(row);
  const html = `<!doctype html><html lang="${lang}">${EMAIL_HEAD}
<body style="margin:0;background:#f2f1ee;font-family:${EMAIL_FONT};color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
${brandHeader(t.tagline)}
<tr><td style="padding:24px 32px 0"><span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;color:#111;background:#f2f1ee">${escapeHtml(k.badge)}</span>
<h1 style="margin:16px 0 10px;font-size:26px;line-height:1.15;letter-spacing:-.02em">${escapeHtml(k.title(row))}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#333">${escapeHtml(k.intro(row))}</p></td></tr>
<tr><td style="padding:22px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e0;border-radius:14px;border-collapse:separate">
${rows.map(([label, value], i) => `<tr><td style="padding:11px 16px;font-size:13px;color:#777;${i ? 'border-top:1px solid #efede9;' : ''}">${escapeHtml(label)}</td><td style="padding:11px 16px;font-size:14px;text-align:right;font-weight:500;${i ? 'border-top:1px solid #efede9;' : ''}">${escapeHtml(value)}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:22px 32px 0"><a href="${link}" style="display:inline-block;background:#0b0b0b;color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:500">${escapeHtml(k.cta)}</a>
<p style="margin:14px 0 0;font-size:12px;color:#888">${escapeHtml(t.footer)}</p></td></tr>
<tr><td style="padding:26px 32px 30px"><div style="border-top:1px solid #efede9;padding-top:20px">${firmaHtml(lang)}</div></td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:#999">Navas Visual · navasvisual.com</p>
</td></tr></table></body></html>`;
  const text = [k.title(row), '', k.intro(row), '', ...rows.map(([l, v]) => `${l}: ${v}`), '', `${k.cta}: ${link}`, '', t.footer, '',
    `${FIRMA.nombre} · ${FIRMA.cargo[lang]} · Navas Visual`, FIRMA.web, `WhatsApp: https://wa.me/${WHATSAPP}`, `Instagram: @${FIRMA.instagram}`].join('\n');
  return { subject: k.subject(row), html, text };
}

// Envía (o reenvía) el presupuesto al cliente y lo marca como enviado.
export async function enviarPresupuesto(env, row, { now = Date.now(), link } = {}, fetcher = fetch) {
  if (!['borrador', 'enviado'].includes(row.estado)) return { error: 'cerrado' };
  if (!emailReady(env)) return { error: 'email_config' };
  const at = new Date(now).toISOString();
  const draft = { ...row, enviado_at: at };
  await sendEmail(env, { to: row.cliente_email, ...presupuestoEmail('enviado', draft), key: `presupuesto-${row.id}-${now}` }, fetcher);
  const updated = await patchPresupuesto(env, row.id, { estado: 'enviado', enviado_at: at }, fetcher);
  if (row.solicitud_id) await updateSolicitud(env, row.solicitud_id, { status: 'propuesta' }, fetcher).catch(() => {});
  await sendTelegram(env, `📨 Presupuesto enviado · ${numeroDe(row)} · ${row.marca || row.cliente_nombre} · ${formatMoney(row.total)} USD${link ? `\n${link}` : ''}`, fetcher).catch(() => {});
  return { presupuesto: updated || { ...row, estado: 'enviado', enviado_at: at } };
}

// El cliente acepta o rechaza desde la página pública.
export async function responderPresupuesto(env, row, { accion, motivo = '' }, { now = Date.now() } = {}, fetcher = fetch) {
  if (row.estado !== 'enviado') return { error: 'cerrado', estado: row.estado };
  if (vencido(row, now)) return { error: 'vencido' };
  const at = new Date(now).toISOString();
  const patch = accion === 'aceptar'
    ? { estado: 'aceptado', aceptado_at: at }
    : { estado: 'rechazado', rechazado_at: at, motivo_rechazo: line(motivo, 500) || null };
  // Solo cambia si sigue «enviado»: evita dobles respuestas.
  const updated = await patchPresupuesto(env, row.id, patch, fetcher, '&estado=eq.enviado');
  if (!updated) return { error: 'cerrado' };
  const admin = `${SITE}/admin.html#presupuesto-${row.id}`;
  if (accion === 'aceptar') {
    if (row.solicitud_id) await updateSolicitud(env, row.solicitud_id, { status: 'aceptada' }, fetcher).catch(() => {});
    if (emailReady(env)) await sendEmail(env, { to: row.cliente_email, ...presupuestoEmail('aceptado', updated), key: `presupuesto-aceptado-${row.id}` }, fetcher)
      .catch(error => console.error('Presupuesto: correo de aceptación falló', error.message));
    await sendTelegram(env, `🎉 Presupuesto ACEPTADO · ${numeroDe(row)}\n${row.marca || row.cliente_nombre} · ${formatMoney(row.total)} USD\nAnticipo: ${row.anticipo}% (${formatMoney(row.total * row.anticipo / 100)} USD)\nCliente: ${row.cliente_email}\n${admin}`, fetcher).catch(() => {});
  } else {
    await sendTelegram(env, `🙅 Presupuesto rechazado · ${numeroDe(row)} · ${row.marca || row.cliente_nombre}${patch.motivo_rechazo ? `\nMotivo: ${patch.motivo_rechazo}` : ''}\n${admin}`, fetcher).catch(() => {});
  }
  return { presupuesto: updated };
}
