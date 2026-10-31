// Página pública del presupuesto: el cliente lo ve (GET) y lo acepta o rechaza (POST).
// Solo se entra con el enlace secreto que recibe por correo.
import './_seguro.mjs'; // escudo contra respuestas Brotli maliciosas (CVE-2026-111497)
import { supabaseReady, sendTelegram } from './_solicitudes.mjs';
import { TOKEN, getPresupuestoByToken, patchPresupuesto, responderPresupuesto, vistaPublica, numeroDe, SITE } from './_presupuestos.mjs';

const attempts = new Map();
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

function limited(ip, now) {
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  let limit = attempts.get(ip);
  if (!limit) { if (attempts.size > 10000) attempts.clear(); limit = { count: 0, until: now + 600000 }; attempts.set(ip, limit); }
  return ++limit.count > 30;
}

export async function handlePresupuesto(request, { env = process.env, fetcher = fetch, ip = 'unknown', now = Date.now() } = {}) {
  if (!['GET', 'POST'].includes(request.method)) return json(405, { error: 'method' });
  if (!supabaseReady(env)) return json(503, { error: 'unavailable' });
  if (limited(ip, now)) return json(429, { error: 'rate' });

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const token = url.searchParams.get('p') || '';
    if (!TOKEN.test(token)) return json(404, { error: 'not_found' });
    const row = await getPresupuestoByToken(env, token, fetcher).catch(() => null);
    if (!row) return json(404, { error: 'not_found' });
    const preview = url.searchParams.get('vista') === '1';
    // Los borradores solo se ven como vista previa desde la oficina.
    if (row.estado === 'borrador' && !preview) return json(404, { error: 'not_found' });
    if (!preview && row.estado === 'enviado' && !row.visto_at) {
      await patchPresupuesto(env, row.id, { visto_at: new Date(now).toISOString() }, fetcher, '&visto_at=is.null').catch(() => null);
      await sendTelegram(env, `👀 ${row.marca || row.cliente_nombre} abrió el presupuesto ${numeroDe(row)}\n${SITE}/admin.html#presupuesto-${row.id}`, fetcher).catch(() => {});
    }
    return json(200, { presupuesto: vistaPublica(row, now), preview: row.estado === 'borrador' });
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  let body;
  try {
    const text = await request.text();
    if (text.length > 4096) return json(413, { error: 'size' });
    body = JSON.parse(text);
  } catch { return json(400, { error: 'invalid' }); }
  if (!TOKEN.test(body?.p || '') || !['aceptar', 'rechazar'].includes(body?.accion)) return json(400, { error: 'invalid' });
  const row = await getPresupuestoByToken(env, body.p, fetcher).catch(() => null);
  if (!row || row.estado === 'borrador') return json(404, { error: 'not_found' });
  try {
    const result = await responderPresupuesto(env, row, { accion: body.accion, motivo: typeof body.motivo === 'string' ? body.motivo : '' }, { now }, fetcher);
    if (result.error) return json(409, { error: result.error });
    return json(200, { presupuesto: vistaPublica(result.presupuesto, now) });
  } catch (error) {
    console.error('Presupuesto:', error.message);
    return json(502, { error: 'upstream' });
  }
}

export default {
  fetch(request) {
    const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim().slice(0, 100);
    return handlePresupuesto(request, { ip });
  }
};
