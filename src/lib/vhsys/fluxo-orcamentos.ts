// Regras do fluxo de ORÇAMENTOS — espelha fluxo.ts para tipo_pedido=2.
// IDs de situação são da conta VHSYS (docs/vhsys/raw/exemplos/situacoes-atual.json).
// Orçamentos têm 3 situações VHSYS: 860 "Em negociação", 768 "Aprovado", 769 "Perdido".
// -2 é id VIRTUAL interno para "Em andamento" (status-base, sem situação personalizada VHSYS).
//
// Mapeamento tipo_status confirmado no JSON de situações (captura 2026-06-11):
//   860 "Em negociação" → tipo_status "Em Aberto"
//   768 "Aprovado"      → tipo_status "Atendido"
//   769 "Perdido"       → tipo_status "Cancelado"
//   -2  "Em andamento"  → tipo_status "Em Andamento" (virtual — não envia situacao à API)

/** Situação "Aprovado" de orçamentos (id VHSYS) — pré-requisito para emitir pedido. */
export const SITUACAO_APROVADO = 768;

export const SITUACAO_ORC = {
  EM_NEGOCIACAO: 860,
  EM_ANDAMENTO: -2,
  APROVADO: 768,
  PERDIDO: 769,
} as const;

/** Colunas do Kanban de orçamentos, na ordem do fluxo. */
export const COLUNAS_KANBAN_ORCAMENTO: number[] = [
  SITUACAO_ORC.EM_NEGOCIACAO,
  SITUACAO_ORC.EM_ANDAMENTO,
  SITUACAO_ORC.APROVADO,
  SITUACAO_ORC.PERDIDO,
];

/** Nomes das colunas virtuais (ids negativos, sem registro em vhsys_situacoes). */
export const NOME_COLUNA_ORC: Record<number, string> = {
  [SITUACAO_ORC.EM_ANDAMENTO]: "Em andamento",
};

type TipoStatusOrc = "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";

// Mapa baseado nos dados reais do JSON situacoes-atual.json.
// Validado em teste controlado (2026-06-15): /orcamentos/status aceita e registra
// o campo "situacao"; o tipo_status já é 1:1 com a situação em orçamentos.
// -2 é virtual: envia só tipo_status "Em Andamento", sem campo situacao.
const MAPA_TIPO_STATUS_ORC: Record<number, TipoStatusOrc> = {
  860: "Em Aberto",     // "Em negociação"
  [-2]: "Em Andamento", // virtual "Em andamento"
  768: "Atendido",      // "Aprovado"
  769: "Cancelado",     // "Perdido"
};

/** Mapeia id_situacao de orçamento → tipo_status enum-base da API. */
export function tipoStatusOrcamento(situacaoId: number): TipoStatusOrc | null {
  return MAPA_TIPO_STATUS_ORC[situacaoId] ?? null;
}

/**
 * Fallback: orçamentos sem situação personalizada (situacao 0/null) derivam a
 * coluna do enum-base status_pedido. Espelha situacaoEfetiva de fluxo.ts (pedidos).
 */
export function situacaoEfetivaOrcamento(
  situacaoId: number | null,
  statusBase: string | null
): { situacaoId: number | null; origem: "vhsys" | "legado" } {
  if (situacaoId) return { situacaoId, origem: "vhsys" };
  switch (statusBase) {
    case "Em Aberto":
      return { situacaoId: SITUACAO_ORC.EM_NEGOCIACAO, origem: "legado" };
    case "Em Andamento":
      return { situacaoId: SITUACAO_ORC.EM_ANDAMENTO, origem: "legado" };
    case "Atendido":
    case "Aprovado":
      return { situacaoId: SITUACAO_ORC.APROVADO, origem: "legado" };
    case "Cancelado":
      return { situacaoId: SITUACAO_ORC.PERDIDO, origem: "legado" };
    default:
      return { situacaoId: null, origem: "legado" };
  }
}

/**
 * Valida se uma transição de situação de orçamento é permitida.
 * Regra: qualquer coluna → qualquer coluna EXCETO de===para.
 * PERDIDO (769) é o equivalente terminal a CANCELADO nos pedidos — é permitido
 * entrar e sair dele (admin pode corrigir classificação errada).
 * Diferença de pedidos: não há situação "Cancelado" separada; PERDIDO é o
 * terminal mas não bloqueia retorno (workflow de orçamento é mais fluido).
 */
export function transicaoOrcamentoPermitida(de: number | null, para: number): boolean {
  if (de === para) return false;
  // Destino deve ser situação conhecida do Kanban
  return COLUNAS_KANBAN_ORCAMENTO.includes(para);
}
