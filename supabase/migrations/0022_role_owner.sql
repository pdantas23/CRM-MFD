-- ============================================================
-- ROLE 'owner' — acesso SEPARADO de gerenciamento das contas VHSYS no CRM.
-- NÃO é superusuário operacional: não herda admin/superadmin e não acessa
-- pedidos/orçamentos/entregas. Idempotente. Rode DEPOIS de 0018.
-- ============================================================

-- 1. Constraint de role: adiciona 'owner'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'superadmin', 'admin', 'vendedor', 'entregador'));

-- 2. is_admin() reconhece admin e superadmin (superadmin herda admin nas policies
--    de profiles/entregas/storage). owner NÃO entra — não é acesso operacional.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'superadmin')
  );
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;
