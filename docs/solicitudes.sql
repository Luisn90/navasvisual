-- Tabla de solicitudes para Marta, la agente comercial del admin.
-- Pégalo en Supabase → SQL Editor → New query y pulsa Run.
-- ANTES de ejecutarlo, cambia TU_CORREO_DEL_ADMIN por el correo con el que entras al admin
-- (aparece 3 veces, abajo).

create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'nueva'
    check (status in ('nueva', 'revision', 'propuesta', 'aceptada', 'descartada')),
  service text not null,
  service_name text not null,
  tier text not null,
  price numeric not null,
  name text not null,
  email text not null,
  brand text not null,
  data jsonb not null default '{}'::jsonb,
  files jsonb not null default '[]'::jsonb,
  ai jsonb,
  ai_at timestamptz
);

create index if not exists solicitudes_created_at_idx on public.solicitudes (created_at desc);

-- Solo tu cuenta del admin puede leer y actualizar. La web guarda las solicitudes
-- desde el servidor con la clave de servicio, que no pasa por estas reglas.
alter table public.solicitudes enable row level security;

drop policy if exists "admin lee solicitudes" on public.solicitudes;
create policy "admin lee solicitudes" on public.solicitudes
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));

drop policy if exists "admin actualiza solicitudes" on public.solicitudes;
create policy "admin actualiza solicitudes" on public.solicitudes
  for update to authenticated
  using (lower(auth.jwt() ->> 'email') = lower('TU_CORREO_DEL_ADMIN'))
  with check (lower(auth.jwt() ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));

-- Avisos en tiempo real en la oficina (si falla porque ya está añadida, puedes ignorarlo).
alter publication supabase_realtime add table public.solicitudes;

-- Camilo, el agente de diseño: propuestas visuales e imágenes privadas.
alter table public.solicitudes add column if not exists diseno jsonb;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('disenos', 'disenos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Teo, el creador de contenido: propuesta para los briefs de Redes.
alter table public.solicitudes add column if not exists contenido jsonb;

-- Vega, el monitor técnico: historial de revisiones de la web.
create table if not exists public.monitor_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  modo text not null check (modo in ('rapido', 'completo')),
  estado text not null check (estado in ('ok', 'avisos', 'problemas')),
  duracion_ms integer,
  hallazgos jsonb not null default '[]'::jsonb,
  metricas jsonb not null default '{}'::jsonb,
  resumen text,
  visto boolean not null default false
);
create index if not exists monitor_reports_created_at_idx on public.monitor_reports (created_at desc);
alter table public.monitor_reports enable row level security;
create policy "admin lee revisiones" on public.monitor_reports for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
create policy "admin marca revisiones" on public.monitor_reports for update to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'))
  with check (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
alter publication supabase_realtime add table public.monitor_reports;

-- Programación de Vega con pg_cron + pg_net. Usa la misma clave que MONITOR_SECRET en Vercel,
-- guardada en Vault: select vault.create_secret('LA_CLAVE', 'vega_monitor_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('vega-rapido', '*/30 * * * *', $$
  select net.http_post(
    url := 'https://navasvisual.com/api/monitor?modo=rapido',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'vega_monitor_secret')),
    timeout_milliseconds := 10000)
$$);
select cron.schedule('vega-completo', '0 12 * * *', $$
  select net.http_post(
    url := 'https://navasvisual.com/api/monitor?modo=completo',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'vega_monitor_secret')),
    timeout_milliseconds := 10000)
$$);

-- Informes de la tarea programada de Claude que arregla lo que encuentra Vega.
create table if not exists public.monitor_fixes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  resumen text,
  arreglados jsonb not null default '[]'::jsonb,
  pendientes jsonb not null default '[]'::jsonb,
  notificado boolean not null default false
);
create index if not exists monitor_fixes_created_at_idx on public.monitor_fixes (created_at desc);
alter table public.monitor_fixes enable row level security;
create policy "admin lee arreglos" on public.monitor_fixes for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
alter publication supabase_realtime add table public.monitor_fixes;

-- Cambios para la web: imagen al compartir y pedidos de Luis para Claude.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('web', 'web', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "admin sube imagenes web" on storage.objects for insert to authenticated
  with check (bucket_id = 'web' and lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
create policy "admin reemplaza imagenes web" on storage.objects for update to authenticated
  using (bucket_id = 'web' and lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'))
  with check (bucket_id = 'web' and lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
create policy "admin ve imagenes web" on storage.objects for select to authenticated
  using (bucket_id = 'web' and lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
create table if not exists public.cambios_web (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  texto text not null check (char_length(texto) between 3 and 2000),
  imagen_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'hecho', 'en_revision', 'no_posible')),
  respuesta text,
  pr_url text,
  resuelto_at timestamptz
);
create index if not exists cambios_web_created_at_idx on public.cambios_web (created_at desc);
alter table public.cambios_web enable row level security;
create policy "admin lee cambios" on public.cambios_web for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));
create policy "admin pide cambios" on public.cambios_web for insert to authenticated
  with check (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN') and estado = 'pendiente');
alter publication supabase_realtime add table public.cambios_web;

-- Encargos desde el chat de Vega y aprobaciones de Luis.
alter table public.cambios_web add column if not exists origen text not null default 'luis';
alter table public.cambios_web add column if not exists aprobado_at timestamptz;
alter table public.cambios_web drop constraint if exists cambios_web_estado_check;
alter table public.cambios_web add constraint cambios_web_estado_check
  check (estado in ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'hecho', 'no_posible', 'descartado'));
alter table public.cambios_web drop constraint if exists cambios_web_origen_check;
alter table public.cambios_web add constraint cambios_web_origen_check check (origen in ('luis', 'vega', 'chat'));
create policy "admin aprueba cambios" on public.cambios_web for update to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN') and estado = 'en_revision')
  with check (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN') and estado in ('aprobado', 'rechazado'));
