// Núcleo CRU (SEM cache) das "ondas" de carregamento do CRM.
//
// Estas funções são a extração 1:1 do que as páginas server montam inline.
// Objetivo: ter um único ponto de verdade chamado tanto pelos `page.tsx`
// (envoltos em `comCache`) quanto pelos testes de performance (chamados
// CRUS, sem cache — senão as execuções repetidas mediriam o cache e a
// suíte seria inútil).
//
// REGRA: nada aqui pode mudar comportamento. Mesmos campos, mesma ordem de
// montagem do Promise.all, mesmo escopo RLS, mesmas colunas e limites.

import type { createClient } from "@/lib/supabase/server";
import { COLUNAS_KANBAN, SITUACAO } from "@/lib/vhsys/fluxo";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import {
  aplicarPedidos,
  buscarDadosPedidos,
  metricasPedidos,
  metricasOrcamentos,
  numerosComSaldoDeDados,
  type DadosPedidosPrecarregados,
  type Escopo,
  type Metrica,
} from "@/lib/crm/metricas";
import type {
  ClientePrefillRow,
  FinanceiroPedidoRow,
  OrcamentoRow,
  PedidoRow,
  SituacaoRow,
} from "@/lib/types/pedidos";
import { traced } from "@/lib/perf/trace";

type DB = Awaited<ReturnType<typeof createClient>>;

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────────────────────────────────

/** Limite de pedidos por coluna no Kanban (espelha pedidos/page.tsx). */
const LIMITE_POR_COLUNA = 50;

/** Limite de números aplicáveis num filtro .in() para "só com saldo". */
const MAX_NUMEROS_IN = 1000;

/** Colunas mínimas para Kanban (excluindo dados jsonb). */
const COLS_PEDIDO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, " +
  "vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, " +
  "data_pedido, prazo_entrega, referencia, obs, data_mod_vhsys, lixeira";

/** Resultado da onda 0 de pedidos (só roda quando `soComSaldo` ligado). */
export interface PedidosOnda0 {
  dadosPedidos: DadosPedidosPrecarregados;
  /** Números com saldo>0, já recortados a MAX_NUMEROS_IN. */
  numerosSaldo: number[];
}

/**
 * Onda 0 (apenas quando "só com saldo" ligado): resolve os números com
 * saldo>0 ANTES do kanban, para alimentar o `.in()` das colunas.
 * Espelha o bloco `if (filtros.soComSaldo)` de pedidos/page.tsx.
 */
export async function pedidosOnda0(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo,
  /** Tag de trace opcional (no-op quando ausente). Mantém compat. com tests/perf. */
  traceTag?: string
): Promise<PedidosOnda0> {
  // buscarDadosPedidos já instrumenta internamente a varredura de saldo
  // (lotes de pedidos) e os chunks de financeiro quando traceTag está presente.
  const dadosPedidos = await buscarDadosPedidos(supabase, filtros, escopo, traceTag);
  const todos = numerosComSaldoDeDados(dadosPedidos);
  const numerosSaldo = todos.slice(0, MAX_NUMEROS_IN);
  return { dadosPedidos, numerosSaldo };
}

/** Resultado bruto da onda 1 de pedidos (antes do mapeamento para kanban). */
export interface PedidosOnda1 {
  situacoes: SituacaoRow[];
  vendedores: { id_vhsys: number; nome: string }[];
  metricas: Metrica[];
  /** Pedidos achatados das colunas do kanban (na ordem das colunas). */
  pedidos: PedidoRow[];
  /** Flag de "atingiu limite" por situação, para o header do kanban. */
  atingiuLimitePorSituacao: Record<number, boolean>;
}

/**
 * Onda 1 de pedidos: situações + vendedores (se admin) + métricas + as
 * consultas das colunas do kanban, tudo num único Promise.all (mesma ordem
 * de montagem de pedidos/page.tsx).
 *
 * @param precarregados Dados da onda 0 (quando soComSaldo). null/undefined → RPC.
 * @param numerosSaldo  Números com saldo da onda 0 (recorte do .in()). null = sem recorte.
 */
