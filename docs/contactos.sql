-- Mensajes de los formularios /solicitar y Contacto. Los guarda el servidor (clave de servicio)
-- y solo la cuenta del admin puede leerlos (función es_admin, ver seguridad.sql).
create table if not exists public.contactos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('wizard', 'contacto')),
  status text not null default 'nuevo' check (status in ('nuevo', 'respondido', 'archivado')),
  lang text,
  name text not null,
  email text not null,
  phone text,
  prefer text,
  company text,
  service text,
  message text,
  details jsonb not null default '[]'::jsonb
);
create index if not exists contactos_created_at_idx on public.contactos (created_at desc);

alter table public.contactos enable row level security;
revoke all on public.contactos from anon, authenticated;
grant select, update (status) on public.contactos to authenticated;

drop policy if exists "admin lee contactos" on public.contactos;
create policy "admin lee contactos" on public.contactos
  for select to authenticated using ((select public.es_admin()));
drop policy if exists "admin actualiza contactos" on public.contactos;
create policy "admin actualiza contactos" on public.contactos
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

do $$ begin
  alter publication supabase_realtime add table public.contactos;
exception when others then null; end $$;
