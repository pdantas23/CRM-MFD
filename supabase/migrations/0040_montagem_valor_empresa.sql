-- ============================================================
-- MONTAGENS — valor do serviço e valor da empresa (2026-10-29)
--
-- Os valores passam a ser dois campos DIGITADOS (nada puxado do pedido):
--   valor_cobrado  = valor do serviço (total)
--   valor_montador = valor do montador (saldo devedor a ele, abatido pelos pagamentos)
--   valor_empresa  = serviço − montador (calculado pela aplicação ao salvar)
--
-- Idempotente. Rode no SQL Editor do Supabase (depois da 0039).
-- ============================================================

alter table public.montagem_servicos
  add column if not exists valor_empresa numeric(14,2);

notify pgrst, 'reload schema';
