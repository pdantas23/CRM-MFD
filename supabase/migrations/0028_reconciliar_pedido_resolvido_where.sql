-- ============================================================
-- CORREÇÃO: reconciliar_pedido_resolvido — UPDATE sem WHERE (2026-07-06)
--
-- PROBLEMA: a função (0011, redefinida conta-aware em 0020) faz um UPDATE puro
-- SEM cláusula WHERE. A proteção safeupdate do Postgres/Supabase rejeita isso
-- com "UPDATE requires a WHERE clause", então a RPC falha em toda rodada do
-- sync (logada como erro em sync.ts, não derruba o cron, mas o pedido_resolvido
-- de contas a receber vinculadas via NFe deixa de ser preenchido).
--
-- SOLUÇÃO: recria a função com um WHERE de guarda `is distinct from` que compara
-- o valor atual com o novo. Isso:
--   1. satisfaz a exigência de WHERE (some o erro);
--   2. mantém o RESULTADO idêntico ao UPDATE sem WHERE (paridade com o backfill
--      preservada — o valor final de cada linha é o mesmo);
--   3. de brinde, só escreve as linhas que realmente mudam (antes reescrevia a
--      tabela inteira a cada rodada).
-- `is distinct from` trata NULL corretamente (NULL vs valor, valor vs NULL).
--
-- Idempotente (create or replace) e reversível (rollback comentado no fim).
-- Rode no SQL Editor do Supabase, DEPOIS de 0020.
-- ============================================================

create or replace function public.reconciliar_pedido_resolvido()
returns void
language sql
security definer
set search_path = public
as $$
  update public.vhsys_contas_receber c
  set pedido_resolvido = coalesce(
    c.pedido_id_vhsys,
    (select nf.pedido_id_vhsys from public.vhsys_notas_fiscais nf
      where nf.id_vhsys = c.nfe_id_vhsys
        and nf.conta_id = c.conta_id
        and nf.lixeira = false)
  )
  where c.pedido_resolvido is distinct from coalesce(
    c.pedido_id_vhsys,
    (select nf.pedido_id_vhsys from public.vhsys_notas_fiscais nf
      where nf.id_vhsys = c.nfe_id_vhsys
        and nf.conta_id = c.conta_id
        and nf.lixeira = false)
  );
$$;

revoke all on function public.reconciliar_pedido_resolvido() from anon, authenticated;
grant execute on function public.reconciliar_pedido_resolvido() to service_role;

-- Backfill: reconcilia o que ficou pendente enquanto a RPC falhava.
select public.reconciliar_pedido_resolvido();

-- ============================================================
-- ROLLBACK (descomente para reverter à versão conta-aware de 0020,
-- que volta a falhar sob safeupdate):
-- ============================================================
-- create or replace function public.reconciliar_pedido_resolvido()
-- returns void
-- language sql
-- security definer
-- set search_path = public
-- as $$
--   update public.vhsys_contas_receber c
--   set pedido_resolvido = coalesce(
--     c.pedido_id_vhsys,
--     (select nf.pedido_id_vhsys from public.vhsys_notas_fiscais nf
--       where nf.id_vhsys = c.nfe_id_vhsys
--         and nf.conta_id = c.conta_id
--         and nf.lixeira = false)
--   );
-- $$;
-- revoke all on function public.reconciliar_pedido_resolvido() from anon, authenticated;
-- grant execute on function public.reconciliar_pedido_resolvido() to service_role;
