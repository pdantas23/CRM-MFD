// Métricas agregadas server-side para Orçamentos, Pedidos e Entregas.
// Agrega sobre TODO o conjunto filtrado (não só a página/coluna visível),
// respeitando o mesmo escopo RLS/vendedor e EXATAMENTE os mesmos filtros
// das listas (via parseFiltros). Sem RPC, sem migration: pagina em lotes
// de 1000 com .range() e agrega em código no servidor.

import type { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import { COLUNAS_KANBAN } from "@/lib/vhsys/fluxo";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
// Cliente Supabase server — o projeto não gera tipos para as tabelas vhsys_*,
// então as queries usam encadeamento livre sem checagem de schema.
type DB = Awaited<ReturnType<typeof createClient>>;

export interface Metrica {
  label: string;
  valor: string;
  destaque?: boolean;
}

/** Escopo de RLS por aplicação resolvido pela página. */
export interface Escopo {
  role: string;
  vendedorId: number | null;
}

const LOTE = 1000;
const CAP_LINHAS = 20000;
const CHUNK_FIN = 200;

/** % com 1 casa decimal (sem casa quando inteiro). */
function pct(parte: number, total: number): string {
  if (total === 0) return "0%";
  const v = (parte / total) * 100;
  return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
}

function ticket(soma: number, n: number): number {
  return n === 0 ? 0 : soma / n;
}

/**
 * Aplica os filtros comuns (busca, situação multi, vendedor/RLS, período)
 * a uma query de vhsys_orcamentos OU vhsys_pedidos.
 */
function aplicarComuns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filtros: FiltrosCrm,
  escopo: Escopo,
  colData: "data_orcamento" | "data_pedido"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let q = query;

  if (filtros.busca) {
    if (filtros.buscaNumero !== null) {
      q = q.eq("numero", filtros.buscaNumero);
    } else {
      q = q.or(
        `nome_cliente.ilike.%${filtros.busca}%,vendedor_nome.ilike.%${filtros.busca}%`
      );
    }
  }

  if (filtros.situacoes.length > 0) q = q.in("situacao_id", filtros.situacoes);

  // RLS por aplicação: vendedor vê só o próprio id; admin pode filtrar.
  if (escopo.role === "vendedor") {
    q = q.eq("vendedor_id_vhsys", escopo.vendedorId ?? -1);
  } else if (filtros.vendedor !== null) {
    q = q.eq("vendedor_id_vhsys", filtros.vendedor);
  }

  if (filtros.dataDe) q = q.gte(colData, filtros.dataDe);
  if (filtros.dataAte) q = q.lte(colData, filtros.dataAte);

  return q;
}

/** Busca todas as linhas (colunas mínimas) paginando em lotes de 1000. */
export async function buscarLotes<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  montarQuery: () => any
): Promise<T[]> {
  const acc: T[] = [];
  for (let inicio = 0; inicio < CAP_LINHAS; inicio += LOTE) {
    const { data, error } = await montarQuery().range(inicio, inicio + LOTE - 1);
    if (error || !data) break;
    acc.push(...(data as T[]));
    if (data.length < LOTE) break;
  }
  return acc;
}

interface OrcAgg {
  valor_total: number | null;
  situacao_id: number | null;
  pedido_emitido: boolean | null;
}

/** Situação "Aprovado" de orçamentos. */
const SITUACAO_APROVADO = 768;

/** Linha de retorno da RPC orcamentos_metricas. */
interface OrcMetricasRpc {
  n: number;
  valor_total: number | null;
  aprovados_n: number;
  aprovados_valor: number | null;
  convertidos_n: number;
}

/** Linha de retorno da RPC pedidos_metricas. */
interface PedMetricasRpc {
  n: number;
  valor_total: number | null;
  recebido: number | null;
  saldo: number | null;
}

/**
 * Resolve o vendedor efetivo para a RPC a partir do escopo RLS + filtros:
 * - role "vendedor" → sempre o próprio id (ignora filtro de vendedor)
 * - admin/outros → o vendedor selecionado no filtro (ou null = todos)
 */
