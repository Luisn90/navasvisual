// Vega, el monitor técnico: revisa navasvisual.com de forma periódica, guarda lo que
// encuentra, avisa por Telegram cuando algo se rompe y resume qué arreglar o mejorar.
import { sbRest, supabaseReady, aiReady, aiChat, sendTelegram, afterResponse } from './_solicitudes.mjs';

export const PAGES = ['/', '/work.html', '/about.html', '/contact.html', '/admin.html'];
const SOURCES = ['/components.jsx', '/home.jsx', '/brief.jsx', '/intro.jsx', '/about.jsx', '/work.jsx', '/contact.jsx'];
const SLOW_MS = 3000, BIG_IMAGE = 600 * 1024, MAX_ASSETS = 60, MAX_EXTERNAL = 15;

export const VEGA = `Eres Vega, el monitor técnico de navasvisual.com, la web del estudio de diseño de Luis Navas. Revisas la web cada cierto tiempo y le explicas a Luis, que es diseñador y no programador, qué está fallando y qué conviene mejorar.

Reglas:
- Básate solo en los datos de las revisiones que recibes. No inventes problemas ni cifras.
- Prioriza: primero lo que está roto o afecta a clientes (páginas caídas, enlaces o imágenes rotas, formularios o APIs que fallan, agentes que no procesan solicitudes), después lo que mejora rendimiento, SEO, accesibilidad y seguridad.
- Para cada punto di en una frase qué pasa, por qué importa y qué hacer, de forma concreta (qué archivo, qué página o qué ajuste).
- Escribe en español, claro y breve. Sin tecnicismos innecesarios.`;

