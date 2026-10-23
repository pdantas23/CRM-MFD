-- ============================================================
-- PRECIFICAÇÃO — DIFAL EM BASE DUPLA E NOVO SIGNIFICADO DO CRÉDITO (2026-10-23)
--
-- A aplicação passou a calcular o DIFAL assim (src/lib/produtos/precificacao.ts):
--   credito_icms null → sem DIFAL (compra interna)
--   credito_icms ≥ 0  → base dupla: (1 − crédito) ÷ (1 − ICMS) × ICMS − crédito
--                       (0% e ICMS 22,5% → 29,03% do custo)
-- Antes era o contrário (null = cheio; 0 = interno). Os produtos marcados
-- com 0% eram compras internas: passam para null para continuar sem DIFAL.
--
-- NÃO é idempotente em relação a dados digitados DEPOIS do deploy (um 0%
-- novo significa "DIFAL sem crédito"): rode UMA vez, junto com o deploy desta versão.
-- ============================================================

update public.precificacao_produtos
set credito_icms = null, atualizado_em = now()
where credito_icms = 0;
