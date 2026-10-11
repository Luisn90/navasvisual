import { verifyAdmin, supabaseReady, claudeReady, getSolicitud, updateSolicitud, listSolicitudes, analyzeSolicitud, chatWithMarta } from './_solicitudes.mjs';

const MAX_BODY = 64 * 1024;
const json = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Marta en el admin: volver a analizar una solicitud o conversar sobre ellas.
// Solo responde a sesiones de Supabase cuyo correo esté en ADMIN_EMAILS.
export async function handleAgent(request, { env = process.env, fetcher = fetch } = {}) {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  if (Number(request.headers.get('content-length')) > MAX_BODY) return json(413, { error: 'size' });

  const auth = await verifyAdmin(env, request, fetcher).catch(() => ({ ok: false, status: 503 }));
  if (!auth.ok) return json(auth.status, { error: auth.status === 503 ? 'config' : 'auth' });
  if (!claudeReady(env) || !supabaseReady(env)) return json(503, { error: 'config' });

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json(413, { error: 'size' });
    body = JSON.parse(text);
  } catch { return json(400, { error: 'invalid' }); }

  try {
    if (body?.action === 'analizar') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      const ai = await analyzeSolicitud(env, row, fetcher);
      const updated = await updateSolicitud(env, row.id, { ai, ai_at: new Date().toISOString() }, fetcher);
      return json(200, { solicitud: updated || { ...row, ai } });
    }
    if (body?.action === 'chat') {
      if (typeof body.message !== 'string' || !body.message.trim()) return json(400, { error: 'invalid' });
      const solicitudes = await listSolicitudes(env, 25, fetcher);
      const reply = await chatWithMarta(env, { message: body.message.trim(), history: Array.isArray(body.history) ? body.history : [], solicitudes }, fetcher);
      return json(200, { reply });
    }
    return json(400, { error: 'action' });
  } catch (error) {
    console.error('Agente:', error.message);
    return json(502, { error: 'upstream' });
  }
}

export default { fetch: request => handleAgent(request) };
