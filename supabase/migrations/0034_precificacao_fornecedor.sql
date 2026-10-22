-- ============================================================
-- PRECIFICAÇÃO — FORNECEDOR VINCULADO AO VHSYS (2026-10-22)
--
-- O fornecedor da aba Produtos passa a ser escolhido entre os fornecedores já
-- usados nos produtos do VHSYS da conta (vhsys_produtos.fornecedor_produto_id)
-- e é enviado ao VHSYS pelo ID — nunca pelo nome, para não criar divergência
-- nem duplicar fornecedor. null = mantém o fornecedor atual do VHSYS.
--
-- A coluna texto `fornecedor` (nomes curtos da planilha) fica só como legado.
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

alter table public.precificacao_produtos
  add column if not exists fornecedor_id bigint;
