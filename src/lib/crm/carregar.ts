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
import { COLUNAS_KANBAN_ORCAMENTO } from "@/lib/vhsys/fluxo-orcamentos";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import {
  aplicarPedidos,
  buscarDadosPedidos,
  metricasPedidos,
  metricasOrcamentos,
  type DadosPedidosPrecarregados,
  type Escopo,
  type Metrica,
} from "@/lib/crm/metricas";
import type {
  ClientePrefillRow,
  FinanceiroPedidoRow,
  OrcamentoRow,
  ParcelaPedido,
  PedidoRow,
  SituacaoRow,
} from "@/lib/types/pedidos";
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

/** Resultado da onda 0 de pedidos (só roda quando há recorte de saldo). */
export interface PedidosOnda0 {
  dadosPedidos: DadosPedidosPrecarregados;
  /** Números do tipo de saldo selecionado, recortados a MAX_NUMEROS_IN (p/ kanban). */
  numerosSaldo: number[];
  /** id_vhsys dos pedidos cujo saldo em aberto é cobrança à vista na entrega. */
  naEntregaIds: Set<number>;
}

/**
 * Onda 0 (apenas quando há recorte de saldo): resolve os números do pedido com
 * saldo>0 ANTES do kanban (para o `.in()` das colunas), já recortados pelo
 * TIPO de saldo (a prazo vs a receber na entrega) via forma de pagamento.
 */
