-- Rodar manualmente no SQL Editor do Supabase (idempotente).
-- ============================================================
-- COLUNA data_situacao em vhsys_pedidos — data da ÚLTIMA mudança de
-- situação do pedido (não confundir com data_pedido = data de criação).
--
-- Origem do dado:
--   - API VHSYS expõe `data_status` (string YYYY-MM-DD) no histórico de
--     status do pedido; até agora só ficava dentro de `dados jsonb`.
--   - moverSituacaoPedido (CRM) grava aqui a data da mudança em runtime.
--   - O sync grava data_status quando presente; senão cai para
--     data_mod_vhsys::date / data_pedido (mesmo fallback do backfill).
--
-- Usado pelo filtro "Atualizadas em" (intervalo de datas) da tela de
-- Pedidos — recorta lista E métricas pela data da última mudança de
-- situação, independente do filtro de período (que usa data_pedido).
-- ============================================================

-- 1. Coluna (idempotente).
alter table public.vhsys_pedidos
  add column if not exists data_situacao date;

-- 2. Backfill dos registros ainda sem data_situacao.
--    Prioridade: data_status do jsonb → data_mod_vhsys → data_pedido.
--    O placeholder '0000-00-00' (e vazio) é tratado como ausente (NULL),
--    e a conversão é protegida para não quebrar com valores inválidos.
update public.vhsys_pedidos
set data_situacao = coalesce(
  case
    when nullif(dados->>'data_status', '') is null then null
    when dados->>'data_status' like '0000-00-00%' then null
    -- só converte quando casa o formato YYYY-MM-DD (evita erro de cast)
    when dados->>'data_status' ~ '^\d{4}-\d{2}-\d{2}' then (left(dados->>'data_status', 10))::date
    else null
  end,
  data_mod_vhsys::date,
  data_pedido
)
where data_situacao is null;

-- 3. Índice para o recorte por intervalo de datas.
create index if not exists vhsys_pedidos_data_situacao_idx
  on public.vhsys_pedidos (data_situacao);
