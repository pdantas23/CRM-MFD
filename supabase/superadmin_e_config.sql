-- ============================================================
-- SUPERADMIN + ABA CONFIGURAÇÕES
--
-- Cria o role 'superadmin' (acima de 'admin'). superadmin herda
-- TODA a visibilidade/poder de admin (a função is_admin passa a
-- considerar os dois) e ganha, no app, a aba Configurações para
-- gerenciar usuários.
--
-- COMO RODAR: cole tudo no Supabase SQL Editor e execute.
-- Seguro para re-execução (DROP … IF EXISTS / CREATE OR REPLACE).
--
-- PRÉ-REQUISITO: setup.sql, roles_vendedor.sql e
-- rls_vendedor_visibilidade.sql já aplicados.
-- ============================================================


-- 1. Constraint de role: adiciona 'superadmin'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('superadmin', 'admin', 'vendedor', 'entregador'));


-- 2. is_admin(uid): superadmin TAMBÉM é admin para efeito das policies.
-- Mantém a mesma assinatura/SECURITY DEFINER da versão de
-- fix_rls_recursion.sql; só amplia a condição de role.
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


-- 3. Policies de leitura ampla (admin/entregador) passam a incluir superadmin.
-- Reaproveita exatamente os nomes e o USING de rls_vendedor_visibilidade.sql,
-- apenas acrescentando 'superadmin' na lista de roles.

-- vhsys_orcamentos
drop policy if exists "Admin e entregador leem todos orcamentos" on public.vhsys_orcamentos;
create policy "Admin e entregador leem todos orcamentos"
  on public.vhsys_orcamentos for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) in ('admin', 'superadmin', 'entregador')
  );

-- vhsys_pedidos
drop policy if exists "Admin e entregador leem todos pedidos" on public.vhsys_pedidos;
create policy "Admin e entregador leem todos pedidos"
  on public.vhsys_pedidos for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) in ('admin', 'superadmin', 'entregador')
  );

-- entregas (SELECT amplo)
drop policy if exists "Admin e entregador veem todas entregas" on public.entregas;
create policy "Admin e entregador veem todas entregas"
  on public.entregas for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) in ('admin', 'superadmin', 'entregador')
  );


-- 4. Promove o usuário Sandro a superadmin.
-- ⚠️ AJUSTE o nome abaixo se o login do Sandro não for exatamente "sandro".
update public.profiles set role = 'superadmin' where lower(nome) = 'sandro';


-- ============================================================
-- FIM — rodar no SQL Editor do Supabase
-- ============================================================