export async function pedidosOnda0(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<PedidosOnda0> {
  const dadosPedidos = await buscarDadosPedidos(supabase, filtros, escopo);

  // Pedidos com saldo > 0 (numero + id_vhsys para ligar às contas).
  const comSaldo = dadosPedidos.pedidos.filter(
    (p) => (dadosPedidos.fin.get(p.numero)?.saldo ?? 0) > 0
  );
  const idVhsysComSaldo = comSaldo
    .map((p) => p.id_vhsys)
    .filter((x): x is number => !!x);

  // Classifica por forma de pagamento (mesma regra do card).
  const contas = await buscarContasForma(supabase, idVhsysComSaldo);
  const naEntregaIds = classificarCobrancaNaEntrega(contas);

  // Recorta pelo tipo escolhido.
  const ehEntrega = (p: { id_vhsys: number }) =>
    p.id_vhsys != null && naEntregaIds.has(p.id_vhsys);
  const filtrados = comSaldo.filter((p) =>
    filtros.saldoTipo === "entrega"
      ? ehEntrega(p)
      : filtros.saldoTipo === "prazo"
        ? !ehEntrega(p)
        : true
  );

  const numerosSaldo = filtrados.map((p) => p.numero).slice(0, MAX_NUMEROS_IN);
  return { dadosPedidos, numerosSaldo, naEntregaIds };
}

/** Busca contas a receber (com forma de pagamento) por pedido_resolvido, em chunks. */
async function buscarContasForma(
  supabase: DB,
  idVhsysList: number[]
): Promise<ContaForma[]> {
  const out: ContaForma[] = [];
  for (let i = 0; i < idVhsysList.length; i += 200) {
    const chunk = idVhsysList.slice(i, i + 200);
    if (!chunk.length) continue;
    const { data } = await supabase
      .from("vhsys_contas_receber")
      .select("pedido_resolvido, valor, valor_pago, vencimento, forma_pagamento:dados->>forma_pagamento")
      .in("pedido_resolvido", chunk)
      .eq("lixeira", false);
    if (data) out.push(...((data as unknown as ContaForma[]) ?? []));
  }
  return out;
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
  naEntregaIds?: Set<number> | null
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

  const consultasColunas = colunasAtivas.map((situacaoId) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comFiltros(
      supabase
        .from("vhsys_pedidos")
        .select(COLS_PEDIDO)
        .eq("lixeira", false)
        .eq("situacao_id", situacaoId)
        .order("data_pedido", { ascending: false })
        .limit(LIMITE_POR_COLUNA)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as unknown as Promise<{ data: any }>
  );

  const consultaEntregues = incluiEntregue
    ? comFiltros(
        supabase
          .from("vhsys_pedidos")
          .select(COLS_PEDIDO)
          .eq("lixeira", false)
          .eq("situacao_id", SITUACAO.ENTREGUE)
          .order("data_mod_vhsys", { ascending: false })
          .limit(LIMITE_POR_COLUNA)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as unknown as Promise<{ data: any }>
    : Promise.resolve({ data: [] as PedidoRow[] });

  const [situacoesRes, vendedoresRes, metricas, resultados] = await Promise.all([
    supabase
      .from("vhsys_situacoes")
      .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
      .eq("entidade", "pedidos")
      .eq("lixeira", false)
      .order("ordem"),
    role !== "vendedor"
      ? supabase.from("vhsys_vendedores").select("id_vhsys, nome").order("nome")
      : Promise.resolve({ data: [] as { id_vhsys: number; nome: string }[] }),
    metricasPedidos(supabase, filtros, escopo, precarregados ?? undefined, naEntregaIds ?? undefined),
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
  /** id_vhsys dos pedidos cujo saldo em aberto é cobrança à vista na entrega. */
  cobrancaNaEntregaIds: Set<number>;
  /** Parcelas (contas a receber) por id_vhsys do pedido, ordenadas por vencimento. */
  parcelasPorPedido: Map<number, ParcelaPedido[]>;
}

/** Formas de pagamento consideradas "à vista" (cobrança na entrega). */
const FORMAS_A_VISTA = new Set<string>(["Dinheiro"]);

/** Conta a receber (espelho) com a forma de pagamento extraída do jsonb. */
interface ContaForma {
  pedido_resolvido: number | null;
  valor: number | null;
  valor_pago: number | null;
  vencimento: string | null;
  forma_pagamento: string | null;
}

/** Agrupa as contas em parcelas por pedido (id_vhsys), ordenadas por vencimento. */
function montarParcelasPorPedido(
  contas: ContaForma[]
): Map<number, ParcelaPedido[]> {
  const mapa = new Map<number, ParcelaPedido[]>();
  for (const c of contas) {
    if (c.pedido_resolvido == null) continue;
    const arr = mapa.get(c.pedido_resolvido) ?? [];
    arr.push({
      vencimento: c.vencimento,
      valor: Number(c.valor ?? 0),
      valor_pago: Number(c.valor_pago ?? 0),
      forma_pagamento: c.forma_pagamento,
    });
    mapa.set(c.pedido_resolvido, arr);
  }
  for (const arr of Array.from(mapa.values())) {
    arr.sort((a: ParcelaPedido, b: ParcelaPedido) =>
      (a.vencimento ?? "").localeCompare(b.vencimento ?? "")
    );
  }
  return mapa;
}

/**
 * Classifica os pedidos cujo SALDO EM ABERTO é cobrança à vista na entrega.
 * Regra: o pedido entra no conjunto se tem contas em aberto e TODAS elas são
 * "à vista" (Dinheiro). Boleto/faturado/etc. (ou misto/forma desconhecida) ⇒
 * a prazo, fora do conjunto — evita marcar como "a receber na entrega".
 */
function classificarCobrancaNaEntrega(contas: ContaForma[]): Set<number> {
  const abertasPorPedido = new Map<number, ContaForma[]>();
  for (const c of contas) {
    if (c.pedido_resolvido == null) continue;
    const aberto = (Number(c.valor ?? 0) - Number(c.valor_pago ?? 0)) > 0.01;
    if (!aberto) continue;
    const arr = abertasPorPedido.get(c.pedido_resolvido) ?? [];
    arr.push(c);
    abertasPorPedido.set(c.pedido_resolvido, arr);
  }

  const ids = new Set<number>();
  for (const [idVhsys, abertas] of Array.from(abertasPorPedido.entries())) {
    const todasAVista = abertas.every(
      (c: ContaForma) =>
        c.forma_pagamento != null && FORMAS_A_VISTA.has(c.forma_pagamento)
    );
    if (todasAVista) ids.add(idVhsys);
  }
  return ids;
}

/**
 * Onda 2 de pedidos: financeiro + clientes + entregas dos cards visíveis,
 * num único Promise.all (mesma ordem de pedidos/page.tsx).
 */
export async function pedidosOnda2(
  supabase: DB,
  pedidos: PedidoRow[]
): Promise<PedidosOnda2> {
  const pedidoIds = pedidos.map((p) => p.id);
  const idVhsysList = pedidos
    .map((p) => p.id_vhsys)
    .filter((x): x is number => !!x);
  const clienteIds = Array.from(
    new Set(pedidos.map((p) => p.cliente_id_vhsys).filter((x): x is number => !!x))
  );

  const [
    { data: financeiro },
    { data: clientes },
    { data: entregasVinculadas },
    { data: contas },
  ] = await Promise.all([
    pedidoIds.length
      ? supabase.from("vhsys_pedidos_financeiro").select("*").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] as FinanceiroPedidoRow[] }),
    clienteIds.length
      ? supabase
          .from("vhsys_clientes")
          .select("id_vhsys, cnpj_cpf, bairro, endereco, numero")
          .in("id_vhsys", clienteIds)
      : Promise.resolve({ data: [] as ClientePrefillRow[] }),
    pedidoIds.length
      ? supabase.from("entregas").select("pedido_id").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] as { pedido_id: string | null }[] }),
    // Contas em aberto dos cards visíveis, com a forma de pagamento (jsonb).
    // Vínculo conta↔pedido é por pedido_resolvido = pedidos.id_vhsys.
    idVhsysList.length
      ? supabase
          .from("vhsys_contas_receber")
          .select("pedido_resolvido, valor, valor_pago, vencimento, forma_pagamento:dados->>forma_pagamento")
          .in("pedido_resolvido", idVhsysList)
          .eq("lixeira", false)
      : Promise.resolve({ data: [] as ContaForma[] }),
  ]);

  const contasArr = (contas ?? []) as ContaForma[];

  return {
    financeiro: (financeiro ?? []) as FinanceiroPedidoRow[],
    clientes: (clientes ?? []) as ClientePrefillRow[],
    entregasVinculadas: (entregasVinculadas ?? []) as { pedido_id: string | null }[],
    cobrancaNaEntregaIds: classificarCobrancaNaEntrega(contasArr),
    parcelasPorPedido: montarParcelasPorPedido(contasArr),
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
  ehAdmin: boolean
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

  const [
    { count: totalContagem },
    { data: orcamentos },
    metricas,
    situacoesRes,
    vendedoresRes,
  ] = await Promise.all([
    countQuery,
    queryDados,
    metricasOrcamentos(supabase, filtros, escopo),
    supabase
      .from("vhsys_situacoes")
      .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
      .eq("entidade", "orcamentos")
      .eq("lixeira", false)
      .order("ordem"),
    ehAdmin
      ? supabase
          .from("vhsys_vendedores")
          .select("id_vhsys, nome")
          .eq("lixeira", false)
          .order("nome")
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

// ─────────────────────────────────────────────────────────────────────────────
// ORÇAMENTOS — KANBAN
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado da onda Kanban de orçamentos. */
export interface OrcamentosKanbanOnda {
  orcamentos: OrcamentoRow[];
  /** Flag de "atingiu limite" por situação_id. */
  atingiuLimitePorSituacao: Record<number, boolean>;
}

/**
 * Onda Kanban de orçamentos: para cada coluna de COLUNAS_KANBAN_ORCAMENTO
 * traz até 50 itens e monta o flag atingiuLimitePorSituacao.
 *
 * Reutiliza a função `aplicar` de orcamentosOnda inline para respeitar
 * os mesmos filtros (busca, situações, vendedor, período, pedido_emitido).
 * Situações/vendedores/métricas NÃO são duplicados aqui — use orcamentosOnda
 * para esses metadados; aqui só os cards do Kanban.
 */
export async function orcamentosKanbanOnda(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<OrcamentosKanbanOnda> {
  /** Aplica os mesmos filtros de orcamentosOnda a uma query encadeada. */
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

  // Filtra as colunas que o multi-select de situação restringe
  const colunasFiltradas =
    filtros.situacoes.length > 0
      ? COLUNAS_KANBAN_ORCAMENTO.filter((id) => filtros.situacoes.includes(id))
      : COLUNAS_KANBAN_ORCAMENTO;

  const consultasColunas = colunasFiltradas.map((situacaoId) =>
    aplicar(
      supabase
        .from("vhsys_orcamentos")
        .select(COLUNAS_ORCAMENTO)
        .eq("lixeira", false)
        .eq("situacao_id", situacaoId)
        .order("data_orcamento", { ascending: false })
        .limit(LIMITE_POR_COLUNA)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as unknown as Promise<{ data: any }>
  );

  const resultados = await Promise.all(consultasColunas);

  const atingiuLimitePorSituacao: Record<number, boolean> = {};
  colunasFiltradas.forEach((id, idx) => {
    atingiuLimitePorSituacao[id] = (resultados[idx].data?.length ?? 0) >= LIMITE_POR_COLUNA;
  });

  const orcamentos: OrcamentoRow[] = resultados.flatMap(
    (r) => (r.data ?? []) as unknown as OrcamentoRow[]
  );

  return { orcamentos, atingiuLimitePorSituacao };
}

export { LIMITE_POR_COLUNA, MAX_NUMEROS_IN, POR_PAGINA };