const now = () => Date.now();
async function timed(fetcher, url, init = {}, ms = 10000) {
  const start = now();
  try {
    const response = await fetcher(url, { redirect: 'follow', ...init, signal: AbortSignal.timeout(ms) });
    return { ok: response.ok, status: response.status, ms: now() - start, response };
  } catch (error) {
    return { ok: false, status: 0, ms: now() - start, error: error?.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
const finding = (tipo, area, id, titulo, detalle, url = null) => ({ id, tipo, area, titulo, detalle, url });
const pageName = p => (p === '/' ? 'Inicio' : p.replace(/^\//, ''));

// Extrae del HTML lo que hace falta para SEO y para revisar recursos.
export function parseHtml(html) {
  const get = re => html.match(re)?.[1]?.trim() || '';
  const meta = name => get(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))
    || get(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'));
  const refs = [...html.matchAll(/<(?:script|img|link|source)\b[^>]*?\b(?:src|href)=["']([^"'#]+)["']/gi)].map(m => m[1]);
  return {
    title: get(/<title[^>]*>([^<]*)<\/title>/i), description: meta('description'), ogImage: meta('og:image'),
    viewport: meta('viewport'), lang: get(/<html[^>]*\blang=["']([^"']+)["']/i),
    refs, devReact: /react(-dom)?\.development\.js/i.test(html), babelInBrowser: /babel(\.min)?\.js/i.test(html) && /type=["']text\/babel["']/i.test(html)
  };
}
// Recursos y enlaces dentro del código JSX (la web se dibuja en el navegador).
export function parseSource(code) {
  const local = new Set(), pages = new Set(), external = new Set();
  for (const m of code.matchAll(/["'`]((?:\.?\/)?(?:assets|uploads)\/[^"'`$]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|pdf))["'`]/gi)) local.add('/' + m[1].replace(/^\.?\//, ''));
  for (const m of code.matchAll(/href=\{?["'`]\/?([\w-]+\.html)(?:#[\w-]*)?["'`]/gi)) pages.add('/' + m[1]);
  for (const m of code.matchAll(/href=\{?["'`](https:\/\/[^"'`\s${}]+)["'`]/gi)) external.add(m[1]);
  return { local: [...local], pages: [...pages], external: [...external] };
}

async function checkSite(base, fetcher) {
  const hallazgos = [], paginas = [];
  const assets = new Map(), external = new Set(), linkedPages = new Set();
  let home = null;
  await Promise.all(PAGES.map(async path => {
    const r = await timed(fetcher, base + path, {}, 15000);
    const html = r.ok ? await r.response.text().catch(() => '') : '';
    paginas.push({ path, status: r.status, ms: r.ms, bytes: html.length });
    if (!r.ok) { hallazgos.push(finding('error', 'disponibilidad', `page:${path}`, `La página ${pageName(path)} no carga`, r.status ? `Responde con el código ${r.status}.` : `No respondió (${r.error}).`, base + path)); return; }
    if (r.ms > SLOW_MS) hallazgos.push(finding('aviso', 'rendimiento', `slow:${path}`, `La página ${pageName(path)} tarda en responder`, `Tardó ${(r.ms / 1000).toFixed(1)} s en llegar el HTML.`, base + path));
    const info = parseHtml(html);
    if (path === '/') home = { info, headers: r.response.headers };
    if (path !== '/admin.html') {
      if (!info.title) hallazgos.push(finding('aviso', 'seo', `title:${path}`, `${pageName(path)} no tiene título`, 'Falta la etiqueta <title>, que es lo que Google muestra como enlace.', base + path));
      if (!info.description) hallazgos.push(finding('mejora', 'seo', `desc:${path}`, `${pageName(path)} no tiene descripción`, 'Añade <meta name="description"> con una frase sobre la página; Google la usa debajo del título.', base + path));
      if (!info.ogImage) hallazgos.push(finding('mejora', 'seo', `og:${path}`, `${pageName(path)} no tiene imagen para compartir`, 'Sin <meta property="og:image">, al compartir el enlace en WhatsApp o redes no aparece una imagen de vista previa.', base + path));
      if (!info.lang) hallazgos.push(finding('mejora', 'accesibilidad', `lang:${path}`, `${pageName(path)} no declara el idioma`, 'Añade lang="es" a la etiqueta <html> para lectores de pantalla y buscadores.', base + path));
    }
    for (const ref of info.refs) {
      // Plantillas de código (${...}) no son archivos reales.
      if (/[{}$]/.test(ref)) continue;
      if (/^https?:\/\//i.test(ref)) { if (!/fonts\.(googleapis|gstatic)\.com\/?$/i.test(ref)) assets.set(ref, path); }
      else if (!/^(data|blob|mailto|tel):/i.test(ref)) assets.set(new URL(ref, base + path).href, path);
    }
  }));
  // Código fuente de la web: imágenes, páginas y enlaces externos que usa.
  await Promise.all(SOURCES.map(async src => {
    const r = await timed(fetcher, base + src, {}, 10000);
    if (!r.ok) return;
    const found = parseSource(await r.response.text().catch(() => ''));
    found.local.forEach(p => { let clean = p; try { clean = decodeURI(p); } catch {} assets.set(base + encodeURI(clean), src.slice(1)); });
    found.pages.forEach(p => linkedPages.add(p));
    found.external.forEach(u => external.add(u));
  }));
  linkedPages.forEach(p => { if (!PAGES.includes(p) && p !== '/index.html') assets.set(base + p, 'enlaces internos'); });

  const assetList = [...assets.entries()].slice(0, MAX_ASSETS);
  await mapLimit(assetList, 8, async ([url, from]) => {
    let r = await timed(fetcher, url, { method: 'HEAD' }, 8000);
    if (r.status === 405 || r.status === 403) r = await timed(fetcher, url, {}, 8000);
    let file = url.replace(base, '') || url; try { file = decodeURIComponent(file); } catch {}
    if (!r.ok) {
      hallazgos.push(finding('error', 'enlaces', `asset:${file}`, `Archivo roto: ${file}`, `${r.status ? `Responde ${r.status}` : 'No responde'} y se usa en ${from}.`, url));
      return;
    }
    const size = Number(r.response.headers.get('content-length')) || 0;
    if (/\.(png|jpe?g|gif)$/i.test(url) && size > BIG_IMAGE) {
      hallazgos.push(finding('mejora', 'rendimiento', `heavy:${file}`, `Imagen pesada: ${file.split('/').pop()}`, `Pesa ${(size / 1024 / 1024).toFixed(1)} MB. Exportarla en WebP o comprimirla a menos de 300 KB haría la web más rápida en el móvil.`, url));
    }
  });
  await mapLimit([...external].slice(0, MAX_EXTERNAL), 5, async url => {
    let r = await timed(fetcher, url, { method: 'HEAD' }, 7000);
    if (!r.ok && r.status !== 0) r = await timed(fetcher, url, {}, 7000);
    // Muchas redes sociales bloquean robots (403/429/999): solo se marca lo que claramente no existe.
    if ([404, 410].includes(r.status)) hallazgos.push(finding('error', 'enlaces', `ext:${url}`, 'Enlace externo roto', `${url} responde ${r.status}.`, url));
  });

  if (home) {
    const h = home.headers;
    const missing = [['content-security-policy', 'Content-Security-Policy'], ['x-content-type-options', 'X-Content-Type-Options'], ['referrer-policy', 'Referrer-Policy'], ['x-frame-options', 'X-Frame-Options']]
      .filter(([k]) => !h.get(k)).map(([, label]) => label);
    if (missing.length) hallazgos.push(finding('mejora', 'seguridad', 'headers', 'Faltan cabeceras de seguridad', `No se envían: ${missing.join(', ')}. Se añaden en vercel.json y protegen contra ataques comunes.`, base + '/'));
    if (home.info.devReact) hallazgos.push(finding('mejora', 'rendimiento', 'react-dev', 'La web usa la versión de desarrollo de React', 'index.html carga react.development.js, más pesada y lenta. Cambiarla por react.production.min.js acelera la carga.', base + '/'));
    if (home.info.babelInBrowser) hallazgos.push(finding('mejora', 'rendimiento', 'babel-browser', 'El código se compila en el navegador de cada visitante', 'Babel convierte los archivos .jsx en cada visita, lo que retrasa la primera carga, sobre todo en móviles. Compilar una vez al desplegar (por ejemplo con Vite) eliminaría ese tiempo.', base + '/'));
  }
  return { hallazgos, paginas };
}

async function checkApis(base, fetcher) {
  const hallazgos = [];
  const brief = await timed(fetcher, base + '/api/brief', {}, 10000);
  if (brief.status !== 405) hallazgos.push(finding('error', 'formularios', 'api:brief', 'El envío de briefs no responde bien', `La función /api/brief respondió ${brief.status || 'sin respuesta'}; los clientes podrían no poder enviar solicitudes.`, base + '/api/brief'));
  const agent = await timed(fetcher, base + '/api/agent', {}, 10000);
  if (agent.status !== 405) hallazgos.push(finding('error', 'agentes', 'api:agent', 'La API de los agentes no responde', `/api/agent respondió ${agent.status || 'sin respuesta'}.`, base + '/api/agent'));
  const rate = await timed(fetcher, base + '/api/payment-rate', {}, 15000);
  if (!rate.ok) {
    const body = rate.response ? await rate.response.json().catch(() => ({})) : {};
    // 'date' significa que el BCV aún no publicó la tasa del día (normal en fines de semana).
    if (body.error !== 'date') hallazgos.push(finding('aviso', 'formularios', 'api:rate', 'No se pudo leer la tasa del BCV', 'Los clientes no verán el importe en bolívares al pagar; se les ofrece confirmarlo por WhatsApp. Suele ser temporal si la web del BCV falla.', base + '/api/payment-rate'));
  }
  return hallazgos;
}

// Comprueba que Marta, Camilo y Teo estén procesando las solicitudes.
async function checkAgents(env, fetcher) {
  if (!supabaseReady(env)) return [];
  const since = new Date(now() - 3 * 864e5).toISOString();
  const rows = await sbRest(env, `solicitudes?select=id,brand,created_at,ai,diseno,contenido&created_at=gte.${since}`, {}, fetcher).catch(() => null);
  if (!rows) return [finding('aviso', 'agentes', 'db', 'No pude leer las solicitudes', 'Supabase no respondió a la consulta de solicitudes.')];
  const old = r => now() - new Date(r.created_at).getTime() > 10 * 60000;
  const stale = d => d?.estado === 'generando' && now() - new Date(d.desde || 0).getTime() > 10 * 60000;
  const out = [];
  const noAi = rows.filter(r => !r.ai?.resumen && old(r));
  if (noAi.length) out.push(finding('aviso', 'agentes', 'agents:marta', `Marta no analizó ${noAi.length === 1 ? '1 solicitud' : `${noAi.length} solicitudes`}`, `Sin análisis: ${noAi.map(r => r.brand).join(', ')}. Puedes pulsar «Analizar de nuevo» en su ficha.`));
  const badDesign = rows.filter(r => r.diseno?.estado === 'error' || stale(r.diseno));
  if (badDesign.length) out.push(finding('aviso', 'agentes', 'agents:camilo', 'Camilo no terminó algunas propuestas', `Revisar: ${badDesign.map(r => r.brand).join(', ')}.`));
  const badContent = rows.filter(r => r.contenido?.estado === 'error' || stale(r.contenido));
  if (badContent.length) out.push(finding('aviso', 'agentes', 'agents:teo', 'Teo no terminó algunas propuestas', `Revisar: ${badContent.map(r => r.brand).join(', ')}.`));
  return out;
}

// PageSpeed Insights de Google: puntuaciones y principales oportunidades (versión móvil).
async function checkPageSpeed(env, base, fetcher) {
  const params = new URLSearchParams({ url: base + '/', strategy: 'mobile' });
  ['performance', 'accessibility', 'seo', 'best-practices'].forEach(c => params.append('category', c));
  if (env.PAGESPEED_API_KEY?.trim()) params.set('key', env.PAGESPEED_API_KEY.trim());
  const r = await timed(fetcher, `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {}, 40000);
  if (!r.ok) {
    const detail = r.response ? await r.response.json().then(d => d?.error?.message || '', () => '') : r.error;
    console.error('Vega: PageSpeed', r.status, detail);
    return { metricas: null, hallazgos: [], error: `${r.status || r.error}${detail ? ` ${String(detail).slice(0, 160)}` : ''}` };
  }
  const data = await r.response.json().catch(() => null);
  const lh = data?.lighthouseResult;
  if (!lh?.categories) return { metricas: null, hallazgos: [] };
  const score = k => (lh.categories[k]?.score == null ? null : Math.round(lh.categories[k].score * 100));
  const audit = k => lh.audits?.[k]?.displayValue || null;
  const metricas = {
    rendimiento: score('performance'), accesibilidad: score('accessibility'), seo: score('seo'), buenas_practicas: score('best-practices'),
    lcp: audit('largest-contentful-paint'), cls: audit('cumulative-layout-shift'), tbt: audit('total-blocking-time'), fcp: audit('first-contentful-paint')
  };
  const hallazgos = [];
  const labels = { performance: 'rendimiento', accessibility: 'accesibilidad', seo: 'seo', 'best-practices': 'buenas prácticas' };
  for (const [key, cat] of Object.entries(lh.categories)) {
    if (cat.score != null && cat.score < 0.9) {
      const refs = (cat.auditRefs || []).filter(a => a.weight > 0 || key === 'performance')
        .map(a => lh.audits?.[a.id] && { ...lh.audits[a.id], id: a.id }).filter(a => a && a.score != null && a.score < 0.9 && a.title)
        .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0)).slice(0, 4);
      refs.forEach(a => hallazgos.push(finding('mejora', labels[key] === 'buenas prácticas' ? 'seguridad' : labels[key], `psi:${a.id}`,
        a.title, `${a.displayValue ? a.displayValue + '. ' : ''}PageSpeed (${labels[key]}: ${Math.round(cat.score * 100)}/100).`, base + '/')));
    }
  }
  return { metricas, hallazgos };
}

export function summarizeState(hallazgos) {
  if (hallazgos.some(h => h.tipo === 'error')) return 'problemas';
  if (hallazgos.some(h => h.tipo === 'aviso')) return 'avisos';
  return 'ok';
}

function reportForAi(report) {
  const lines = [`Revisión ${report.modo} del ${new Date(report.created_at || now()).toISOString().slice(0, 16).replace('T', ' ')} UTC. Estado: ${report.estado}.`];
  if (report.metricas?.pagespeed) {
    const m = report.metricas.pagespeed;
    lines.push(`PageSpeed móvil: rendimiento ${m.rendimiento}, accesibilidad ${m.accesibilidad}, SEO ${m.seo}, buenas prácticas ${m.buenas_practicas}; LCP ${m.lcp}, TBT ${m.tbt}, CLS ${m.cls}.`);
  }
  if (report.metricas?.paginas) lines.push('Páginas: ' + report.metricas.paginas.map(p => `${p.path} ${p.status} en ${p.ms} ms`).join('; ') + '.');
  lines.push('Hallazgos:');
  for (const h of report.hallazgos || []) lines.push(`- [${h.tipo}/${h.area}] ${h.titulo}: ${h.detalle}`);
  if (!(report.hallazgos || []).length) lines.push('- Ninguno.');
  return lines.join('\n');
}

export async function writeSummary(env, report, fetcher = fetch) {
  return aiChat(env, {
    system: VEGA, maxTokens: 1400,
    messages: [{ role: 'user', content: `Resume para Luis qué hay que arreglar y qué conviene mejorar en la web, en tres apartados: «Arreglar ya», «Mejorar pronto» e «Ideas». Máximo 3 puntos por apartado; si un apartado no tiene nada, dilo en una línea. Termina con una frase sobre el estado general.\n\n<revision>\n${reportForAi(report)}\n</revision>` }]
  }, fetcher);
}

export async function chatWithVega(env, { message, history = [], report }, fetcher = fetch) {
  const turns = history.filter(m => m && (m.from === 'me' || m.from === 'agent') && typeof m.text === 'string').slice(-10)
    .map(m => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text.slice(0, 2000) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const messages = [];
  for (const t of [...turns, { role: 'user', content: message.slice(0, 2000) }]) {
    if (messages.length && messages.at(-1).role === t.role) messages.at(-1).content += `\n\n${t.content}`;
    else messages.push({ ...t });
  }
  const context = report ? reportForAi(report) : 'Todavía no hay revisiones guardadas.';
  return aiChat(env, { system: `${VEGA}\n\nEstás hablando con Luis en su panel. Datos de la última revisión:\n${context}`, messages, maxTokens: 1200 }, fetcher);
}

export async function latestReports(env, limit = 2, fetcher = fetch) {
  return await sbRest(env, `monitor_reports?select=*&order=created_at.desc&limit=${limit}`, {}, fetcher) || [];
}

function telegramProblems(base, nuevos, link) {
  return [`🛠️ Vega encontró ${nuevos.length === 1 ? 'un problema nuevo' : `${nuevos.length} problemas nuevos`} en ${base.replace(/^https?:\/\//, '')}`, '',
    ...nuevos.slice(0, 8).map(h => `• ${h.titulo}: ${h.detalle}`), nuevos.length > 8 ? `… y ${nuevos.length - 8} más.` : '', '', link].filter(x => x !== '').join('\n');
}
function telegramResolved(resueltos) {
  return [`✅ Vega: ${resueltos.length === 1 ? 'se resolvió un problema' : `se resolvieron ${resueltos.length} problemas`}`, ...resueltos.slice(0, 8).map(h => `• ${h.titulo}`)].join('\n');
}

// Revisión completa o rápida. «completo» añade PageSpeed y el resumen con IA.
export async function runMonitor(env, { base, modo = 'rapido', notify = true } = {}, fetcher = fetch) {
  const started = now();
  base = (env.SITE_URL?.trim() || base).replace(/\/$/, '');
  const [site, apis, agents, psi] = await Promise.all([
    checkSite(base, fetcher), checkApis(base, fetcher), checkAgents(env, fetcher),
    modo === 'completo' ? checkPageSpeed(env, base, fetcher).catch(() => ({ metricas: null, hallazgos: [] })) : null
  ]);
  const hallazgos = [...site.hallazgos, ...apis, ...agents, ...(psi?.hallazgos || [])];
  const order = { error: 0, aviso: 1, mejora: 2 };
  hallazgos.sort((a, b) => order[a.tipo] - order[b.tipo]);
  const report = {
    modo, estado: summarizeState(hallazgos), duracion_ms: now() - started, hallazgos,
    metricas: { paginas: site.paginas.sort((a, b) => PAGES.indexOf(a.path) - PAGES.indexOf(b.path)), ...(psi?.metricas ? { pagespeed: psi.metricas } : {}), ...(psi?.error ? { pagespeed_error: psi.error } : {}) },
    resumen: null, visto: false
  };
  if (!supabaseReady(env)) return report;
  const [previous] = await latestReports(env, 1, fetcher).catch(() => []);
  // Si una revisión rápida no trae PageSpeed, conserva el último dato para mostrarlo.
  if (!report.metricas.pagespeed && previous?.metricas?.pagespeed) report.metricas.pagespeed = previous.metricas.pagespeed;
  const lastFull = modo === 'completo' ? (await sbRest(env, 'monitor_reports?select=hallazgos&modo=eq.completo&order=created_at.desc&limit=1', {}, fetcher).catch(() => []))?.[0] : null;
  if (modo === 'completo' && aiReady(env)) report.resumen = await writeSummary(env, report, fetcher).catch(error => { console.error('Vega: resumen', error.message); return null; });

  // Problemas nuevos y resueltos respecto a la revisión anterior (errores y avisos).
  const serious = list => (list || []).filter(h => h.tipo !== 'mejora');
  const prevIds = new Set(serious(previous?.hallazgos).map(h => h.id));
  const nowIds = new Set(serious(hallazgos).map(h => h.id));
  const nuevos = serious(hallazgos).filter(h => !prevIds.has(h.id));
  const resueltos = serious(previous?.hallazgos).filter(h => !nowIds.has(h.id));
  report.visto = !nuevos.length && previous ? previous.visto : !nuevos.length && report.estado === 'ok';

  const saved = await sbRest(env, 'monitor_reports', { method: 'POST', body: JSON.stringify(report), headers: { Prefer: 'return=representation' } }, fetcher).catch(error => { console.error('Vega: guardar', error.message); return null; });
  const link = `${base}/admin.html`;
  if (notify) {
    try {
      if (nuevos.length) await sendTelegram(env, telegramProblems(base, nuevos, link), fetcher);
      if (resueltos.length && previous) await sendTelegram(env, telegramResolved(resueltos), fetcher);
      // Resumen diario solo si cambió algo desde la última revisión completa.
      const prevFull = new Set((lastFull?.hallazgos || []).map(h => h.id));
      if (modo === 'completo' && report.resumen && (!lastFull || hallazgos.some(h => !prevFull.has(h.id)))) {
        await sendTelegram(env, `📋 Resumen de Vega sobre la web\n\n${report.resumen}\n\n${link}`, fetcher);
      }
    } catch (error) { console.error('Vega: Telegram', error.message); }
  }
  // Conserva 30 días de historial.
  await sbRest(env, `monitor_reports?created_at=lt.${new Date(now() - 30 * 864e5).toISOString()}`, { method: 'DELETE' }, fetcher).catch(() => {});
  return Array.isArray(saved) && saved[0] ? saved[0] : report;
}

// Ruta programada: POST /api/monitor?modo=rapido|completo con Authorization: Bearer MONITOR_SECRET.
export async function handleMonitor(request, { env = process.env, fetcher = fetch } = {}) {
  if (!['GET', 'POST'].includes(request.method)) return Response.json({ error: 'method' }, { status: 405 });
  const secret = env.MONITOR_SECRET?.trim();
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!secret || token !== secret) return Response.json({ error: 'auth' }, { status: 401 });
  const url = new URL(request.url);
  const modo = url.searchParams.get('modo') === 'completo' ? 'completo' : 'rapido';
  await afterResponse(() => runMonitor(env, { base: url.origin, modo }, fetcher));
  return Response.json({ started: true, modo }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
