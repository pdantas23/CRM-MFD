-- ============================================================
-- MONTAGENS — montador digitado (2026-10-29)
--
-- O responsável pelo serviço pode ser só um NOME digitado (montador sem
-- usuário no CRM). montador_id continua sendo o vínculo com o usuário de papel
-- 'montador' (é ele que dá acesso ao montador); montador_nome guarda o nome
-- quando não há vínculo.
--
-- Idempotente. Rode no SQL Editor do Supabase (depois da 0038).
-- ============================================================

alter table public.montagem_servicos
  add column if not exists montador_nome text;

notify pgrst, 'reload schema';
