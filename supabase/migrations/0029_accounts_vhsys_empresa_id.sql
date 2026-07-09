-- ============================================================
-- id da EMPRESA no VHSYS por conta (2026-07-09)
--
-- O link público do orçamento (app.vhsys.com.br/public/preview/orcamento/...)
-- embute o id_empresa do VHSYS. Guardamos esse id por conta para gerar o link
-- (e o PDF oficial) sem uma chamada extra à API a cada download. O sync já lê
-- GET /empresas (atualizarNomeEmpresa) — agora também persiste o id aqui.
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

alter table public.accounts add column if not exists vhsys_empresa_id bigint;
