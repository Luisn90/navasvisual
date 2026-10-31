-- Reglas de seguridad aplicadas el 31/10/2026 tras el aviso de un auditor externo.
-- (Ya están aplicadas en Supabase; este archivo documenta el estado.)
-- Antes: cualquier cuenta con sesión podía crear/editar/borrar proyectos e imágenes del portafolio.
-- Ahora: solo el correo del administrador. Reemplaza TU_CORREO_DEL_ADMIN si recreas el proyecto.

create or replace function public.es_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce(lower((select auth.jwt()) ->> 'email') = 'TU_CORREO_DEL_ADMIN', false); $$;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- projects: el público ve los publicados (public_select_published_projects); solo el admin ve todo y modifica.
create policy "admin ve todos los proyectos" on public.projects for select to authenticated using ((select public.es_admin()));
create policy "admin crea proyectos" on public.projects for insert to authenticated with check ((select public.es_admin()));
create policy "admin edita proyectos" on public.projects for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "admin borra proyectos" on public.projects for delete to authenticated using ((select public.es_admin()));

-- Bucket projects: lectura pública (public_read_projects_bucket), escritura solo admin.
create policy "admin sube imagenes proyectos" on storage.objects for insert to authenticated with check (bucket_id = 'projects' and (select public.es_admin()));
create policy "admin reemplaza imagenes proyectos" on storage.objects for update to authenticated using (bucket_id = 'projects' and (select public.es_admin())) with check (bucket_id = 'projects' and (select public.es_admin()));
create policy "admin borra imagenes proyectos" on storage.objects for delete to authenticated using (bucket_id = 'projects' and (select public.es_admin()));

-- Permisos mínimos (además de RLS).
revoke all on public.solicitudes, public.presupuestos, public.monitor_reports, public.monitor_fixes, public.cambios_web from anon;
revoke insert, update, delete, truncate, references, trigger on public.projects from anon;
revoke truncate, references, trigger on public.projects, public.solicitudes, public.presupuestos, public.monitor_reports, public.monitor_fixes, public.cambios_web from authenticated;
revoke delete on public.solicitudes, public.presupuestos, public.monitor_reports, public.monitor_fixes, public.cambios_web from authenticated;
revoke insert, update on public.presupuestos, public.monitor_fixes from authenticated;
revoke insert on public.solicitudes, public.monitor_reports from authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- En el panel de Supabase (no se hace con SQL):
-- Authentication → Sign In / Providers → «Allow new users to sign up» DESACTIVADO.
