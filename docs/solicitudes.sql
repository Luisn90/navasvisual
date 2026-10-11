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
