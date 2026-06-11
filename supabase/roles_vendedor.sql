-- ============================================================
-- CONTROLE DE ACESSO — PARTE SEGURA (rodável já)
-- Adiciona o role 'vendedor' e o vínculo profile → vendedor VHSYS.
--
-- ⚠️ Ordem: rodar DEPOIS de vhsys_espelho_catalogos.sql (a FK de
-- vendedor_id aponta para vhsys_vendedores.id_vhsys).
--
-- As policies RESTRITIVAS de pedidos/orçamentos/entregas NÃO estão
-- aqui — ver docs/vhsys/ARQUITETURA.md §Controle de acesso. Só ativar
-- quando existir pelo menos um admin mapeado (guardrail anti-lockout).
-- ============================================================

-- 1. Role 'vendedor'
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'vendedor', 'entregador'));

-- 2. Vínculo com o vendedor do VHSYS (null = sem vínculo; obrigatório
--    apenas para roles 'vendedor' — validado na aplicação)
alter table public.profiles
  add column vendedor_id bigint references public.vhsys_vendedores (id_vhsys);

create index profiles_vendedor_id_idx on public.profiles (vendedor_id);

-- 3. Admin gerencia profiles (a criação de usuário em si acontece via
--    service role no servidor — Auth Admin API; o trigger
--    handle_new_user cria o profile)
create policy "Admin atualiza profiles"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- Helper para as futuras policies restritivas: vendedor_id do usuário
create or replace function public.vendedor_id_do_usuario(uid uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select vendedor_id from public.profiles where id = uid;
$$;

grant execute on function public.vendedor_id_do_usuario(uuid) to authenticated;
