// Parse compartilhado dos filtros de URL do CRM (Orçamentos, Pedidos e Entregas).
// Usado pelas páginas server, pelas listas/kanban e pelas funções de métricas
// para garantir que TODOS apliquem EXATAMENTE o mesmo predicado.

export type Entidade = "orcamentos" | "pedidos" | "entregas";

export type PeriodoPreset = "hoje" | "7d" | "30d" | "90d" | "ano" | "tudo";

const PRESETS: PeriodoPreset[] = ["hoje", "7d", "30d", "90d", "ano", "tudo"];

/** Default de período quando a URL não traz nada: 30 dias. */
export const PERIODO_DEFAULT: PeriodoPreset = "30d";

export interface FiltrosCrm {
  /** Termo de busca já saneado (cap 100, sem chars problemáticos do PostgREST). */
  busca: string;
  /** Se a busca for inteiro positivo, o número; senão null. */
  buscaNumero: number | null;
  /** IDs de situação selecionados (multi-select). Vazio = todas. */
  situacoes: number[];
  /** Vendedor filtrado (admin). null = todos. */
  vendedor: number | null;
  /** Data inicial concreta (YYYY-MM-DD) já resolvida do preset/custom. */
  dataDe: string | null;
  /** Data final concreta (YYYY-MM-DD) já resolvida do preset/custom. */
  dataAte: string | null;
  /** Preset ativo (para o trigger do dropdown). null quando range custom. */
  periodoPreset: PeriodoPreset | null;
  // ── Específicos de Orçamentos ──
  /** "true" | "false" | null — filtra pedido_emitido. */
  pedidoEmitido: boolean | null;
  // ── Específicos de Pedidos ──
  /**
   * Recorte "Contas sem dar baixa":
   * "sem_baixa" → pedidos em PAGAMENTO_APROVADO (857) com valor em aberto
   *               (saldo > 0 OU sem contas lançadas / total_contas = 0);
   * null        → sem recorte de saldo.
   */
  saldoTipo: "sem_baixa" | null;
  /** Conveniência: true quando há recorte de saldo (saldoTipo != null). */
  soComSaldo: boolean;
  /** Ocultar registros legado (origem_situacao = 'legado'). Default ON. */
  ocultarLegado: boolean;
  /**
   * Filtro "Atualizadas em" (específico de Pedidos): recorta pela DATA da
   * última mudança de situação (coluna data_situacao), independente do período
   * (que usa data_pedido). YYYY-MM-DD ou null. Vazio = sem recorte.
   */
  situacaoAtualizadaDe: string | null;
  situacaoAtualizadaAte: string | null;
  // ── Específicos de Entregas ──
  /**
   * Situações de entrega em string (ex.: "entrega_final","entrega_parcial").
   * Separado de `situacoes` (numérico) porque a tabela entregas usa enum text.
   */
  situacoesStr: string[];
  /** Período de entrega: filtro de manha|tarde. Vazio = ambos. */
  periodoEntrega: string | null;
  /** Só entregas vinculadas a pedido com saldo a receber. */
  soComSaldoEntrega: boolean;
}

export type SearchParamsLike = {
  [key: string]: string | string[] | undefined;
};

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Resolve um preset em datas concretas (YYYY-MM-DD), no fuso local. */
export function resolverPreset(preset: PeriodoPreset): { de: string | null; ate: string | null } {
  const hoje = new Date();
  const ate = isoLocal(hoje);
  const inicio = new Date(hoje);
  switch (preset) {
    case "hoje":
      return { de: ate, ate };
    case "7d":
      inicio.setDate(inicio.getDate() - 6);
      return { de: isoLocal(inicio), ate };
    case "30d":
      inicio.setDate(inicio.getDate() - 29);
      return { de: isoLocal(inicio), ate };
    case "90d":
      inicio.setDate(inicio.getDate() - 89);
      return { de: isoLocal(inicio), ate };
    case "ano":
      return { de: `${hoje.getFullYear()}-01-01`, ate };
    case "tudo":
      return { de: null, ate: null };
  }
}