export async function pedidosOnda1(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo,
  precarregados?: DadosPedidosPrecarregados | null,
  numerosSaldo?: number[] | null,
  /** Tag de trace opcional (no-op quando ausente). Mantém compat. com tests/perf. */
  traceTag?: string
): Promise<PedidosOnda1> {
  const role = escopo.role;

  // Multi-select de situação limita as colunas exibidas no kanban.
  const colunasFiltradas =
    filtros.situacoes.length > 0
      ? COLUNAS_KANBAN.filter((id) => filtros.situacoes.includes(id))
      : COLUNAS_KANBAN;
  const colunasAtivas = colunasFiltradas.filter((id) => id !== SITUACAO.ENTREGUE);
  const incluiEntregue =
    filtros.situacoes.length === 0 || filtros.situacoes.includes(SITUACAO.ENTREGUE);

  /** Aplica os filtros compartilhados + recorte de saldo a uma query de coluna. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function comFiltros(query: any): any {
    let q = aplicarPedidos(query, filtros, escopo);
    if (numerosSaldo) q = q.in("numero", numerosSaldo.length ? numerosSaldo : [-1]);
    return q;
  }

  /** Envolve uma promise/query com `traced` apenas quando há traceTag. */
  function trace<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
    return traceTag ? traced(traceTag, label, fn) : Promise.resolve(fn());
  }

  const consultasColunas = colunasAtivas.map((situacaoId) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace<any>(`kanban:situacao=${situacaoId}`, () =>
      comFiltros(
        supabase
          .from("vhsys_pedidos")
          .select(COLS_PEDIDO)
          .eq("lixeira", false)
          .eq("situacao_id", situacaoId)
          .order("data_pedido", { ascending: false })
          .limit(LIMITE_POR_COLUNA)
      )
    )
  );

  const consultaEntregues = incluiEntregue
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trace<any>(`kanban:situacao=${SITUACAO.ENTREGUE}`, () =>
        comFiltros(
          supabase
            .from("vhsys_pedidos")
            .select(COLS_PEDIDO)
            .eq("lixeira", false)
            .eq("situacao_id", SITUACAO.ENTREGUE)
            .order("data_mod_vhsys", { ascending: false })
            .limit(LIMITE_POR_COLUNA)
        )
      )
    : Promise.resolve({ data: [] as PedidoRow[] });

  const [situacoesRes, vendedoresRes, metricas, resultados] = await Promise.all([
    trace("situacoes", () =>
      supabase
        .from("vhsys_situacoes")
        .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
        .eq("entidade", "pedidos")
        .eq("lixeira", false)
        .order("ordem")
    ),
    role !== "vendedor"
      ? trace("vendedores", () =>
          supabase.from("vhsys_vendedores").select("id_vhsys, nome").order("nome")
        )
      : Promise.resolve({ data: [] as { id_vhsys: number; nome: string }[] }),
    trace("metricas", () =>
      metricasPedidos(supabase, filtros, escopo, precarregados ?? undefined, traceTag)
    ),
    Promise.all([...consultasColunas, consultaEntregues]),
  ]);

  const atingiuLimitePorSituacao: Record<number, boolean> = {};
  colunasAtivas.forEach((id, idx) => {
    atingiuLimitePorSituacao[id] = (resultados[idx].data?.length ?? 0) >= LIMITE_POR_COLUNA;
  });
  atingiuLimitePorSituacao[SITUACAO.ENTREGUE] =
    (resultados[resultados.length - 1].data?.length ?? 0) >= LIMITE_POR_COLUNA;

  const pedidos: PedidoRow[] = resultados.flatMap(
    (r) => (r.data ?? []) as unknown as PedidoRow[]
  );

  return {
    situacoes: (situacoesRes.data ?? []) as SituacaoRow[],
    vendedores: (vendedoresRes.data ?? []) as { id_vhsys: number; nome: string }[],
    metricas,
    pedidos,
    atingiuLimitePorSituacao,
  };
}

