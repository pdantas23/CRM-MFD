-- ============================================================
-- ÍNDICES DE PERFORMANCE — Ciclo B (Orçamentos) + Ciclo C (Pedidos)
-- NÃO aplicar automaticamente — executar manualmente no Supabase SQL Editor.
-- Requer pg_trgm habilitado (CREATE EXTENSION IF NOT EXISTS pg_trgm).
-- ============================================================

-- Habilita extensão pg_trgm (necessária para índices GIN trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── vhsys_orcamentos ────────────────────────────────────────────────────────

-- Busca por nome_cliente (trigram para ilike %texto%)
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_nome_cliente_trgm_idx
  ON public.vhsys_orcamentos USING gin (nome_cliente gin_trgm_ops);

-- Busca por vendedor_nome (trigram)
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_vendedor_nome_trgm_idx
  ON public.vhsys_orcamentos USING gin (vendedor_nome gin_trgm_ops);

-- Filtro de data (ORDER BY + range)
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_data_orcamento_idx
  ON public.vhsys_orcamentos (data_orcamento DESC);

-- Filtro de situação
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_situacao_id_idx
  ON public.vhsys_orcamentos (situacao_id);

-- Filtro de vendedor
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_vendedor_id_idx
  ON public.vhsys_orcamentos (vendedor_id_vhsys);

-- Filtro pedido_emitido
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_pedido_emitido_idx
  ON public.vhsys_orcamentos (pedido_emitido);

-- Validade (ordenação/filtro)
CREATE INDEX IF NOT EXISTS vhsys_orcamentos_validade_idx
  ON public.vhsys_orcamentos (validade DESC);

-- ── vhsys_pedidos ───────────────────────────────────────────────────────────

-- Filtro composto situação + data (Kanban por coluna ordenado por data)
CREATE INDEX IF NOT EXISTS vhsys_pedidos_situacao_data_idx
  ON public.vhsys_pedidos (situacao_id, data_pedido DESC);

-- Busca por nome_cliente (trigram)
CREATE INDEX IF NOT EXISTS vhsys_pedidos_nome_cliente_trgm_idx
  ON public.vhsys_pedidos USING gin (nome_cliente gin_trgm_ops);

-- Busca por vendedor_nome (trigram)
CREATE INDEX IF NOT EXISTS vhsys_pedidos_vendedor_nome_trgm_idx
  ON public.vhsys_pedidos USING gin (vendedor_nome gin_trgm_ops);