function vendedorParaRpc(filtros: FiltrosCrm, escopo: Escopo): number | null {
  if (escopo.role === "vendedor") return escopo.vendedorId ?? -1;
  return filtros.vendedor;
}

/** Monta as 5 métricas de orçamentos a partir dos agregados brutos. */
function montarMetricasOrcamentos(
  n: number,
  soma: number,
  aprovadosN: number,
  somaAprov: number,
  convertidos: number
): Metrica[] {
  return [
    { label: "Orçamentos", valor: String(n) },
    { label: "Valor total", valor: formatBRL(soma) },
    { label: "Ticket médio", valor: formatBRL(ticket(soma, n)) },
    { label: "Aprovados", valor: `${aprovadosN} · ${formatBRL(somaAprov)}` },
    { label: "Conversão", valor: pct(convertidos, n), destaque: true },
  ];
}

export async function metricasOrcamentos(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<Metrica[]> {
  // Caminho rápido: RPC agrega tudo num roundtrip. Fallback silencioso para
  // a varredura em lotes se a function não existir / der qualquer erro.
  const rpc = await tentarRpcOrcamentos(supabase, filtros, escopo);
  if (rpc) {
    return montarMetricasOrcamentos(
      rpc.n,
      rpc.valor_total ?? 0,
      rpc.aprovados_n,
      rpc.aprovados_valor ?? 0,
      rpc.convertidos_n
    );
  }

  const linhas = await buscarLotes<OrcAgg>(() =>
    aplicarOrcamentos(
      supabase
        .from("vhsys_orcamentos")
        .select("valor_total, situacao_id, pedido_emitido")
        .eq("lixeira", false),
      filtros,
      escopo
    ).order("numero", { ascending: false })
  );

  const n = linhas.length;
  const soma = linhas.reduce((a, r) => a + (r.valor_total ?? 0), 0);
  const aprov = linhas.filter((r) => r.situacao_id === SITUACAO_APROVADO);
  const somaAprov = aprov.reduce((a, r) => a + (r.valor_total ?? 0), 0);
  const convertidos = linhas.filter((r) => r.pedido_emitido === true).length;

  return montarMetricasOrcamentos(n, soma, aprov.length, somaAprov, convertidos);
}

/** Avisa uma única vez por processo quando uma RPC de métricas indisponível. */
let avisouRpcMetricas = false;
function avisarFallbackRpc(nome: string): void {
  if (avisouRpcMetricas) return;
  avisouRpcMetricas = true;
  console.warn(
    `[metricas] RPC ${nome} indisponível — usando fallback de agregação em lotes.`
  );
}

/**
 * Tenta a RPC orcamentos_metricas. Retorna a linha agregada ou null para
 * sinalizar fallback (function inexistente PGRST202/42883 ou qualquer erro).
 */
async function tentarRpcOrcamentos(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<OrcMetricasRpc | null> {
  const { data, error } = await supabase
    .rpc("orcamentos_metricas", {
      p_busca: filtros.buscaNumero === null && filtros.busca ? filtros.busca : null,
      p_numero: filtros.buscaNumero,
      p_situacoes: filtros.situacoes.length > 0 ? filtros.situacoes : null,
      p_vendedor_id: vendedorParaRpc(filtros, escopo),
      p_pedido_emitido: filtros.pedidoEmitido,
      p_data_de: filtros.dataDe,
      p_data_ate: filtros.dataAte,
    })
    .maybeSingle();

  if (error || !data) {
    if (error) avisarFallbackRpc("orcamentos_metricas");
    return null;
  }
  return data as unknown as OrcMetricasRpc;
}

/** Aplica filtros de orçamentos (comuns + pedido_emitido). */
function aplicarOrcamentos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filtros: FiltrosCrm,
  escopo: Escopo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let q = aplicarComuns(query, filtros, escopo, "data_orcamento");
  if (filtros.pedidoEmitido === true) q = q.eq("pedido_emitido", true);
  if (filtros.pedidoEmitido === false) q = q.eq("pedido_emitido", false);
  return q;
}

export interface PedAgg {
  numero: number;
  id_vhsys: number;
  valor_total: number | null;
}

export interface FinAgg {
  numero: number;
  recebido: number | null;
  saldo: number | null;
}

/**
 * Aplica filtros de pedidos (comuns + ocultar legado + restrição de kanban).
 *
 * Quando `filtros.situacoes` está vazio, o kanban mostra apenas as situações de
 * COLUNAS_KANBAN — métricas e numerosComSaldo usam o mesmo conjunto para que
 * as contagens batam com o que é visível (exclui CANCELADO e situações avulsas).
 */
export function aplicarPedidos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filtros: FiltrosCrm,
  escopo: Escopo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // Constrói filtros com situações efetivas (kanban default quando vazio).
  const situacoesEfetivas =
    filtros.situacoes.length > 0 ? filtros.situacoes : COLUNAS_KANBAN;
  const filtrosComSituacao: FiltrosCrm = { ...filtros, situacoes: situacoesEfetivas };
  let q = aplicarComuns(query, filtrosComSituacao, escopo, "data_pedido");
  // Ocultar legado (default ON): limita a origem_situacao = 'vhsys'.
  if (filtros.ocultarLegado) q = q.eq("origem_situacao", "vhsys");
  // "Atualizadas em": recorte pela data da última mudança de situação
  // (independente do período, que usa data_pedido). Só pedidos.
  if (filtros.situacaoAtualizadaDe) q = q.gte("data_situacao", filtros.situacaoAtualizadaDe);
  if (filtros.situacaoAtualizadaAte) q = q.lte("data_situacao", filtros.situacaoAtualizadaAte);
  return q;
}

