-- ============================================================
-- SEÇÕES de negócio por fornecedor (2026-07-30)
--
-- A tela "Fornecedores" passa a agrupar por seção: Drywall, Piso Vinílico e
-- Solução Acústica (+ "Outros" para os sem seção). Um fornecedor
-- (fornecedor_produto_id do VHSYS — único POR CONTA) pode estar em 1+ seções.
-- Aqui só guardamos a associação; os fornecedores em si continuam derivados de
-- vhsys_produtos. secoes é um array de chaves: 'drywall' | 'piso_vinilico' |
-- 'solucao_acustica' (validado na aplicação).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.fornecedor_secoes (
  conta_id       uuid   not null references public.accounts (id) on delete cascade,
  fornecedor_id  bigint not null,
  secoes         text[] not null default '{}',
  atualizado_em  timestamptz not null default now(),
  primary key (conta_id, fornecedor_id)
);

-- RLS: leitura escopada à conta do usuário (mesmo padrão das tabelas vhsys).
-- A ESCRITA é feita só por server action com service role (createAdminClient),
-- então não há policy de insert/update — clientes normais não escrevem.
alter table public.fornecedor_secoes enable row level security;

drop policy if exists "Usuarios leem secoes da sua conta" on public.fornecedor_secoes;
create policy "Usuarios leem secoes da sua conta"
  on public.fornecedor_secoes for select
  using (
    public.conta_id_do_usuario(auth.uid()) is null
    or conta_id = public.conta_id_do_usuario(auth.uid())
  );
