// Imagen de vista previa al compartir la web (WhatsApp, redes, Google).
// Sirve la que Luis sube desde la oficina (bucket público «web», og/compartir.jpg);
// si todavía no hay ninguna, usa la imagen por defecto del repositorio.
const OG_PATH = 'og/compartir.jpg';
const FALLBACK = '/assets/Candy%20conos%20brand.jpg';

export async function handleOgImage(request, { env = process.env, fetcher = fetch } = {}) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 });
  const fallback = () => Response.redirect(new URL(FALLBACK, request.url), 302);
  const base = env.SUPABASE_URL?.trim().replace(/\/$/, '');
  if (!base) return fallback();
  try {
    const response = await fetcher(`${base}/storage/v1/object/public/web/${OG_PATH}`, { signal: AbortSignal.timeout(8000) });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !/^image\/(jpeg|png|webp)/.test(type)) return fallback();
    const body = request.method === 'HEAD' ? null : await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': type,
        // Corto en el navegador y en Vercel para que un cambio se vea en pocos minutos.
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return fallback();
  }
}

export default { fetch: request => handleOgImage(request) };
