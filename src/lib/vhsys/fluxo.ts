// Regras do fluxo de pedidos — DECISÕES FECHADAS (2026-06-11).
// IDs de situação são da CONTA VHSYS (docs/vhsys/raw/exemplos/situacoes-atual.json).
// Gate/colunas operam por id_situacao + ordem — NUNCA por tipo_status.
//
// RESULTADO DO TESTE CONTROLADO (2026-06-11, pedido TESTE-APAGAR id_ped=49342019):
// POST /pedidos/{id}/status ACEITA o campo extra "situacao" (id numérico) no body.
// Quando enviado, o VHSYS registra a situação personalizada corretamente.
// O campo alternativo "id_situacao" foi testado e IGNORADO pela API.
// Conclusão: sempre enviar tipo_status (obrigatório) + situacao (id personalizado).
// Movimentos entre 858/1179/1180 são POSSÍVEIS via campo "situacao".
// Mapeamento situacao_id → tipo_status: 858/1179/1180 → "Em Aberto";
// 857/859 → "Em Andamento"; 777 → "Atendido"; 778 → "Cancelado".

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

/**
 * Gate: cadastro de entrega habilitado a partir de Pagamento Aprovado — inclui
 * separação e entrega parcial. Permite cadastrar a entrega mesmo sem dar baixa
 * no recebível (basta o pagamento estar aprovado).
 */
const GATE_ENTREGA = new Set<number>([
  SITUACAO.PAGAMENTO_APROVADO,
  SITUACAO.EM_SEPARACAO,
  SITUACAO.ENTREGA_PARCIAL,
]);

export function entregaHabilitada(situacaoId: number | null): boolean {
  return situacaoId !== null && GATE_ENTREGA.has(situacaoId);
}

// Cadastrar entrega ⇒ situação do pedido vai para EM_SEPARACAO (859).
// Escrita habilitada via registrarEntregaEmSeparacao() em src/lib/vhsys/acoes.ts.

// ── Mapeamento situação personalizada → enum-base da API ──────────────────
// Usado em POST /pedidos/{id}/status e POST /orcamentos/{id}/status.
// As situações 858, 1179 e 1180 mapeiam para "Em Aberto" (ambíguo).
// O teste controlado vai determinar se o campo "situacao" extra é aceito.
type TipoStatus = "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";

const MAPA_TIPO_STATUS: Record<number, TipoStatus> = {
  858: "Em Aberto",
  1179: "Em Aberto",
  1180: "Em Aberto",
  857: "Em Andamento",
  859: "Em Andamento",
  777: "Atendido",
  778: "Cancelado",
};

/** Mapeia id_situacao personalizado → tipo_status enum-base. */
export function tipoStatusParaSituacao(situacaoId: number): TipoStatus | null {
  return MAPA_TIPO_STATUS[situacaoId] ?? null;
}

/**
 * Valida se uma transição de situação é permitida.
 * Regra: qualquer coluna → qualquer coluna EXCETO sair de ou entrar em CANCELADO (778).
 * Retrocessos (ex.: ENTREGUE → AGUARDANDO_PAGAMENTO) são INTENCIONAIS por design —
 * admin pode corrigir erros operacionais movendo o pedido de volta a qualquer coluna.
 */
export function transicaoPermitida(de: number | null, para: number): boolean {
  if (de === SITUACAO.CANCELADO) return false;
  if (para === SITUACAO.CANCELADO) return false;
  if (de === para) return false;
  // Destino deve ser uma situação conhecida do Kanban (Cancelado já bloqueado acima)
  return COLUNAS_KANBAN.includes(para);
}

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
