-- ============================================================
-- ENTREGAS — MARCAR COMO ENTREGUE (baixa de entrega)
-- Aplicado manualmente no Supabase SQL Editor (como as demais migrations).
--
-- FLUXO: o admin marca cada entrega como "entregue" (estado de controle,
-- SEPARADO do tipo final/parcial). Ao marcar:
--   - entrega FINAL   (status='entrega_final')   → pedido vai p/ ENTREGUE (777)
--   - entrega PARCIAL (status='entrega_parcial')  → pedido vai p/ ENTREGA_PARCIAL (1180)
-- A movimentação do pedido no VHSYS é feita pela server action
-- marcarEntregaEntregue (src/lib/entregas/acoes.ts); aqui só guardamos o estado.
--
-- Métricas (src/lib/crm/metricas.ts):
--   - Atrasadas  = entregue_em IS NULL E data < hoje (INDEPENDE de final/parcial)
--   - Concluídas = entregue_em preenchido
--   - Pendentes  = entregue_em IS NULL E data >= hoje
--
-- Idempotente (add column if not exists / create index if not exists).
-- ============================================================

alter table public.entregas add column if not exists entregue_em timestamptz;
alter table public.entregas add column if not exists entregue_por uuid references auth.users;

-- Índice parcial para a métrica de não-realizadas (atrasadas/pendentes).
create index if not exists entregas_nao_entregues_idx
  on public.entregas (data) where entregue_em is null;
