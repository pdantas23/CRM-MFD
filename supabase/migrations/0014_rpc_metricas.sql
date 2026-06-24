-- Rodar manualmente no SQL Editor do Supabase
-- ============================================================
-- RPCs DE MÉTRICAS — agregação server-side de Orçamentos e Pedidos
-- (Parte A do plano de otimização de roundtrips).
--
-- Objetivo: substituir a varredura em lotes de 1000 + chunks de 200 da
-- camada TS (src/lib/crm/metricas.ts) por UMA chamada PostgREST que agrega
-- tudo no Postgres, eliminando o overhead fixo de cada roundtrip.
--
-- Predicados IDÊNTICOS aos de aplicarComuns/aplicarOrcamentos/aplicarPedidos.
-- Escopo RLS por aplicação: a página resolve vendedor (role "vendedor" →
-- p_vendedor_id = id do vendedor; admin → p_vendedor_id null ou filtro
-- selecionado). Estas functions NÃO reimplementam RLS — rodam como
-- SECURITY INVOKER, então as policies do chamador valem normalmente.
--
-- Escape de busca: a sanitização TS escapa % → \% e _ → \_. O parâmetro
-- chega aqui já com os backslashes; ILIKE padrão do Postgres trata \ como
-- caractere de escape default, então o predicado fica compatível sem ajuste.
-- O valor SEMPRE trafega como parâmetro (nunca concatenado/EXECUTE), evitando
-- injeção.
-- ============================================================

-- ── orcamentos_metricas ─────────────────────────────────────────────────────
-- Espelha aplicarComuns + aplicarOrcamentos de metricas.ts.
-- Busca: quando p_numero não-nulo, a página filtra SÓ por numero (igual ao
-- q.eq("numero", buscaNumero) — substitui o ilike, não soma). Quando p_busca
-- não-nulo e p_numero nulo, usa o OR de nome_cliente/vendedor_nome.
create or replace function public.orcamentos_metricas(
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
    -- Busca por número (exclusiva) OU por texto (nome_cliente/vendedor_nome).
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

-- ── pedidos_metricas ────────────────────────────────────────────────────────
-- Espelha aplicarComuns + aplicarPedidos de metricas.ts.
-- Situações default = COLUNAS_KANBAN de src/lib/vhsys/fluxo.ts
-- (858,1179,857,859,1180,777) — usadas quando p_situacoes é nulo/vazio,
-- para que as métricas batam com o que o Kanban exibe (exclui 778 Cancelado).
-- recebido/saldo agregam da view vhsys_pedidos_financeiro via LEFT JOIN por
-- numero (pedido sem contas conta 0). p_so_com_saldo restringe a saldo > 0
-- (afeta n e valor_total também). p_sit_de/p_sit_ate recortam por data_situacao
-- (filtro "Atualizadas em").
--
-- A assinatura ganhou p_sit_de/p_sit_ate: derruba a versão antiga (8 args) para
-- não deixar duas overloads e evitar ambiguidade na chamada PostgREST.
drop function if exists public.pedidos_metricas(text, bigint, bigint[], bigint, boolean, boolean, date, date);

create or replace function public.pedidos_metricas(
  p_busca         text    default null,
  p_numero        bigint  default null,
  p_situacoes     bigint[] default null,
  p_vendedor_id   bigint  default null,
  p_ocultar_legado boolean default true,
  p_so_com_saldo  boolean default false,
  p_data_de       date    default null,
  p_data_ate      date    default null,
  -- "Atualizadas em": recorte por data_situacao (independente de data_pedido).
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
    -- COLUNAS_KANBAN default quando p_situacoes nulo/vazio.
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
    where p.lixeira = false
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

-- ── Permissões ──────────────────────────────────────────────────────────────
revoke all on function public.orcamentos_metricas(text, bigint, bigint[], bigint, boolean, date, date) from anon;
revoke all on function public.pedidos_metricas(text, bigint, bigint[], bigint, boolean, boolean, date, date, date, date) from anon;
grant execute on function public.orcamentos_metricas(text, bigint, bigint[], bigint, boolean, date, date) to authenticated;
grant execute on function public.pedidos_metricas(text, bigint, bigint[], bigint, boolean, boolean, date, date, date, date) to authenticated;
