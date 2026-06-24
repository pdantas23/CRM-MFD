-- ============================================================
-- FIX DO VÍNCULO CONTA↔PEDIDO (achado da validação de 2026-06-11)
-- Rode no Supabase SQL Editor DEPOIS de vhsys_espelho_nucleo.sql.
--
-- A validação com os 3.540 registros reais mostrou que id_registro
-- NÃO é o número do pedido (colisão entre origens; cliente conferia
-- em ~2%). O vínculo correto vem de:
--   identificacao "Ped_<id_ped>"  → PK do pedido (1963/1963 com
--                                    cliente conferido)
--   nome_conta   "Pedido <N>"     → número sequencial (idem)
-- Contas "NFe_..." e manuais ficam SEM vínculo por ora (lacuna
-- conhecida — resolução NF-e→pedido em fase futura).
-- ============================================================

-- 1. Colunas novas: valor cru + vínculo por PK
alter table public.vhsys_contas_receber
  add column if not exists id_registro bigint,           -- valor cru da API (sem semântica de vínculo)
  add column if not exists pedido_id_vhsys bigint;       -- id_ped extraído de identificacao "Ped_<id>"

comment on column public.vhsys_contas_receber.pedido_numero is
  'Número do pedido RESOLVIDO (extraído de nome_conta "Pedido N"); null = conta sem vínculo';

create index if not exists vhsys_contas_receber_pedido_pk_idx
  on public.vhsys_contas_receber (pedido_id_vhsys);

-- 2. Zera os vínculos antigos (estavam contaminados pelo id_registro)
update public.vhsys_contas_receber
set id_registro = pedido_numero, pedido_numero = null;

-- 3. View financeira: join pela PK; divergência só quando HÁ contas
create or replace view public.vhsys_pedidos_financeiro
with (security_invoker = true) as
select
  p.id as pedido_id,
  p.numero,
  p.valor_total as valor_total_pedido,
  coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
  coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
  coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
  -- sinaliza Σ valor_rec ≠ valor_total APENAS quando existem contas vinculadas
  (count(c.id) > 0 and coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente
from public.vhsys_pedidos p
left join public.vhsys_contas_receber c
  on c.pedido_id_vhsys = p.id_vhsys and c.lixeira = false
group by p.id, p.numero, p.valor_total;
