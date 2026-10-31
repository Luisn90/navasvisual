import './_seguro.mjs'; // escudo contra respuestas Brotli maliciosas (CVE-2026-111497)
import { handleMonitor } from './_monitor.mjs';

// Revisión periódica de Vega (la llama Supabase pg_cron con MONITOR_SECRET).
export default { fetch: request => handleMonitor(request) };
