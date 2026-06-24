-- ============================================================
-- ESPELHO VHSYS — NÚCLEO: situações, pedidos, orçamentos,
-- contas a receber + FK entregas→pedido + view financeira.
-- Rode no Supabase SQL Editor DEPOIS de vhsys_espelho_catalogos.sql.
-- Schemas ancorados nas respostas reais (docs/vhsys/raw/exemplos/).
-- RLS restritivo por vendedor NÃO está aqui (guardrail anti-lockout)
-- — leitura autenticada aberta até existir admin mapeado.
-- ============================================================

-- 1. SITUAÇÕES (GET /situacoes — Kanban dinâmico por id + ordem)
create table if not exists public.vhsys_situacoes (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_situacao
  entidade text not null check (entidade in ('pedidos', 'orcamentos', 'ordem_servico')),
  nome text not null,                       -- nome_situacao (encoding corrigido)
  tipo_status text not null,                -- enum-base (NÃO usar p/ gate/ordem)
  ordem integer not null,
  lixeira boolean not null default false,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_situacoes_entidade_ordem_idx on public.vhsys_situacoes (entidade, ordem);

-- 2. PEDIDOS
create table if not exists public.vhsys_pedidos (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_ped (PK p/ sub-recursos da API)
  numero bigint not null,                   -- id_pedido (sequencial exibível; liga contas a receber)
  cliente_id_vhsys bigint,                  -- id_cliente
  nome_cliente text not null,
  vendedor_id_vhsys bigint,                 -- vendedor_pedido_id (RLS futuro)
  vendedor_nome text,
  valor_total numeric(14,2),                -- valor_total_nota
  frete numeric(14,2),
  desconto numeric(14,2),
  situacao_id bigint,                       -- campo `situacao` (null/0 em pedidos legados)
  status_base text,                         -- status_pedido (enum-base)
  origem_situacao text not null default 'vhsys' check (origem_situacao in ('vhsys', 'legado')),
  data_pedido date,
  prazo_entrega text,
  referencia text,
  obs text,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  lixeira boolean not null default false,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_pedidos_numero_idx on public.vhsys_pedidos (numero);
create index if not exists vhsys_pedidos_situacao_idx on public.vhsys_pedidos (situacao_id);
create index if not exists vhsys_pedidos_vendedor_idx on public.vhsys_pedidos (vendedor_id_vhsys);
create index if not exists vhsys_pedidos_cliente_idx on public.vhsys_pedidos (cliente_id_vhsys);
create index if not exists vhsys_pedidos_data_mod_idx on public.vhsys_pedidos (data_mod_vhsys desc);

-- 3. ORÇAMENTOS
create table if not exists public.vhsys_orcamentos (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_orcamento
  numero bigint not null,                   -- id_pedido ("ID sequência orçamento")
  cliente_id_vhsys bigint,
  nome_cliente text not null,
  vendedor_id_vhsys bigint,                 -- vendedor_pedido_id (RLS futuro)
  vendedor_nome text,
  valor_total numeric(14,2),
  situacao_id bigint,
  status_base text,
  origem_situacao text not null default 'vhsys' check (origem_situacao in ('vhsys', 'legado')),
  pedido_emitido boolean not null default false,
  data_orcamento date,                      -- data_pedido
  validade date,                            -- validade_orcamento
  referencia text,
  obs text,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  lixeira boolean not null default false,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_orcamentos_numero_idx on public.vhsys_orcamentos (numero);
create index if not exists vhsys_orcamentos_situacao_idx on public.vhsys_orcamentos (situacao_id);
create index if not exists vhsys_orcamentos_vendedor_idx on public.vhsys_orcamentos (vendedor_id_vhsys);
create index if not exists vhsys_orcamentos_data_mod_idx on public.vhsys_orcamentos (data_mod_vhsys desc);

-- 4. CONTAS A RECEBER (display-only; vínculo: id_registro = pedidos.numero)
create table if not exists public.vhsys_contas_receber (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_conta_rec
  pedido_numero bigint,                     -- id_registro (= vhsys_pedidos.numero)
  identificacao text,                       -- "Ped_..." / "NFe_..." (auditoria do vínculo)
  nome_conta text,
  categoria text,                           -- categoria_rec
  cliente_nome text,                        -- nome_cliente
  valor numeric(14,2) not null default 0,        -- valor_rec
  valor_pago numeric(14,2) not null default 0,
  vencimento date,                          -- vencimento_rec
  liquidado boolean not null default false, -- liquidado_rec (NÃO usar p/ saldo — só aritmética)
  situacao_texto text,                      -- situacao ("Conta Liquidada.")
  data_pagamento date,
  data_emissao date,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  lixeira boolean not null default false,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index if not exists vhsys_contas_receber_pedido_idx on public.vhsys_contas_receber (pedido_numero);
create index if not exists vhsys_contas_receber_data_mod_idx on public.vhsys_contas_receber (data_mod_vhsys desc);

-- 5. FK ENTREGA → PEDIDO (exigida pelo RLS futuro do vendedor)
alter table public.entregas
  add column if not exists pedido_id uuid references public.vhsys_pedidos (id);

create index if not exists entregas_pedido_id_idx on public.entregas (pedido_id);

-- 6. VIEW FINANCEIRA POR PEDIDO (Total/Recebido/Saldo — aritmético)
create or replace view public.vhsys_pedidos_financeiro
with (security_invoker = true) as
select
  p.id as pedido_id,
  p.numero,
  p.valor_total as valor_total_pedido,
  coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
  coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
  coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
  -- sinaliza Σ valor_rec ≠ valor_total do pedido (contas faltando/extras)
  (coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente
from public.vhsys_pedidos p
left join public.vhsys_contas_receber c
  on c.pedido_numero = p.numero and c.lixeira = false
group by p.id, p.numero, p.valor_total;

-- 7. RLS — leitura autenticada aberta (restritivo fica p/ rls_restritivo.sql)
alter table public.vhsys_situacoes enable row level security;
alter table public.vhsys_pedidos enable row level security;
alter table public.vhsys_orcamentos enable row level security;
alter table public.vhsys_contas_receber enable row level security;

drop policy if exists "Autenticados leem situacoes" on public.vhsys_situacoes;
create policy "Autenticados leem situacoes" on public.vhsys_situacoes for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem pedidos" on public.vhsys_pedidos;
create policy "Autenticados leem pedidos" on public.vhsys_pedidos for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem orcamentos" on public.vhsys_orcamentos;
create policy "Autenticados leem orcamentos" on public.vhsys_orcamentos for select using (auth.role() = 'authenticated');
drop policy if exists "Autenticados leem contas receber" on public.vhsys_contas_receber;
create policy "Autenticados leem contas receber" on public.vhsys_contas_receber for select using (auth.role() = 'authenticated');
