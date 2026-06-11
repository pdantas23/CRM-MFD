-- ============================================================
-- ESPELHO DE NF-e + RESOLUÇÃO CONTA→NOTA→PEDIDO (2026-06-11)
-- Rode no Supabase SQL Editor DEPOIS de vhsys_vinculo_contas_fix.sql.
--
-- Cadeia validada em produção (read-only):
--   conta.identificacao "NFe_<id_venda>" → nota fiscal (id_venda)
--   nota.id_pedido_ref = id_ped (PK) do pedido de origem
-- Fecha a lacuna de saldo dos pedidos faturados por NF-e.
-- ============================================================

-- 1. NOTAS FISCAIS
create table public.vhsys_notas_fiscais (
  id uuid primary key default gen_random_uuid(),
  id_vhsys bigint not null unique,          -- id_venda (PK da NF-e; casa com NFe_<id> das contas)
  numero bigint,                            -- id_pedido (número sequencial da NF, "NFe Venda N")
  pedido_id_vhsys bigint,                   -- id_pedido_ref (id_ped do pedido de origem; 0/null = NF avulsa)
  cliente_id_vhsys bigint,
  nome_cliente text,
  valor_total numeric(14,2),
  nota_emitida boolean not null default false,
  status_base text,                         -- status_pedido
  data_emissao date,
  data_cad_vhsys timestamptz,
  data_mod_vhsys timestamptz,
  lixeira boolean not null default false,
  dados jsonb not null,
  sincronizado_em timestamptz not null default now()
);

create index vhsys_notas_fiscais_pedido_idx on public.vhsys_notas_fiscais (pedido_id_vhsys);

alter table public.vhsys_notas_fiscais enable row level security;
create policy "Autenticados leem notas fiscais"
  on public.vhsys_notas_fiscais for select using (auth.role() = 'authenticated');

-- 2. Coluna de vínculo conta→nota (extraída de identificacao "NFe_<id>")
alter table public.vhsys_contas_receber
  add column nfe_id_vhsys bigint;

create index vhsys_contas_receber_nfe_idx on public.vhsys_contas_receber (nfe_id_vhsys);

-- 3. View financeira: resolve o pedido direto (Ped_) ou via NF-e
create or replace view public.vhsys_pedidos_financeiro
with (security_invoker = true) as
with contas_resolvidas as (
  select
    c.valor,
    c.valor_pago,
    coalesce(c.pedido_id_vhsys, nf.pedido_id_vhsys) as pedido_resolvido
  from public.vhsys_contas_receber c
  left join public.vhsys_notas_fiscais nf
    on nf.id_vhsys = c.nfe_id_vhsys and nf.lixeira = false
  where c.lixeira = false
)
select
  p.id as pedido_id,
  p.numero,
  p.valor_total as valor_total_pedido,
  coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
  coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
  coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
  (count(c.pedido_resolvido) > 0
    and coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente
from public.vhsys_pedidos p
left join contas_resolvidas c
  on c.pedido_resolvido = p.id_vhsys
group by p.id, p.numero, p.valor_total;
