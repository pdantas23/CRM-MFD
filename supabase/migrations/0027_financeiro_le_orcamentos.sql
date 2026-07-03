-- ============================================================
-- LEITURA de ORÇAMENTOS para o role 'financeiro'.
-- O financeiro passou a ter acesso de LEITURA às telas de Orçamentos e
-- Entregas (sem poder alterar). Entregas já são lidas via service role na
-- página, mas Orçamentos usam o client do usuário (RLS) — então a 0025 (que
-- só abriu vhsys_pedidos) deixava o Kanban de orçamentos vazio para ele.
--
-- Aqui somamos 'financeiro' à policy de SELECT de vhsys_orcamentos, igual ao
-- que a 0025 fez com vhsys_pedidos. A escrita continua bloqueada: as server
-- actions de orçamento exigem admin/vendedor (não financeiro).
--
-- Idempotente. Rode DEPOIS de 0025, no SQL Editor do Supabase.
-- ============================================================

drop policy if exists "Admin e entregador leem todos orcamentos" on public.vhsys_orcamentos;
create policy "Admin e entregador leem todos orcamentos"
  on public.vhsys_orcamentos for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) in ('admin', 'superadmin', 'entregador', 'financeiro')
  );
-- ============================================================
