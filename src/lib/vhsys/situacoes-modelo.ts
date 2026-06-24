// Modelo de situações de PEDIDOS dirigido por dados — por CONTA.
//
// As "situações personalizadas" do VHSYS têm IDs próprios de cada conta. Em vez
// de constantes fixas (que eram da conta SA), derivamos colunas do kanban,
// segmentos, gate de entrega e o fallback legado das situações sincronizadas da
// conta (tabela vhsys_situacoes). A semântica é ancorada em `tipo_status`
// (enum-base do VHSYS) + `ordem`, que são consistentes entre contas.
//
// O modelo é SERIALIZÁVEL (arrays/records) para atravessar server→client como prop.

/** Situação mínima vinda do espelho (vhsys_situacoes, entidade='pedidos'). */
export interface SituacaoBase {
  id_vhsys: number;
  nome: string;
  tipo_status: string; // "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado"
  ordem: number;
}

export type TipoStatus = "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";

export interface ModeloSituacoes {
  /** IDs das colunas do kanban, na ordem, EXCLUINDO Cancelado. */
  colunas: number[];
  canceladoId: number | null;
  entregueId: number | null;
  pagamentoAprovadoId: number | null;
  emSeparacaoId: number | null;
  aguardandoPagamentoId: number | null;
  /** Situações que liberam o cadastro de entrega (pgto aprovado → entrega parcial). */
  gateEntrega: number[];
  /** Segmento visual "pagamento" do kanban. */
  segmentoPagamento: number[];
  /** Segmento visual "entrega" do kanban (inclui Entregue). */
  segmentoEntrega: number[];
  /** Fallback legado: tipo_status base → situação da conta. */
  legado: {
    emAberto: number | null;
    emAndamento: number | null;
    atendido: number | null;
    cancelado: number | null;
  };
  /** id_situacao → tipo_status (para POST /status nas escritas). */
  tipoPorId: Record<number, string>;
  /** id_situacao → nome (rótulos). */
  nomePorId: Record<number, string>;
}

function primeiroPorTipo(sorted: SituacaoBase[], tipo: TipoStatus): number | null {
  const s = sorted.find((x) => x.tipo_status === tipo);
  return s ? s.id_vhsys : null;
}

/** Constrói o modelo a partir das situações de PEDIDOS de uma conta. */
export function construirModeloSituacoes(situacoes: SituacaoBase[]): ModeloSituacoes {
  const sorted = [...situacoes].sort((a, b) => a.ordem - b.ordem);

  const canceladoId = sorted.find((s) => s.tipo_status === "Cancelado")?.id_vhsys ?? null;
  const naoCancelado = sorted.filter((s) => s.id_vhsys !== canceladoId);

  const colunas = naoCancelado.map((s) => s.id_vhsys);
  const entregueId = primeiroPorTipo(sorted, "Atendido");
  const pagamentoAprovadoId = primeiroPorTipo(sorted, "Em Andamento");
  const aguardandoPagamentoId = primeiroPorTipo(sorted, "Em Aberto");

  // "Em separação": ancorada no nome (consistente entre contas); fallback p/ o
  // 2º "Em Andamento" por ordem; senão null (conta sem essa etapa).
  const emSeparacao =
    sorted.find((s) => /separa/i.test(s.nome)) ??
    sorted.filter((s) => s.tipo_status === "Em Andamento")[1] ??
    null;
  const emSeparacaoId = emSeparacao ? emSeparacao.id_vhsys : null;

  // Gate de entrega: da ordem do "pagamento aprovado" em diante, sem Entregue/Cancelado.
  const ordemAprovado = pagamentoAprovadoId
    ? (sorted.find((s) => s.id_vhsys === pagamentoAprovadoId)?.ordem ?? Infinity)
    : Infinity;
  const gateEntrega = naoCancelado
    .filter((s) => s.ordem >= ordemAprovado && s.id_vhsys !== entregueId)
    .map((s) => s.id_vhsys);

  // Segmentos visuais: até o aprovado = pagamento; depois = entrega (inclui Entregue).
  const segmentoPagamento = naoCancelado.filter((s) => s.ordem <= ordemAprovado).map((s) => s.id_vhsys);
  const segmentoEntrega = naoCancelado.filter((s) => s.ordem > ordemAprovado).map((s) => s.id_vhsys);

  const tipoPorId: Record<number, string> = {};
  const nomePorId: Record<number, string> = {};
  for (const s of sorted) {
    tipoPorId[s.id_vhsys] = s.tipo_status;
    nomePorId[s.id_vhsys] = s.nome;
  }

  return {
    colunas,
    canceladoId,
    entregueId,
    pagamentoAprovadoId,
    emSeparacaoId,
    aguardandoPagamentoId,
    gateEntrega,
    segmentoPagamento,
    segmentoEntrega,
    legado: {
      emAberto: aguardandoPagamentoId,
      emAndamento: pagamentoAprovadoId,
      atendido: entregueId,
      cancelado: canceladoId,
    },
    tipoPorId,
    nomePorId,
  };
}

// ── Helpers (operam sobre o modelo) ─────────────────────────────────────────

export function ehColuna(m: ModeloSituacoes, id: number): boolean {
  return m.colunas.includes(id);
}

export function ehSegmentoEntrega(m: ModeloSituacoes, id: number | null): boolean {
  return id !== null && m.segmentoEntrega.includes(id);
}

export function ehSegmentoPagamento(m: ModeloSituacoes, id: number | null): boolean {
  return id !== null && m.segmentoPagamento.includes(id);
}

export function entregaHabilitada(m: ModeloSituacoes, id: number | null): boolean {
  return id !== null && m.gateEntrega.includes(id);
}

/** tipo_status para enviar no POST /status ao mover para uma situação. */
export function tipoStatusDe(m: ModeloSituacoes, id: number): TipoStatus | null {
  return (m.tipoPorId[id] as TipoStatus | undefined) ?? null;
}

/**
 * Transição permitida: de≠para, destino é coluna conhecida, e Cancelado não
 * entra/sai pelo kanban (mesma regra de antes, agora por conta).
 */
export function transicaoPermitida(m: ModeloSituacoes, de: number | null, para: number): boolean {
  if (de === m.canceladoId) return false;
  if (para === m.canceladoId) return false;
  if (de === para) return false;
  return m.colunas.includes(para);
}

/**
 * Fallback legado: pedidos sem situação personalizada (situacao null/0) derivam
 * a situação da conta a partir do enum-base status_pedido.
 */
export function situacaoEfetiva(
  m: ModeloSituacoes,
  situacaoId: number | null,
  statusBase: string | null
): { situacaoId: number | null; origem: "vhsys" | "legado" } {
  if (situacaoId) return { situacaoId, origem: "vhsys" };
  switch (statusBase) {
    case "Em Aberto":
      return { situacaoId: m.legado.emAberto, origem: "legado" };
    case "Em Andamento":
      return { situacaoId: m.legado.emAndamento, origem: "legado" };
    case "Atendido":
      return { situacaoId: m.legado.atendido, origem: "legado" };
    case "Cancelado":
      return { situacaoId: m.legado.cancelado, origem: "legado" };
    default:
      return { situacaoId: null, origem: "legado" };
  }
}
