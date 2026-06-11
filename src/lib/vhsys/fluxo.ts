// Regras do fluxo de pedidos — DECISÕES FECHADAS (2026-06-11).
// IDs de situação são da CONTA VHSYS (docs/vhsys/raw/exemplos/situacoes-atual.json).
// Gate/colunas operam por id_situacao + ordem — NUNCA por tipo_status.

export const SITUACAO = {
  AGUARDANDO_PAGAMENTO: 858,
  PAGAMENTO_PARCIAL: 1179,
  PAGAMENTO_APROVADO: 857,
  EM_SEPARACAO: 859,
  ENTREGA_PARCIAL: 1180,
  ENTREGUE: 777,
  CANCELADO: 778,
} as const;

/** Colunas do Kanban, na ordem do fluxo. 778 (Cancelado) fica fora. */
export const COLUNAS_KANBAN: number[] = [
  SITUACAO.AGUARDANDO_PAGAMENTO,
  SITUACAO.PAGAMENTO_PARCIAL,
  SITUACAO.PAGAMENTO_APROVADO,
  SITUACAO.EM_SEPARACAO,
  SITUACAO.ENTREGA_PARCIAL,
  SITUACAO.ENTREGUE,
];

/** Segmentos visuais do Kanban. */
export const SEGMENTO_PAGAMENTO = new Set<number>([
  SITUACAO.AGUARDANDO_PAGAMENTO,
  SITUACAO.PAGAMENTO_PARCIAL,
  SITUACAO.PAGAMENTO_APROVADO,
]);

export const SEGMENTO_ENTREGA = new Set<number>([
  SITUACAO.EM_SEPARACAO,
  SITUACAO.ENTREGA_PARCIAL,
  SITUACAO.ENTREGUE,
]);

/** Gate: cadastro de entrega habilitado nestas situações. */
const GATE_ENTREGA = new Set<number>([
  SITUACAO.PAGAMENTO_PARCIAL,
  SITUACAO.PAGAMENTO_APROVADO,
  SITUACAO.EM_SEPARACAO,
  SITUACAO.ENTREGA_PARCIAL,
  SITUACAO.ENTREGUE,
]);

export function entregaHabilitada(situacaoId: number | null): boolean {
  return situacaoId !== null && GATE_ENTREGA.has(situacaoId);
}

// Cadastrar entrega ⇒ situação do pedido vai para EM_SEPARACAO (859),
// inclusive vindo de PAGAMENTO_PARCIAL (1179). A ESCRITA no VHSYS está
// deferida até autorização + teste em pedido descartável — por ora o
// gate só habilita/bloqueia a UI.

/**
 * Fallback legado: pedidos anteriores às situações personalizadas
 * (situacao null/0) derivam a coluna do enum-base status_pedido.
 */
export function situacaoEfetiva(
  situacaoId: number | null,
  statusBase: string | null
): { situacaoId: number | null; origem: "vhsys" | "legado" } {
  if (situacaoId) return { situacaoId, origem: "vhsys" };
  switch (statusBase) {
    case "Em Aberto":
      return { situacaoId: SITUACAO.AGUARDANDO_PAGAMENTO, origem: "legado" };
    case "Em Andamento":
      return { situacaoId: SITUACAO.PAGAMENTO_APROVADO, origem: "legado" };
    case "Atendido":
      return { situacaoId: SITUACAO.ENTREGUE, origem: "legado" };
    case "Cancelado":
      return { situacaoId: SITUACAO.CANCELADO, origem: "legado" };
    default:
      return { situacaoId: null, origem: "legado" };
  }
}
