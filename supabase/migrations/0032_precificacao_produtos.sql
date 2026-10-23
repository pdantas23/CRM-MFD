-- ============================================================
-- PRECIFICAÇÃO DE PRODUTOS (2026-10-22)
--
-- Substitui a planilha "Produtos - Modular" e a calculadora de preço de venda
-- pela aba Produtos. Guarda as ENTRADAS da planilha por produto (custo, frete,
-- crédito de ICMS, taxas, valor de venda, seção); custo líquido, equilíbrio e
-- margem são calculados na aplicação (src/lib/produtos/precificacao.ts).
--
-- id_vhsys é anulável: linhas da planilha ainda sem cadastro no VHSYS ficam
-- guardadas sem vínculo. Ao salvar, a aplicação envia ao VHSYS:
--   valor_custo_produto = custo líquido; valor_produto = venda (ou equilíbrio).
--
-- Custos e margens são sensíveis: RLS ligado e SEM policies — só o service
-- role (server actions de admin) lê e escreve.
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.precificacao_produtos (
  id               uuid primary key default gen_random_uuid(),
  conta_id         uuid not null references public.accounts (id) on delete cascade,
  id_vhsys         bigint,
  produto          text not null,
  secao            text,
  preco_custo      numeric(14,4),
  frete            numeric(14,4),
  credito_icms     numeric(8,6),          -- null = interno (sem DIFAL); 0 ou mais = DIFAL em base dupla (ver 0037)
  custo_op         numeric(8,6) not null,
  comissao         numeric(8,6) not null,
  imposto_saida    numeric(8,6) not null,
  valor_venda      numeric(14,4),         -- null = sem margem definida (VHSYS recebe o equilíbrio)
  fornecedor       text,
  ultima_compra    date,
  enviado_vhsys_em timestamptz,
  erro_envio       text,
  atualizado_em    timestamptz not null default now(),
  atualizado_por   uuid references auth.users (id) on delete set null
);

create unique index if not exists precificacao_produtos_conta_vhsys_uidx
  on public.precificacao_produtos (conta_id, id_vhsys)
  where id_vhsys is not null;

create table if not exists public.precificacao_config (
  conta_id              uuid primary key references public.accounts (id) on delete cascade,
  icms_atual            numeric(8,6) not null default 0.225,
  custo_op_padrao       numeric(8,6) not null default 0.07,
  comissao_padrao       numeric(8,6) not null default 0.02,
  imposto_saida_padrao  numeric(8,6) not null default 0.0982,
  atualizado_em         timestamptz not null default now()
);

alter table public.precificacao_produtos enable row level security;
alter table public.precificacao_config enable row level security;

-- Parâmetros iniciais: ICMS atual 22,5% (PI); imposto de saída SA 9,82%, KCM 7,22%.
insert into public.precificacao_config (conta_id, imposto_saida_padrao)
select id, case slug when 'kcm' then 0.0722 else 0.0982 end
from public.accounts
on conflict (conta_id) do nothing;
