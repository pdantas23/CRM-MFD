-- ============================================================
-- ESPELHO VHSYS — CATÁLOGOS (Fase 1 / Parte B)
-- Rode no Supabase SQL Editor.
-- Escopo aprovado: produtos, clientes, vendedores + estado de sync.
-- Pedidos/orçamentos/situações ficam para depois do checkpoint.
-- Schemas ancorados nas respostas reais (docs/vhsys/raw/exemplos/).
-- ============================================================

-- 1. PRODUTOS
create table if not exists public.vhsys_produtos (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_produto
  codigo text,                              -- cod_produto
  descricao text not null,                  -- desc_produto
  marca text,
  unidade text,
  valor numeric(14,4),
  valor_custo numeric(14,4),
  estoque numeric(14,4),
  tipo text,                                -- tipo_produto (Produto/Serviço)
  status text,                              -- status_produto (Ativo/Inativo)
  lixeira boolean not null default false,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  dados jsonb not null,                     -- resposta crua da API
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_produtos_descricao_idx on public.vhsys_produtos using gin (to_tsvector('portuguese', descricao));
create index if not exists vhsys_produtos_lixeira_idx on public.vhsys_produtos (lixeira);

-- 2. CLIENTES
create table if not exists public.vhsys_clientes (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_cliente
  razao text not null,                      -- razao_cliente
  fantasia text,
  tipo_pessoa text,                         -- PF/PJ
  cnpj_cpf text,                            -- cnpj_cliente
  endereco text,
  numero text,
  bairro text,
  complemento text,
  cep text,
  cidade text,
  uf text,
  fone text,
  celular text,
  email text,
  situacao text,                            -- situacao_cliente (Ativo/Inativo)
  vendedor_id_vhsys bigint,                 -- vendedor_cliente_id
  lixeira boolean not null default false,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_clientes_razao_idx on public.vhsys_clientes (razao);
create index if not exists vhsys_clientes_cnpj_idx on public.vhsys_clientes (cnpj_cpf);
create index if not exists vhsys_clientes_lixeira_idx on public.vhsys_clientes (lixeira);

-- 3. VENDEDORES
create table if not exists public.vhsys_vendedores (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_vendedor
  nome text not null,                       -- razao_vendedor
  fantasia text,
  cnpj_cpf text,                            -- cnpj_vendedor
  fone text,
  celular text,
  email text,
  situacao text,                            -- situacao_vendedor
  lixeira boolean not null default false,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

-- 4. ESTADO DO SYNC (cursor incremental por entidade)
create table if not exists public.vhsys_sync_estado (
  entidade text primary key,                -- 'produtos' | 'clientes' | 'vendedores'
  ultima_sync_em timestamptz,               -- cursor para data_modificacao
  ultima_reconciliacao_em timestamptz,      -- última varredura completa
  ultimo_resultado jsonb                    -- contadores/erros da última execução
);

-- 5. RLS — leitura para autenticados; escrita só via service role (bypassa RLS)
alter table public.vhsys_produtos enable row level security;
alter table public.vhsys_clientes enable row level security;
alter table public.vhsys_vendedores enable row level security;
alter table public.vhsys_sync_estado enable row level security;

drop policy if exists "Autenticados leem produtos" on public.vhsys_produtos;
create policy "Autenticados leem produtos" on public.vhsys_produtos for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem clientes" on public.vhsys_clientes;
create policy "Autenticados leem clientes" on public.vhsys_clientes for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem vendedores" on public.vhsys_vendedores;
create policy "Autenticados leem vendedores" on public.vhsys_vendedores for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem sync estado" on public.vhsys_sync_estado;
create policy "Autenticados leem sync estado" on public.vhsys_sync_estado for select using (auth.role() = 'authenticated');
