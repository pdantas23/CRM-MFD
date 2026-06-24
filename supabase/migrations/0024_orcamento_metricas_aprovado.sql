-- ============================================================
-- MULTI-CONTA — orcamentos_metricas com situação "Aprovado" data-driven.
-- Antes a RPC contava aprovados com `situacao_id = 768` (id fixo da conta SA).
-- Agora recebe p_aprovado_id (a app envia o id "Aprovado" da conta ativa,
-- derivado das situações sincronizadas). Idempotente. Rode DEPOIS de 0021.
-- ============================================================

drop function if exists public.orcamentos_metricas(uuid, text, bigint, bigint[], bigint, boolean, date, date);

create or replace function public.orcamentos_metricas(
  p_conta_id       uuid    default null,
  p_aprovado_id    bigint  default null,
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
    count(*) filter (where p_aprovado_id is not null and o.situacao_id = p_aprovado_id)::bigint
                                                                    as aprovados_n,
    coalesce(sum(o.valor_total) filter (where p_aprovado_id is not null and o.situacao_id = p_aprovado_id), 0)::numeric
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

revoke all on function public.orcamentos_metricas(uuid, bigint, text, bigint, bigint[], bigint, boolean, date, date) from anon;
grant execute on function public.orcamentos_metricas(uuid, bigint, text, bigint, bigint[], bigint, boolean, date, date) to authenticated;
