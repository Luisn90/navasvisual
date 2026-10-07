const SOURCE = 'https://www.bcv.org.ve/';
let cached = null;
function reply(status, body) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } }); }
function today(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function parseBcv(html) {
  const amount = html.match(/\bid=["']dolar["'][\s\S]{0,3000}?<strong\b[^>]*>([^<]+)<\/strong>/i)?.[1];
  const dateTag = html.match(/<span\b[^>]*\bclass=["'][^"']*date-display-single[^"']*["'][^>]*>/i)?.[0];
  const date = dateTag?.match(/\bcontent=["'](\d{4}-\d{2}-\d{2})T[^"']*["']/i)?.[1];
  const normalized = amount?.replace(/&nbsp;|\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) throw new Error('rate-format');
  const rate = Number(normalized);
  if (!date || !Number.isFinite(rate) || rate <= 0) throw new Error('rate-format');
  return { rate, date, source: SOURCE };
}
export async function handleRate(request, { fetcher = fetch, now = new Date() } = {}) {
  if (request.method !== 'GET') return reply(405, { error: 'method' });
  const day = today(now);
  if (cached && cached.date === day && now.getTime() - cached.savedAt < 900000) return reply(200, cached.quote);
  try {
    const response = await fetcher(SOURCE, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('source');
    const html = await response.text();
    const quote = parseBcv(html);
    // Never label a past or future quote as today's exchange rate.
    if (quote.date !== day) return reply(503, { error: 'date' });
    cached = { date: day, savedAt: now.getTime(), quote };
    return reply(200, quote);
  } catch { return reply(503, { error: 'unavailable' }); }
}
export default { fetch: request => handleRate(request) };
