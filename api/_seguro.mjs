// Escudo contra CVE-2026-111497 («HTTP2Shell» / «Node2Shell», octubre 2026): una falla en el
// descompresor Brotli de Node.js permite tomar el control del servidor con una respuesta
// comprimida malformada. El firewall de Vercel protege lo que ENTRA, pero no las respuestas
// que nuestras funciones piden a otros servidores (BCV, Telegram, Resend, IA, enlaces de Vega).
//
// Este módulo envuelve fetch() una sola vez para todas las funciones:
//  1. Pide siempre las respuestas sin Brotli (solo gzip/deflate), así ningún servidor normal la envía.
//  2. Si aun así llega una respuesta Brotli, la descarta antes de leerla y da error.
// Además deja en los logs de Vercel la versión de Node.js, para comprobar si ya está parcheada.
export const VERSIONES_PARCHEADAS = { 22: [22, 23, 4], 24: [24, 22, 1], 26: [26, 12, 1] };

export function nodeParcheado(version = process.version) {
  const [mayor, menor, parche] = version.replace(/^v/, '').split('.').map(Number);
  const min = VERSIONES_PARCHEADAS[mayor];
  if (!min) return mayor > 26;
  return menor > min[1] || (menor === min[1] && parche >= min[2]);
}

export function envolverFetch(original) {
  if (!original || original.__nvSeguro) return original;
  const seguro = async (input, init = {}) => {
    const esRequest = typeof Request !== 'undefined' && input instanceof Request;
    const headers = new Headers(init.headers || (esRequest ? input.headers : undefined));
    headers.set('accept-encoding', 'gzip, deflate');
    const response = await original(input, { ...init, headers });
    const metodo = String(init.method || (esRequest ? input.method : 'GET')).toUpperCase();
    const codificacion = String(response.headers.get('content-encoding') || '').toLowerCase();
    if (metodo !== 'HEAD' && /(^|[\s,])br($|[\s,])/.test(codificacion)) {
      try { await response.body?.cancel(); } catch {}
      throw new TypeError('Respuesta comprimida con Brotli bloqueada por seguridad (CVE-2026-111497)');
    }
    return response;
  };
  seguro.__nvSeguro = true;
  return seguro;
}

if (globalThis.fetch && !globalThis.fetch.__nvSeguro) {
  globalThis.fetch = envolverFetch(globalThis.fetch);
  if (process.env.VERCEL) console.log(`[seguridad] node=${process.version} brotli=${process.versions.brotli || '?'} parcheado=${nodeParcheado() ? 'si' : 'NO'}`);
}