/** Resultado bruto da onda 2 de pedidos (financeiro/clientes/entregas). */
export interface PedidosOnda2 {
  financeiro: FinanceiroPedidoRow[];
  clientes: ClientePrefillRow[];
  entregasVinculadas: { pedido_id: string | null }[];
}

/**
 * Onda 2 de pedidos: financeiro + clientes + entregas dos cards visíveis,
 * num único Promise.all (mesma ordem de pedidos/page.tsx).
 */
export async function pedidosOnda2(
  supabase: DB,
  pedidos: PedidoRow[],
  /** Tag de trace opcional (no-op quando ausente). Mantém compat. com tests/perf. */
  traceTag?: string
): Promise<PedidosOnda2> {
  const pedidoIds = pedidos.map((p) => p.id);
  const clienteIds = Array.from(
    new Set(pedidos.map((p) => p.cliente_id_vhsys).filter((x): x is number => !!x))
  );

  /** Envolve uma promise/query com `traced` apenas quando há traceTag. */
  function trace<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
    return traceTag ? traced(traceTag, label, fn) : Promise.resolve(fn());
  }

  const [{ data: financeiro }, { data: clientes }, { data: entregasVinculadas }] =
    await Promise.all([
      pedidoIds.length
        ? trace("financeiro", () =>
            supabase.from("vhsys_pedidos_financeiro").select("*").in("pedido_id", pedidoIds)
          )
        : Promise.resolve({ data: [] as FinanceiroPedidoRow[] }),
      clienteIds.length
        ? trace("clientes", () =>
            supabase
              .from("vhsys_clientes")
              .select("id_vhsys, cnpj_cpf, bairro, endereco, numero")
              .in("id_vhsys", clienteIds)
          )
        : Promise.resolve({ data: [] as ClientePrefillRow[] }),
      pedidoIds.length
        ? trace("entregas", () =>
            supabase.from("entregas").select("pedido_id").in("pedido_id", pedidoIds)
          )
        : Promise.resolve({ data: [] as { pedido_id: string | null }[] }),
    ]);

  return {
    financeiro: (financeiro ?? []) as FinanceiroPedidoRow[],
    clientes: (clientes ?? []) as ClientePrefillRow[],
    entregasVinculadas: (entregasVinculadas ?? []) as { pedido_id: string | null }[],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORÇAMENTOS
// ─────────────────────────────────────────────────────────────────────────────

const POR_PAGINA = 50;

/** Colunas explícitas de orçamento (sem dados jsonb). */
const COLUNAS_ORCAMENTO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, pedido_emitido, data_orcamento, validade, referencia, obs, lixeira";

/**
 * Retorna true quando nenhum filtro estreita o conjunto além do período.
 * (Espelha filtrosEstreitos de orcamentos/page.tsx.)
 */
export function filtrosEstreitos(filtros: FiltrosCrm, escopo: Escopo): boolean {
  if (filtros.busca) return true;
  if (filtros.situacoes.length > 0) return true;
  if (escopo.role === "vendedor") return true; // RLS por vendedor estreita sempre
  if (filtros.vendedor !== null) return true;
  if (filtros.pedidoEmitido !== null) return true;
  if (filtros.dataDe || filtros.dataAte) return true;
  return false;
}

/** Resultado da onda única de orçamentos. */
export interface OrcamentosOnda {
  totalContagem: number;
  orcamentos: OrcamentoRow[];
  metricas: Metrica[];
  situacoes: SituacaoRow[];
  vendedores: { id_vhsys: number; nome: string }[];
  /** Se o count foi "planned" (estimado) em vez de "exact". */
  countAproximado: boolean;
}

/**
 * Onda única de orçamentos: lista + count + métricas + situações + vendedores
 * em paralelo (mesma ordem/lógica de orcamentos/page.tsx). NÃO altera a
 * decisão exact/planned do count.
 *
 * @param ehAdmin true quando o perfil é admin (controla a query de vendedores).
 */
export async function orcamentosOnda(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo,
  pagina: number,
  ehAdmin: boolean,
  /** Tag de trace opcional (no-op quando ausente). Mantém compat. com tests/perf. */
  traceTag?: string
): Promise<OrcamentosOnda> {
  /** Aplica todos os filtros de orçamento a uma query encadeada. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aplicar(query: any): any {
    let q = query;
    if (filtros.busca) {
      if (filtros.buscaNumero !== null) {
        q = q.eq("numero", filtros.buscaNumero);
      } else {
        q = q.or(`nome_cliente.ilike.%${filtros.busca}%,vendedor_nome.ilike.%${filtros.busca}%`);
      }
    }
    if (filtros.situacoes.length > 0) q = q.in("situacao_id", filtros.situacoes);
    if (escopo.role === "vendedor") {
      q = q.eq("vendedor_id_vhsys", escopo.vendedorId ?? -1);
    } else if (filtros.vendedor !== null) {
      q = q.eq("vendedor_id_vhsys", filtros.vendedor);
    }
    if (filtros.pedidoEmitido === true) q = q.eq("pedido_emitido", true);
    if (filtros.pedidoEmitido === false) q = q.eq("pedido_emitido", false);
    if (filtros.dataDe) q = q.gte("data_orcamento", filtros.dataDe);
    if (filtros.dataAte) q = q.lte("data_orcamento", filtros.dataAte);
    return q;
  }

  // Estratégia de count: "planned" quando "tudo" sem filtros estreitando.
  const usarPlanned =
    filtros.periodoPreset === "tudo" && !filtrosEstreitos(filtros, escopo);
  const countMode = usarPlanned ? "planned" : "exact";

  const queryDados = aplicar(
    supabase.from("vhsys_orcamentos").select(COLUNAS_ORCAMENTO).eq("lixeira", false)
  )
    .order("data_orcamento", { ascending: false })
    .order("numero", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const countQuery = aplicar(
    supabase
      .from("vhsys_orcamentos")
      .select("*", { count: countMode, head: true })
      .eq("lixeira", false)
  );

  /** Envolve uma promise/query com `traced` apenas quando há traceTag. */
  function trace<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
    return traceTag ? traced(traceTag, label, fn) : Promise.resolve(fn());
  }

  const [
    { count: totalContagem },
    { data: orcamentos },
    metricas,
    situacoesRes,
    vendedoresRes,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace<any>("count", () => countQuery),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trace<any>("lista", () => queryDados),
    trace("metricas", () => metricasOrcamentos(supabase, filtros, escopo, traceTag)),
    trace("situacoes", () =>
      supabase
        .from("vhsys_situacoes")
        .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
        .eq("entidade", "orcamentos")
        .eq("lixeira", false)
        .order("ordem")
    ),
    ehAdmin
      ? trace("vendedores", () =>
          supabase
            .from("vhsys_vendedores")
            .select("id_vhsys, nome")
            .eq("lixeira", false)
            .order("nome")
        )
      : Promise.resolve({ data: [] as { id_vhsys: number; nome: string }[] }),
  ]);

  return {
    totalContagem: totalContagem ?? 0,
    orcamentos: (orcamentos ?? []) as OrcamentoRow[],
    metricas,
    situacoes: (situacoesRes.data ?? []) as SituacaoRow[],
    vendedores: (vendedoresRes.data ?? []) as { id_vhsys: number; nome: string }[],
    countAproximado: usarPlanned,
  };
}

export { LIMITE_POR_COLUNA, MAX_NUMEROS_IN, POR_PAGINA };
