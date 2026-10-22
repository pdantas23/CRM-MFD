-- ============================================================
-- PRECIFICAÇÃO — NOME EDITÁVEL PELO CRM (2026-10-22)
--
-- O modal do produto (aba Produtos) permite renomear o produto. O nome novo
-- fica em `nome` até ser enviado ao VHSYS (desc_produto); depois do envio
-- confirmado volta a null e vale o nome do espelho (vhsys_produtos.descricao).
-- null = sem alteração pendente.
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

alter table public.precificacao_produtos
  add column if not exists nome text;
