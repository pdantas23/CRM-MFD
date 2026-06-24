// Modelo de situações de ORÇAMENTOS dirigido por dados — por CONTA.
//
// Como em pedidos (situacoes-modelo.ts), os IDs das situações personalizadas são
// próprios de cada conta VHSYS. As 3 situações reais (Em negociação / Aprovado /
// Perdido) são derivadas das situações sincronizadas (vhsys_situacoes,
// entidade='orcamentos'), ancoradas em `tipo_status` + nome. A coluna "Em
// andamento" é VIRTUAL (id -2): representa orçamentos com status-base
// "Em Andamento" sem situação personalizada — é conceito do CRM, não do VHSYS,
// logo universal (não depende de conta).

import type { SituacaoBase } from "./situacoes-modelo";

export type TipoStatusOrc = "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";

/** ID virtual da coluna "Em andamento" (sem situação personalizada no VHSYS). */
export const ORC_EM_ANDAMENTO_VIRTUAL = -2;

export interface ModeloOrcamento {
  /** Colunas do kanban, na ordem do fluxo (inclui a virtual "Em andamento"). */
  colunas: number[];
  emNegociacaoId: number | null;
  /** Situação "Aprovado" — pré-requisito para emitir pedido. */
  aprovadoId: number | null;
  perdidoId: number | null;
  /** id da coluna virtual "Em andamento" (-2). */
  emAndamentoVirtual: number;
  /** id_situacao → tipo_status (para POST /orcamentos/{id}/status). */
  tipoPorId: Record<number, TipoStatusOrc>;
  nomePorId: Record<number, string>;
  legado: {
    emAberto: number | null;
    emAndamento: number;
    atendido: number | null;
    cancelado: number | null;
  };
}

function acharPorTipoOuNome(
  sorted: SituacaoBase[],
  tipo: TipoStatusOrc,
  re: RegExp
): SituacaoBase | undefined {
  return sorted.find((s) => s.tipo_status === tipo) ?? sorted.find((s) => re.test(s.nome));
}

/** Constrói o modelo a partir das situações de ORÇAMENTOS de uma conta. */
export function construirModeloOrcamento(situacoes: SituacaoBase[]): ModeloOrcamento {
  const sorted = [...situacoes].sort((a, b) => a.ordem - b.ordem);

  const emNegociacao = acharPorTipoOuNome(sorted, "Em Aberto", /negocia/i);
  const aprovado = acharPorTipoOuNome(sorted, "Atendido", /aprovad/i);
  const perdido = acharPorTipoOuNome(sorted, "Cancelado", /perdid/i);

  const emNegociacaoId = emNegociacao?.id_vhsys ?? null;
  const aprovadoId = aprovado?.id_vhsys ?? null;
  const perdidoId = perdido?.id_vhsys ?? null;

  const tipoPorId: Record<number, TipoStatusOrc> = {};
  const nomePorId: Record<number, string> = {};
  for (const s of sorted) {
    tipoPorId[s.id_vhsys] = s.tipo_status as TipoStatusOrc;
    nomePorId[s.id_vhsys] = s.nome;
  }
  // Coluna virtual "Em andamento".
  tipoPorId[ORC_EM_ANDAMENTO_VIRTUAL] = "Em Andamento";
  nomePorId[ORC_EM_ANDAMENTO_VIRTUAL] = "Em andamento";

  // Ordem do fluxo: negociação → andamento (virtual) → aprovado → perdido.
  const colunas = [emNegociacaoId, ORC_EM_ANDAMENTO_VIRTUAL, aprovadoId, perdidoId].filter(
    (id): id is number => id !== null
  );

  return {
    colunas,
    emNegociacaoId,
    aprovadoId,
    perdidoId,
    emAndamentoVirtual: ORC_EM_ANDAMENTO_VIRTUAL,
    tipoPorId,
    nomePorId,
    legado: {
      emAberto: emNegociacaoId,
      emAndamento: ORC_EM_ANDAMENTO_VIRTUAL,
      atendido: aprovadoId,
      cancelado: perdidoId,
    },
  };
}

// ── Helpers (operam sobre o modelo) ─────────────────────────────────────────

export function ehColunaOrcamento(m: ModeloOrcamento, id: number): boolean {
  return m.colunas.includes(id);
}

/** tipo_status a enviar no POST /status ao mover para uma situação de orçamento. */
export function tipoStatusOrcamentoDe(m: ModeloOrcamento, id: number): TipoStatusOrc | null {
  return m.tipoPorId[id] ?? null;
}

/** Transição permitida: de≠para e destino é coluna conhecida. */
export function transicaoOrcamentoPermitida(
  m: ModeloOrcamento,
  de: number | null,
  para: number
): boolean {
  if (de === para) return false;
  return m.colunas.includes(para);
}

/** Fallback legado: orçamento sem situação personalizada → situação da conta. */
export function situacaoEfetivaOrcamento(
  m: ModeloOrcamento,
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
    case "Aprovado":
      return { situacaoId: m.legado.atendido, origem: "legado" };
    case "Cancelado":
      return { situacaoId: m.legado.cancelado, origem: "legado" };
    default:
      return { situacaoId: null, origem: "legado" };
  }
}
