-- ============================================================
-- PRECOMPUTAÇÃO DO VÍNCULO CONTA→PEDIDO (pedido_resolvido) (2026-06-12)
-- Rodar no Supabase SQL Editor.
--
-- PROBLEMA: a view vhsys_pedidos_financeiro (vhsys_notas_fiscais.sql) junta
-- pedidos a um CTE por COALESCE(c.pedido_id_vhsys, nf.pedido_id_vhsys) = p.id_vhsys.
-- Esse COALESCE no predicado do join é não-indexável → Nested Loop de ~10,9M
-- linhas → a RPC pedidos_metricas leva ~28s e estoura o statement_timeout.
--
-- SOLUÇÃO (opção ①): precomputar o vínculo numa coluna indexada
-- pedido_resolvido em vhsys_contas_receber e reescrever a view com um join
-- direto e indexável. A reconciliação é feita por uma função (fonte única da
-- verdade), chamada no backfill e pós-loop no sync.
--
-- Idempotente (add column if not exists / create or replace / create index if not exists if
-- not exists) e reversível (bloco de rollback comentado no fim).
-- ============================================================

-- 1. Coluna precomputada
alter table public.vhsys_contas_receber add column if not exists pedido_resolvido bigint;

-- 2. Função de reconciliação = FONTE ÚNICA da verdade.
--    O backfill (passo 3) e o sync (sync.ts) CHAMAM esta função; o cálculo do
--    pedido_resolvido NÃO é duplicado em lugar nenhum.
--    UPDATE puro SEM cláusula WHERE de guarda, para garantir paridade absoluta
--    backfill ≡ função (o usuário priorizou fonte única acima de micro-otimização).
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
      where nf.id_vhsys = c.nfe_id_vhsys and nf.lixeira = false)
  );
$$;

revoke all on function public.reconciliar_pedido_resolvido() from anon, authenticated;
grant execute on function public.reconciliar_pedido_resolvido() to service_role;

-- 3. Backfill = chamar a função (fonte única).
select public.reconciliar_pedido_resolvido();

-- 4. Índice parcial (só linhas vinculadas e não-lixeira, que é o que a view lê).
create index if not exists idx_contas_receber_pedido_resolvido
  on public.vhsys_contas_receber (pedido_resolvido)
  where pedido_resolvido is not null and lixeira = false;

-- 5. View reescrita — MESMO contract, join direto e indexável, security_invoker
--    explícito. Saída idêntica à versão anterior (mesmos nomes/tipos):
--    pedido_id, numero, valor_total_pedido, total_contas, recebido, saldo, divergente.
create or replace view public.vhsys_pedidos_financeiro
with (security_invoker = true) as
select
  p.id as pedido_id,
  p.numero,
  p.valor_total as valor_total_pedido,
  coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
  coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
  coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
  (count(c.id) > 0 and coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente
from public.vhsys_pedidos p
left join public.vhsys_contas_receber c
  on c.pedido_resolvido = p.id_vhsys and c.lixeira = false
group by p.id, p.numero, p.valor_total;

-- ============================================================
-- ROLLBACK (descomente o bloco abaixo para reverter):
-- ============================================================
-- -- 5'. Recria a view antiga (CTE com COALESCE — original de vhsys_notas_fiscais.sql):
-- create or replace view public.vhsys_pedidos_financeiro
-- with (security_invoker = true) as
-- with contas_resolvidas as (
--   select
--     c.valor,
--     c.valor_pago,
--     coalesce(c.pedido_id_vhsys, nf.pedido_id_vhsys) as pedido_resolvido
--   from public.vhsys_contas_receber c
--   left join public.vhsys_notas_fiscais nf
--     on nf.id_vhsys = c.nfe_id_vhsys and nf.lixeira = false
--   where c.lixeira = false
-- )
-- select
--   p.id as pedido_id,
--   p.numero,
--   p.valor_total as valor_total_pedido,
--   coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
--   coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
--   coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
--   (count(c.pedido_resolvido) > 0
--     and coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente
-- from public.vhsys_pedidos p
-- left join contas_resolvidas c
--   on c.pedido_resolvido = p.id_vhsys
-- group by p.id, p.numero, p.valor_total;
--
-- -- 4'. Remove o índice:
-- drop index if exists idx_contas_receber_pedido_resolvido;
--
-- -- 2'. Remove a função:
-- drop function if exists public.reconciliar_pedido_resolvido();
--
-- -- 1'. Remove a coluna:
-- alter table public.vhsys_contas_receber drop column if exists pedido_resolvido;
