-- ============================================================
-- ROLE 'financeiro' — responsável por aprovar pagamento dos pedidos
-- (mover para "Pagamento Parcial" / "Pagamento Aprovado"). Tem controle
-- total da SITUAÇÃO do pedido, mas NÃO cadastra entregas.
--
-- Idempotente. Rode DEPOIS de 0022/0024, no SQL Editor do Supabase.
-- ============================================================

-- 1. Constraint de role: adiciona 'financeiro'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'superadmin', 'admin', 'vendedor', 'entregador', 'financeiro'));

-- 2. Leitura de PEDIDOS: financeiro enxerga todos os pedidos (como admin), para
--    operar o Kanban. Recria a policy existente somando 'financeiro' à lista.
--    (A conta_restritiva de 0020 continua recortando por conta_id do usuário.)
drop policy if exists "Admin e entregador leem todos pedidos" on public.vhsys_pedidos;
create policy "Admin e entregador leem todos pedidos"
  on public.vhsys_pedidos for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) in ('admin', 'superadmin', 'entregador', 'financeiro')
  );

-- Observação: financeiro NÃO precisa de policy em vhsys_orcamentos nem entregas
-- (não opera essas telas). vhsys_situacoes / vhsys_pedidos_financeiro (view) /
-- vhsys_clientes já são legíveis por qualquer autenticado.
-- ============================================================
