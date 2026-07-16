-- Rodar manualmente no SQL Editor do Supabase (idempotente).
-- ============================================================
-- COLUNAS fornecedor_produto / fornecedor_produto_id em vhsys_produtos —
-- usadas pela tela "Fornecedores" (agrupamento e filtro por fornecedor).
-- Já vêm em dados jsonb (fornecedor_produto: string, fornecedor_produto_id:
-- integer) — mesmo padrão de 0012_pedidos_data_situacao.sql.
-- ============================================================

-- 1. Colunas (idempotente).
alter table public.vhsys_produtos
  add column if not exists fornecedor_produto text,
  add column if not exists fornecedor_produto_id bigint;

-- 2. Backfill a partir do jsonb já sincronizado. Guarda regex para não
--    quebrar em valores inesperados (mesma cautela de 0012).
update public.vhsys_produtos
set
  fornecedor_produto = nullif(dados->>'fornecedor_produto', ''),
  fornecedor_produto_id = case
    when dados->>'fornecedor_produto_id' ~ '^\d+$'
      then (dados->>'fornecedor_produto_id')::bigint
    else null
  end
where fornecedor_produto_id is null;

-- 3. Índice parcial (só produtos ativos) para agrupar/filtrar por fornecedor
--    dentro da conta ativa.
create index if not exists vhsys_produtos_fornecedor_idx
  on public.vhsys_produtos (conta_id, fornecedor_produto_id)
  where lixeira = false;
