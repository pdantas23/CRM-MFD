-- Tabela de contas VHSYS (multi-conta). Cada linha = uma conta VHSYS de uma
-- empresa (ex.: matriz e filial). Credenciais cifradas com APP_MASTER_KEY
-- (AES-256-GCM) — NUNCA em texto plano. Idempotente.

create extension if not exists "pgcrypto";

create table if not exists public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  nome_empresa        text,
  theme_color         text not null default '#1a73e8',
  api_base            text not null default 'https://api.vhsys.com/v2',
  access_token_enc    text not null,
  secret_token_enc    text not null,
  ativo               boolean not null default true,
  nome_sync_em        timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists accounts_ativo_idx on public.accounts (ativo);

-- RLS: a tabela guarda segredos. Habilitamos RLS SEM policies para clientes
-- anon/authenticated → ninguém lê via API pública. O acesso é exclusivo do
-- service role (createAdminClient), que ignora RLS.
alter table public.accounts enable row level security;
