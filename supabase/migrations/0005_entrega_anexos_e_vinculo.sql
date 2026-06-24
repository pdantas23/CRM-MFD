-- ============================================================
-- ENTREGAS — vínculo formal com orçamento + múltiplos anexos
-- NÃO aplicar automaticamente — executar manualmente no Supabase SQL Editor.
-- Idempotente: pode ser reexecutado sem efeitos colaterais.
-- ============================================================

-- 1. VÍNCULO FORMAL entrega → orçamento (espelho VHSYS)
-- Mantém a coluna textual numero_orcamento; orcamento_id é o vínculo confiável.
alter table public.entregas
  add column if not exists orcamento_id uuid references public.vhsys_orcamentos (id);

create index if not exists entregas_orcamento_id_idx
  on public.entregas (orcamento_id);

-- 2. MÚLTIPLOS ANEXOS por entrega.
-- As colunas legadas entregas.anexo_url / anexo_nome são mantidas intactas;
-- o app exibe a união (anexo legado + linhas desta tabela). Uploads novos
-- gravam apenas aqui. Arquivos seguem no bucket público 'anexos-entregas'.
create table if not exists public.entrega_anexos (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entregas (id) on delete cascade,
  url text not null,
  nome text not null,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create index if not exists entrega_anexos_entrega_id_idx
  on public.entrega_anexos (entrega_id);

alter table public.entrega_anexos enable row level security;

-- 3. RLS — espelha public.entregas (setup.sql): leitura para autenticados,
-- escrita só admin. DROP+CREATE porque CREATE POLICY não tem IF NOT EXISTS.
drop policy if exists "Autenticados leem anexos" on public.entrega_anexos;
create policy "Autenticados leem anexos"
  on public.entrega_anexos for select
  using (auth.role() = 'authenticated');

drop policy if exists "Só admin insere anexos" on public.entrega_anexos;
create policy "Só admin insere anexos"
  on public.entrega_anexos for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Só admin atualiza anexos" on public.entrega_anexos;
create policy "Só admin atualiza anexos"
  on public.entrega_anexos for update
  using (public.is_admin(auth.uid()));

drop policy if exists "Só admin deleta anexos" on public.entrega_anexos;
create policy "Só admin deleta anexos"
  on public.entrega_anexos for delete
  using (public.is_admin(auth.uid()));