/** Carrega da view os numeros com saldo > 0, em chunks de 200, dado o conjunto. */
async function carregarSaldoPorNumero(
  supabase: DB,
  numeros: number[]
): Promise<Map<number, FinAgg>> {
  const mapa = new Map<number, FinAgg>();
  for (let pos = 0; pos < numeros.length; pos += CHUNK_FIN) {
    const chunk = numeros.slice(pos, pos + CHUNK_FIN);
    const { data } = await supabase
      .from("vhsys_pedidos_financeiro")
      .select("numero, recebido, saldo")
      .in("numero", chunk);
    for (const f of (data ?? []) as FinAgg[]) mapa.set(f.numero, f);
  }
  return mapa;
}

/** Dados pré-carregados de pedidos+financeiro (evita varredura dupla). */
export interface DadosPedidosPrecarregados {
  pedidos: PedAgg[];
  fin: Map<number, FinAgg>;
}

/**
 * Busca todos os pedidos do conjunto filtrado com seus dados financeiros.
 * Retorna a estrutura bruta para que a página reuse tanto em métricas
 * quanto no cálculo de numerosComSaldo, sem varredura dupla.
 */
export async function buscarDadosPedidos(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<DadosPedidosPrecarregados> {
  const pedidos = await buscarLotes<PedAgg>(() =>
    aplicarPedidos(
      supabase
        .from("vhsys_pedidos")
        .select("numero, id_vhsys, valor_total")
        .eq("lixeira", false),
      filtros,
      escopo
    ).order("numero", { ascending: false })
  );
  const fin = await carregarSaldoPorNumero(supabase, pedidos.map((p) => p.numero));
  return { pedidos, fin };
}

/**
 * Resolve os números de pedido com saldo > 0 a partir de dados pré-carregados.
 * Limitação: até ~CAP_LINHAS pedidos no recorte (cap de agregação).
 */
export function numerosComSaldoDeDados(
  dados: DadosPedidosPrecarregados
): number[] {
  return dados.pedidos
    .map((p) => p.numero)
    .filter((num) => (dados.fin.get(num)?.saldo ?? 0) > 0);
}

/**
 * Mantido para compatibilidade com chamadas sem dados pré-carregados.
 * Internamente chama buscarDadosPedidos + numerosComSaldoDeDados.
 */
export async function numerosComSaldo(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<number[]> {
  const dados = await buscarDadosPedidos(supabase, filtros, escopo);
  return numerosComSaldoDeDados(dados);
}

/** Monta as 5 métricas de pedidos a partir dos agregados brutos. */
function montarMetricasPedidos(
  n: number,
  soma: number,
  recebido: number,
  saldo: number
): Metrica[] {
  return [
    { label: "Pedidos", valor: String(n) },
    { label: "Valor total", valor: formatBRL(soma) },
    { label: "Ticket médio", valor: formatBRL(ticket(soma, n)) },
    { label: "Recebido", valor: formatBRL(recebido) },
    { label: "Saldo a receber", valor: formatBRL(saldo), destaque: true },
  ];
}

/**
 * Tenta a RPC pedidos_metricas. Retorna a linha agregada ou null (fallback).
 */
async function tentarRpcPedidos(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo
): Promise<PedMetricasRpc | null> {
  const { data, error } = await supabase
    .rpc("pedidos_metricas", {
      p_busca: filtros.buscaNumero === null && filtros.busca ? filtros.busca : null,
      p_numero: filtros.buscaNumero,
      p_situacoes: filtros.situacoes.length > 0 ? filtros.situacoes : null,
      p_vendedor_id: vendedorParaRpc(filtros, escopo),
      p_ocultar_legado: filtros.ocultarLegado,
      p_so_com_saldo: filtros.soComSaldo,
      p_data_de: filtros.dataDe,
      p_data_ate: filtros.dataAte,
      p_sit_de: filtros.situacaoAtualizadaDe,
      p_sit_ate: filtros.situacaoAtualizadaAte,
    })
    .maybeSingle();

  if (error || !data) {
    if (error) avisarFallbackRpc("pedidos_metricas");
    return null;
  }
  return data as unknown as PedMetricasRpc;
}

export async function metricasPedidos(
  supabase: DB,
  filtros: FiltrosCrm,
  escopo: Escopo,
  /** Dados já carregados pela onda 0 — evita varredura dupla quando há recorte de saldo. */
  precarregados?: DadosPedidosPrecarregados
): Promise<Metrica[]> {
  // Com dados já pré-carregados (recorte "Contas sem dar baixa" ligado): a onda 0
  // já entregou SÓ o subconjunto filtrado (857 em aberto), então basta agregar
  // em memória, sem nova ida ao banco. Sem pré-carregados: tenta a RPC (um
  // roundtrip) e cai no fallback de lotes só se a function não existir.
  if (!precarregados) {
    const rpc = await tentarRpcPedidos(supabase, filtros, escopo);
    if (rpc) {
      return montarMetricasPedidos(
        rpc.n,
        rpc.valor_total ?? 0,
        rpc.recebido ?? 0,
        rpc.saldo ?? 0
      );
    }
  }

  const { pedidos, fin } =
    precarregados ?? (await buscarDadosPedidos(supabase, filtros, escopo));

  const n = pedidos.length;
  const soma = pedidos.reduce((a, p) => a + (p.valor_total ?? 0), 0);
  const recebido = pedidos.reduce((a, p) => a + (fin.get(p.numero)?.recebido ?? 0), 0);
  const saldo = pedidos.reduce((a, p) => a + (fin.get(p.numero)?.saldo ?? 0), 0);

  return montarMetricasPedidos(n, soma, recebido, saldo);
}

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRICAS DE ENTREGAS
// ─────────────────────────────────────────────────────────────────────────────

interface EntregaAgg {
  id: string;
  data: string;
  status: string;
  pedido_id: string | null;
  entregue_em: string | null;
}

/**
 * Classificações de status de entrega (baseadas na REALIZAÇÃO, não no tipo
 * final/parcial):
 * - Concluída : entregue_em preenchido (entrega realizada).
 * - Atrasada  : NÃO realizada E data < hoje (prazo expirado), independente de
 *               ser final ou parcial.
 * - Pendente  : NÃO realizada E data >= hoje (ainda no prazo).
 *
 * O campo `data` é a data da entrega agendada (YYYY-MM-DD).
 */
function classificarEntrega(e: EntregaAgg, hojeIso: string): "concluida" | "pendente" | "atrasada" {
  if (e.entregue_em) return "concluida";
  return e.data < hojeIso ? "atrasada" : "pendente";
}

/**
 * Aplica os filtros de entregas a uma query encadeada.
 * RLS está no banco (SELECT já escopo-filtrado); não há filtro de vendedor
 * por aplicação para entregas.
 */
function aplicarEntregas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filtros: FiltrosCrm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let q = query;

  if (filtros.busca) {
    // Busca por cliente, bairro, endereço ou número de orçamento.
    q = q.or(
      `nome_cliente.ilike.%${filtros.busca}%,bairro.ilike.%${filtros.busca}%,` +
      `endereco.ilike.%${filtros.busca}%,numero_orcamento.ilike.%${filtros.busca}%`
    );
  }

  // Status de entrega (string enum: "entrega_final" | "entrega_parcial").
  if (filtros.situacoesStr.length > 0) q = q.in("status", filtros.situacoesStr);

  // Filtro de período do dia (manhã/tarde).
  if (filtros.periodoEntrega) q = q.eq("periodo", filtros.periodoEntrega);

  // Período (coluna `data` — data da entrega).
  if (filtros.dataDe) q = q.gte("data", filtros.dataDe);
  if (filtros.dataAte) q = q.lte("data", filtros.dataAte);

  return q;
}

export { aplicarEntregas };

export async function metricasEntregas(
  supabase: DB,
  filtros: FiltrosCrm
): Promise<Metrica[]> {
  // 1. Agrega entregas (colunas mínimas).
  const entregas = await buscarLotes<EntregaAgg>(() =>
    aplicarEntregas(
      supabase
        .from("entregas")
        .select("id, data, status, pedido_id, entregue_em")
        .order("data", { ascending: false }),
      filtros
    )
  );

  const hojeIso = hojeISOSaoPaulo();

  let concluidas = 0, pendentes = 0, atrasadas = 0;
  const pedidoIdsComSaldo = new Set<string>();

  for (const e of entregas) {
    const cls = classificarEntrega(e, hojeIso);
    if (cls === "concluida") concluidas++;
    else if (cls === "pendente") pendentes++;
    else atrasadas++;
    if (e.pedido_id) pedidoIdsComSaldo.add(e.pedido_id);
  }

  // 2. Saldo a receber: soma saldo dos pedidos vinculados (dedup por pedido_id).
  // Busca na view vhsys_pedidos_financeiro pelo pedido_id (UUID), em chunks de 200.
  // Nota: a view expõe pedido_id como FK para vhsys_pedidos.id.
  const pedidoIds = Array.from(pedidoIdsComSaldo);
  let saldoTotal = 0;
  for (let i = 0; i < pedidoIds.length; i += CHUNK_FIN) {
    const chunk = pedidoIds.slice(i, i + CHUNK_FIN);
    const { data } = await supabase
      .from("vhsys_pedidos_financeiro")
      .select("saldo")
      .in("pedido_id", chunk);
    for (const row of (data ?? []) as { saldo: number | null }[]) {
      saldoTotal += row.saldo ?? 0;
    }
  }

  // Se soComSaldoEntrega, o filtro já foi aplicado na query de lista;
  // aqui as métricas refletem apenas o subconjunto filtrado (sem recálculo extra).

  return [
    { label: "Entregas", valor: String(entregas.length) },
    { label: "Pendentes", valor: String(pendentes) },
    { label: "Concluídas", valor: String(concluidas) },
    { label: "Atrasadas", valor: String(atrasadas) },
    { label: "Saldo a receber", valor: formatBRL(saldoTotal), destaque: true },
  ];
}