/** Formata um Date como YYYY-MM-DD no fuso local (sem deslocamento UTC). */
function isoLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sanitiza o termo de busca para interpolação segura em `.or()` do PostgREST:
 * - Limite de 100 chars
 * - Remove vírgulas e parênteses (delimitadores de condições no PostgREST)
 * - Escapa wildcards LIKE: % → \% e _ → \_ (PostgREST aceita \ como escape)
 * - NÃO usa replace(/'/g,"''") — o valor trafega parametrizado, não como SQL raw
 */
function sanitizarBusca(raw: string): string {
  return raw
    .slice(0, 100)
    .replace(/[,()]/g, " ")   // neutraliza delimitadores PostgREST
    .replace(/%/g, "\\%")     // escapa wildcard LIKE
    .replace(/_/g, "\\_")     // escapa wildcard LIKE
    .trim();
}

/**
 * Valida uma string YYYY-MM-DD com round-trip: além do formato, checa se
 * a data é calendariamente válida (rejeita "2024-13-45", "2024-02-30" etc.).
 * Data inválida → retorna null (ignora como se ausente).
 */
function validarData(s: string): string | null {
  if (!ISO_RE.test(s)) return null;
  const [anoS, mesS, diaS] = s.split("-");
  const d = new Date(`${anoS}-${mesS}-${diaS}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  // Round-trip: re-formata e compara para rejeitar datas roladas (ex: 02-30 → 03-01)
  const reformat = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return reformat === s ? s : null;
}

/**
 * Parseia os searchParams da URL para um objeto de filtros normalizado.
 * Centraliza o default de período (30d) e a resolução de presets → datas.
 */
export function parseFiltros(
  searchParams: SearchParamsLike | undefined,
  entidade: Entidade
): FiltrosCrm {
  const sp = searchParams ?? {};

  const buscaRaw = (str(sp.q) ?? "").trim();
  const busca = sanitizarBusca(buscaRaw);
  const buscaNumero = /^\d+$/.test(buscaRaw.slice(0, 100)) ? parseInt(buscaRaw, 10) : null;

  const situacoes = (str(sp.situacao) ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  const vendedorRaw = str(sp.vendedor);
  const vendedor =
    vendedorRaw && /^\d+$/.test(vendedorRaw) ? parseInt(vendedorRaw, 10) : null;

  // Período: presets vs custom (data_de/data_ate). Default 30d quando nada vier.
  const periodoRaw = str(sp.periodo);
  const dataDeRaw = str(sp.data_de);
  const dataAteRaw = str(sp.data_ate);

  let periodoPreset: PeriodoPreset | null = null;
  let dataDe: string | null = null;
  let dataAte: string | null = null;

  const dataDeVal = dataDeRaw ? validarData(dataDeRaw) : null;
  const dataAteVal = dataAteRaw ? validarData(dataAteRaw) : null;
  const temCustom = dataDeVal !== null || dataAteVal !== null;

  if (temCustom) {
    dataDe = dataDeVal;
    dataAte = dataAteVal;
  } else {
    const preset = (PRESETS as string[]).includes(periodoRaw ?? "")
      ? (periodoRaw as PeriodoPreset)
      : PERIODO_DEFAULT;
    periodoPreset = preset;
    const r = resolverPreset(preset);
    dataDe = r.de;
    dataAte = r.ate;
  }

  // Específicos de orçamentos
  const pe = str(sp.pedido_emitido);
  const pedidoEmitido = pe === "true" ? true : pe === "false" ? false : null;

  // Específicos de pedidos
  const saldoRaw = str(sp.saldo);
  const saldoTipo: FiltrosCrm["saldoTipo"] =
    entidade === "pedidos" && saldoRaw === "sem_baixa" ? "sem_baixa" : null;
  const soComSaldo = saldoTipo !== null;
  // Ocultar legado: default LIGADO. Só fica OFF se o param vier explicitamente "false".
  const ocultarLegado = entidade === "pedidos" ? str(sp.legado) !== "false" : false;

  // "Atualizadas em" (só pedidos): intervalo sobre data_situacao. Params
  // sit_de/sit_ate (não colidem com data_de/data_ate do período). Validados
  // como YYYY-MM-DD calendário; inválido → null (ignora como ausente).
  const sitDeRaw = entidade === "pedidos" ? str(sp.sit_de) : undefined;
  const sitAteRaw = entidade === "pedidos" ? str(sp.sit_ate) : undefined;
  const situacaoAtualizadaDe = sitDeRaw ? validarData(sitDeRaw) : null;
  const situacaoAtualizadaAte = sitAteRaw ? validarData(sitAteRaw) : null;

  // Específicos de entregas
  const STATUS_ENTREGA_VALIDOS = ["entrega_final", "entrega_parcial"];
  const situacoesStr =
    entidade === "entregas"
      ? (str(sp.situacao) ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => STATUS_ENTREGA_VALIDOS.includes(s))
      : [];
  const PERIODOS_VALIDOS = ["manha", "tarde"];
  const periodoEntrega =
    entidade === "entregas"
      ? (str(sp.periodo_entrega) ?? null) !== null &&
        PERIODOS_VALIDOS.includes(str(sp.periodo_entrega)!)
        ? str(sp.periodo_entrega)!
        : null
      : null;
  const soComSaldoEntrega = entidade === "entregas" && str(sp.com_saldo) === "true";

  return {
    busca,
    buscaNumero,
    situacoes,
    vendedor,
    dataDe,
    dataAte,
    periodoPreset,
    pedidoEmitido,
    saldoTipo,
    soComSaldo,
    ocultarLegado,
    situacaoAtualizadaDe,
    situacaoAtualizadaAte,
    situacoesStr,
    periodoEntrega,
    soComSaldoEntrega,
  };
}
