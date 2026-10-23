-- ============================================================
-- PRECIFICAÇÃO — NOVO SIGNIFICADO DO CRÉDITO DE ICMS VAZIO (2026-10-23)
--
-- A aplicação passou a calcular o DIFAL assim (src/lib/produtos/precificacao.ts):
--   credito_icms null → sem DIFAL (compra interna)
--   credito_icms ≥ 0  → (ICMS atual − crédito) × custo (0% = cheio, 22,5%)
-- (A base dupla chegou a ser adotada e foi revertida; o nome do arquivo ficou.)
-- Antes era o contrário (null = cheio; 0 = interno). Os produtos marcados
-- com 0% eram compras internas: passam para null para continuar sem DIFAL.
--
-- NÃO é idempotente em relação a dados digitados DEPOIS do deploy (um 0%
-- novo significa "DIFAL cheio"): rode UMA vez, junto com o deploy desta versão.
-- ============================================================

update public.precificacao_produtos
set credito_icms = null, atualizado_em = now()
where credito_icms = 0;
