-- Presupuestos personalizados: Luis los prepara en la oficina y el cliente los ve y acepta en
-- navasvisual.com/presupuesto.html?p=<token>. La web los guarda y lee desde el servidor con la
-- clave de servicio; la oficina solo puede leerlos (para la lista).
create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviado', 'aceptado', 'rechazado')),
  lang text not null default 'es' check (lang in ('es', 'en')),
  cliente_nombre text not null,
  cliente_email text not null,
  marca text not null default '',
  titulo text not null,
  intro text not null default '',
  conceptos jsonb not null default '[]'::jsonb,
  entregables jsonb not null default '[]'::jsonb,
  plazo text not null default '',
  rondas integer not null default 2 check (rondas between 0 and 10),
  rondas_extra text not null default '',
  anticipo integer not null default 50 check (anticipo between 0 and 100),
  metodos jsonb not null default '[]'::jsonb,
  validez_dias integer not null default 15 check (validez_dias between 1 and 90),
  notas text not null default '',
  total numeric not null default 0,
  solicitud_id uuid references public.solicitudes(id) on delete set null,
  enviado_at timestamptz,
  visto_at timestamptz,
  aceptado_at timestamptz,
  rechazado_at timestamptz,
  motivo_rechazo text
);
create index if not exists presupuestos_created_at_idx on public.presupuestos (created_at desc);

alter table public.presupuestos enable row level security;
drop policy if exists "admin lee presupuestos" on public.presupuestos;
create policy "admin lee presupuestos" on public.presupuestos for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower('TU_CORREO_DEL_ADMIN'));

-- Avisos en tiempo real en la oficina cuando un cliente abre o acepta un presupuesto.
alter publication supabase_realtime add table public.presupuestos;
