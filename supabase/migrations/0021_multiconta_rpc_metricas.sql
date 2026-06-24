-- ============================================================
-- MULTI-CONTA — RPCs de métricas conta-aware.
-- Redefine orcamentos_metricas / pedidos_metricas adicionando p_conta_id.
-- Rode DEPOIS de rpc_metricas.sql e multiconta_espelho.sql. Idempotente.
--
-- p_conta_id ESCOPA a agregação à conta ativa. O chamador (metricas.ts) sempre
-- envia a conta ativa; default null mantém compatibilidade, mas null agrega
-- todas as contas — não usar null em produção multi-conta.
-- ============================================================

-- Derruba as assinaturas antigas (sem p_conta_id) para não deixar overloads.
drop function if exists public.orcamentos_metricas(text, bigint, bigint[], bigint, boolean, date, date);
drop function if exists public.pedidos_metricas(text, bigint, bigint[], bigint, boolean, boolean, date, date, date, date);

-- ── orcamentos_metricas (com p_conta_id) ────────────────────────────────────
create or replace function public.orcamentos_metricas(
  p_conta_id       uuid    default null,
  p_busca          text    default null,
  p_numero         bigint  default null,
  p_situacoes      bigint[] default null,
  p_vendedor_id    bigint  default null,
  p_pedido_emitido boolean default null,
  p_data_de        date    default null,
  p_data_ate       date    default null
)
returns table (
  n              bigint,
  valor_total    numeric,
  aprovados_n    bigint,
  aprovados_valor numeric,
  convertidos_n  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint                                                 as n,
    coalesce(sum(o.valor_total), 0)::numeric                        as valor_total,
    count(*) filter (where o.situacao_id = 768)::bigint             as aprovados_n,
    coalesce(sum(o.valor_total) filter (where o.situacao_id = 768), 0)::numeric
                                                                    as aprovados_valor,
    count(*) filter (where o.pedido_emitido = true)::bigint         as convertidos_n
  from public.vhsys_orcamentos o
  where o.lixeira = false
    and (p_conta_id is null or o.conta_id = p_conta_id)
    and (
      p_numero is not null
        and o.numero = p_numero
      or p_numero is null
        and (
          p_busca is null
          or o.nome_cliente ilike '%' || p_busca || '%'
          or o.vendedor_nome ilike '%' || p_busca || '%'
        )
    )
    and (p_situacoes is null or array_length(p_situacoes, 1) is null
         or o.situacao_id = any(p_situacoes))
    and (p_vendedor_id is null or o.vendedor_id_vhsys = p_vendedor_id)
    and (p_pedido_emitido is null or o.pedido_emitido = p_pedido_emitido)
    and (p_data_de is null or o.data_orcamento >= p_data_de)
    and (p_data_ate is null or o.data_orcamento <= p_data_ate);
$$;

-- ── pedidos_metricas (com p_conta_id) ───────────────────────────────────────
create or replace function public.pedidos_metricas(
  p_conta_id      uuid    default null,
  p_busca         text    default null,
  p_numero        bigint  default null,
  p_situacoes     bigint[] default null,
  p_vendedor_id   bigint  default null,
  p_ocultar_legado boolean default true,
  p_so_com_saldo  boolean default false,
  p_data_de       date    default null,
  p_data_ate      date    default null,
  p_sit_de        date    default null,
  p_sit_ate       date    default null
)
returns table (
  n           bigint,
  valor_total numeric,
  recebido    numeric,
  saldo       numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with situacoes_efetivas as (
    select case
      when p_situacoes is null or array_length(p_situacoes, 1) is null
        then array[858, 1179, 857, 859, 1180, 777]::bigint[]
      else p_situacoes
    end as ids
  ),
  filtrados as (
    select
      p.valor_total,
      coalesce(fin.recebido, 0) as recebido,
      coalesce(fin.saldo, 0)    as saldo
    from public.vhsys_pedidos p
    left join public.vhsys_pedidos_financeiro fin
      on fin.numero = p.numero
      and fin.conta_id = p.conta_id
    where p.lixeira = false
      and (p_conta_id is null or p.conta_id = p_conta_id)
      and p.situacao_id = any(
        (select unnest(ids) from situacoes_efetivas)
      )
      and (p_ocultar_legado is not true or p.origem_situacao = 'vhsys')
      and (
        p_numero is not null
          and p.numero = p_numero
        or p_numero is null
          and (
            p_busca is null
            or p.nome_cliente ilike '%' || p_busca || '%'
            or p.vendedor_nome ilike '%' || p_busca || '%'
          )
      )
      and (p_vendedor_id is null or p.vendedor_id_vhsys = p_vendedor_id)
      and (p_data_de is null or p.data_pedido >= p_data_de)
      and (p_data_ate is null or p.data_pedido <= p_data_ate)
      and (p_sit_de is null or p.data_situacao >= p_sit_de)
      and (p_sit_ate is null or p.data_situacao <= p_sit_ate)
      and (p_so_com_saldo is not true or coalesce(fin.saldo, 0) > 0)
  )
  select
    count(*)::bigint                          as n,
    coalesce(sum(valor_total), 0)::numeric    as valor_total,
    coalesce(sum(recebido), 0)::numeric       as recebido,
    coalesce(sum(saldo), 0)::numeric          as saldo
  from filtrados;
$$;

-- Permissões
revoke all on function public.orcamentos_metricas(uuid, text, bigint, bigint[], bigint, boolean, date, date) from anon;
revoke all on function public.pedidos_metricas(uuid, text, bigint, bigint[], bigint, boolean, boolean, date, date, date, date) from anon;
grant execute on function public.orcamentos_metricas(uuid, text, bigint, bigint[], bigint, boolean, date, date) to authenticated;
grant execute on function public.pedidos_metricas(uuid, text, bigint, bigint[], bigint, boolean, boolean, date, date, date, date) to authenticated;
