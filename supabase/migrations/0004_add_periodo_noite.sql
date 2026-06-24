-- Aplicado manualmente no Supabase SQL Editor (como as demais migrations do projeto).
-- Adiciona o turno "noite" ao CHECK de entregas.periodo (antes só manha/tarde).
alter table public.entregas drop constraint if exists entregas_periodo_check;
alter table public.entregas add constraint entregas_periodo_check
  check (periodo in ('manha', 'tarde', 'noite'));