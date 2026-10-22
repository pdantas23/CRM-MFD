-- ============================================================
-- PRECIFICAÇÃO — CONTROLE DE ALTERAÇÕES NÃO ENVIADAS (2026-10-22)
--
-- alterado_em = última alteração de precificação feita no CRM (edição na aba
-- Produtos ou custo vindo de nota de entrada). O botão "Enviar alterados"
-- envia só os produtos com alterado_em posterior ao último envio
-- (enviado_vhsys_em). A carga inicial fica com null (não conta como alterada).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

alter table public.precificacao_produtos
  add column if not exists alterado_em timestamptz;

-- Recarrega o cache de schema da API (PostgREST) para enxergar a coluna nova.
notify pgrst, 'reload schema';
