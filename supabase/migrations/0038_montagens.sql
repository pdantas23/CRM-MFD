-- ============================================================
-- MONTAGENS — acompanhamento dos montadores (2026-10-29)
--
-- 1. Role 'montador': vê SÓ os serviços em que é o responsável (aba Montagens),
--    sem o valor cobrado do cliente. Não acessa as demais telas.
-- 2. montagem_servicos: serviço de montagem vinculado a um pedido (opcional),
--    com a obra (endereço, cidade, UF), valor cobrado do cliente, valor a pagar
--    ao montador e as datas previstas × reais (o status sai das datas).
-- 3. montagem_pagamentos: pagamentos ao montador (vários por serviço), com
--    anexo opcional (comprovante/recibo/NF) no bucket PRIVADO 'anexos-montagem'.
--
-- RLS ligado e SEM policies: leitura e escrita só pelo service role, em server
-- actions que checam o papel (admin/superadmin/financeiro/montador).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- 1. Role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'superadmin', 'admin', 'vendedor', 'entregador', 'financeiro', 'montador'));

-- 2. Serviços
create table if not exists public.montagem_servicos (
  id              uuid primary key default gen_random_uuid(),
  conta_id        uuid references public.accounts (id) on delete set null,
  pedido_id       uuid references public.vhsys_pedidos (id) on delete set null,
  pedido_numero   bigint,                 -- nº do pedido (cópia: sobrevive a exclusões no VHSYS)
  cliente_nome    text,
  montador_id     uuid references public.profiles (id) on delete set null,
  descricao       text,
  endereco        text,
  cidade          text,
  uf              text,
  valor_cobrado   numeric(14,2),          -- cobrado do cliente pela montagem
  valor_montador  numeric(14,2),          -- a pagar ao montador
  inicio_previsto date,
  fim_previsto    date,
  inicio_real     date,
  fim_real        date,
  obs             text,
  criado_em       timestamptz not null default now(),
  criado_por      uuid references auth.users (id) on delete set null,
  atualizado_em   timestamptz not null default now()
);

create index if not exists montagem_servicos_montador_idx on public.montagem_servicos (montador_id);
create index if not exists montagem_servicos_pedido_idx on public.montagem_servicos (pedido_id);

-- 3. Pagamentos ao montador
create table if not exists public.montagem_pagamentos (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid not null references public.montagem_servicos (id) on delete cascade,
  data        date not null,
  valor       numeric(14,2) not null check (valor > 0),
  obs         text,
  anexo_path  text,                       -- caminho no bucket anexos-montagem
  anexo_nome  text,
  criado_em   timestamptz not null default now(),
  criado_por  uuid references auth.users (id) on delete set null
);

create index if not exists montagem_pagamentos_servico_idx on public.montagem_pagamentos (servico_id);

alter table public.montagem_servicos enable row level security;
alter table public.montagem_pagamentos enable row level security;

-- 4. Bucket privado dos comprovantes (acesso só por URL assinada do servidor).
insert into storage.buckets (id, name, public)
values ('anexos-montagem', 'anexos-montagem', false)
on conflict (id) do update set public = false;

-- Recarrega o cache de schema da API (PostgREST).
notify pgrst, 'reload schema';
