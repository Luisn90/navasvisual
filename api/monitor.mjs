import { handleMonitor } from './_monitor.mjs';

// Revisión periódica de Vega (la llama Supabase pg_cron con MONITOR_SECRET).
export default { fetch: request => handleMonitor(request) };
