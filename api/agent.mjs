import { runDesign, signedImageUrls, DESIGN_SERVICES, CAMILO } from './_diseno.mjs';
import { runContent, CONTENT_SERVICES, TEO } from './_contenido.mjs';
import { runMonitor, latestReports, writeSummary, chatWithVega } from './_monitor.mjs';
import { decidePayment, signedProofUrl } from './_pagos.mjs';
import { guardarPresupuesto, enviarPresupuesto, getPresupuesto } from './_presupuestos.mjs';
import { afterResponse, sendTelegram, verifyAdmin, supabaseReady, aiReady, getSolicitud, updateSolicitud, listSolicitudes, analyzeSolicitud, chatWithMarta } from './_solicitudes.mjs';

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
  if (!supabaseReady(env)) return json(503, { error: 'config' });

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json(413, { error: 'size' });
    body = JSON.parse(text);
  } catch { return json(400, { error: 'invalid' }); }

  try {
    // Pagos: no necesitan IA. Luis ve el comprobante y confirma o rechaza; el cliente recibe el correo.
    if (body?.action === 'comprobante') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row?.pago?.archivo?.path) return json(404, { error: 'not_found' });
      return json(200, { url: await signedProofUrl(env, row.pago.archivo.path, fetcher), type: row.pago.archivo.type });
    }
    if (body?.action === 'pago') {
      if (!['confirmar', 'rechazar'].includes(body.decision)) return json(400, { error: 'invalid' });
      const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
      if (body.decision === 'rechazar' && !motivo) return json(400, { error: 'motivo' });
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      const link = `${new URL(request.url).origin}/admin.html#solicitud-${row.id}`;
      return json(200, await decidePayment(env, row, { decision: body.decision, motivo }, { link }, fetcher));
    }
    // Presupuestos personalizados: Luis los guarda y los envía; el cliente los acepta en la web.
    if (body?.action === 'presupuesto_guardar') {
      const result = await guardarPresupuesto(env, body.presupuesto || {}, fetcher);
      if (result.error) return json(result.error === 'not_found' ? 404 : 400, { error: result.error });
      return json(200, result);
    }
    if (body?.action === 'presupuesto_enviar') {
      const row = await getPresupuesto(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      const link = `${new URL(request.url).origin}/admin.html#presupuesto-${row.id}`;
      const result = await enviarPresupuesto(env, row, { link }, fetcher);
      if (result.error) return json(result.error === 'email_config' ? 503 : 409, { error: result.error });
      return json(200, result);
    }
    if (!aiReady(env)) return json(503, { error: 'config' });
    if (body?.action === 'analizar') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      const ai = await analyzeSolicitud(env, row, fetcher);
      const updated = await updateSolicitud(env, row.id, { ai, ai_at: new Date().toISOString() }, fetcher);
      return json(200, { solicitud: updated || { ...row, ai } });
    }
    if (body?.action === 'disenar') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      if (!DESIGN_SERVICES.includes(row.service)) return json(400, { error: 'not_design' });
      const feedback = typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 1000) : '';
      const link = `${new URL(request.url).origin}/admin.html#solicitud-${row.id}`;
      const diseno = await runDesign(env, row, { feedback, link, notify: true }, fetcher);
      if (!diseno || diseno.estado !== 'listo') return json(502, { error: 'upstream' });
      return json(200, { solicitud: { ...row, diseno } });
    }
    if (body?.action === 'contenido') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      if (!CONTENT_SERVICES.includes(row.service)) return json(400, { error: 'not_content' });
      const feedback = typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 1000) : '';
      const link = `${new URL(request.url).origin}/admin.html#solicitud-${row.id}`;
      const contenido = await runContent(env, row, { feedback, link, notify: true }, fetcher);
      if (!contenido || contenido.estado !== 'listo') return json(502, { error: 'upstream' });
      return json(200, { solicitud: { ...row, contenido } });
    }
    if (body?.action === 'imagenes') {
      const row = await getSolicitud(env, body.id, fetcher);
      if (!row) return json(404, { error: 'not_found' });
      const paths = [...(row.diseno?.conceptos || []), ...(row.contenido?.visuales || [])].map(c => c.imagen).filter(Boolean);
      return json(200, { urls: await signedImageUrls(env, paths, fetcher) });
    }
    if (body?.action === 'revisar') {
      // Vega revisa en segundo plano; la oficina recibe el resultado en tiempo real.
      const base = new URL(request.url).origin;
      await afterResponse(() => runMonitor(env, { base, modo: 'completo' }, fetcher));
      return json(202, { started: true });
    }
    if (body?.action === 'resumen') {
      const [report] = await latestReports(env, 1, fetcher);
      if (!report) return json(404, { error: 'no_reports' });
      const resumen = await writeSummary(env, report, fetcher);
      if (body.telegram) await sendTelegram(env, `📋 Resumen de Vega sobre la web\n\n${resumen}`, fetcher).catch(() => {});
      return json(200, { resumen, report_at: report.created_at });
    }
    if (body?.action === 'chat' && body.agent === 'tecnico') {
      if (typeof body.message !== 'string' || !body.message.trim()) return json(400, { error: 'invalid' });
      const [report] = await latestReports(env, 1, fetcher);
      const { reply, acciones } = await chatWithVega(env, { message: body.message.trim(), history: Array.isArray(body.history) ? body.history : [], report }, fetcher);
      return json(200, { reply, acciones });
    }
    if (body?.action === 'chat') {
      if (typeof body.message !== 'string' || !body.message.trim()) return json(400, { error: 'invalid' });
      const solicitudes = await listSolicitudes(env, 25, fetcher);
      const persona = body.agent === 'diseno' ? CAMILO : body.agent === 'contenido' ? TEO : null;
      const reply = await chatWithMarta(env, { message: body.message.trim(), history: Array.isArray(body.history) ? body.history : [], solicitudes, persona }, fetcher);
      return json(200, { reply });
    }
    return json(400, { error: 'action' });
  } catch (error) {
    console.error('Agente:', error.message);
    return json(502, { error: 'upstream' });
  }
}

export default { fetch: request => handleAgent(request) };
