-- ============================================================
-- FIX/FEATURE: ordenação manual das entregas pelo admin no dashboard
-- ============================================================
-- Adiciona coluna `ordem` para permitir que admins reordenem
-- entregas dentro de cada (data, periodo). Valores menores
-- aparecem primeiro; null vai pro fim.
-- ============================================================

alter table public.entregas
  add column if not exists ordem integer;

create index if not exists entregas_data_periodo_ordem_idx
  on public.entregas (data, periodo, ordem nulls last, created_at);
