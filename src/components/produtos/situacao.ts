// Situação de um produto frente ao VHSYS — usada pela linha (indicador) e pelo
// filtro da tabela.
import type { LinhaProduto } from "@/lib/produtos/dados";
import { centavos, custoLiquido, precoEquilibrio } from "@/lib/produtos/precificacao";

import type { ResultadoEnvio } from "@/lib/produtos/acoes";

export type Situacao = "ok" | "divergente" | "erro" | "sem_vhsys" | "novo";

export function situacaoDe(l: LinhaProduto, icmsAtual: number): Situacao {
  if (l.idVhsys === null || l.vhsys === null) return "sem_vhsys";
  if (l.id === null) return "novo";
  if (l.erroEnvio) return "erro";
  const liq = custoLiquido(l, icmsAtual);
  const venda = l.valorVenda ?? precoEquilibrio(l, icmsAtual);
  const difere = (esperado: number | null, atual: number | null) =>
    esperado !== null && (atual === null || Math.abs(centavos(esperado) - atual) >= 0.01);
  const fornecedorDifere = l.fornecedorId !== null && l.fornecedorId !== l.vhsys.fornecedorId;
  const nomeDifere = l.nomeEditado !== null && l.nomeEditado !== l.vhsys.nome;
  return difere(liq, l.vhsys.valorCusto) || difere(venda, l.vhsys.valor) || fornecedorDifere || nomeDifere
    ? "divergente"
    : "ok";
}

/** Linha depois de um envio ao VHSYS (sucesso: espelho atualizado e nome confirmado). */
export function aplicarEnvio(l: LinhaProduto, res: ResultadoEnvio): LinhaProduto {
  if (!res.ok) return { ...l, erroEnvio: res.erro ?? "Falha no envio." };
  return {
    ...l,
    vhsys: res.vhsys ?? l.vhsys,
    produto: res.vhsys?.nome || l.produto,
    nomeEditado: null,
    enviadoEm: res.enviadoEm ?? l.enviadoEm,
    erroEnvio: null,
  };
}

/**
 * Alterado no CRM depois do último envio e ainda diferente do VHSYS — o que o
 * botão "Enviar alterados" envia.
 */
export function pendenteEnvio(l: LinhaProduto, icmsAtual: number): boolean {
  if (!l.id || !l.alteradoEm) return false;
  if (l.enviadoEm && l.alteradoEm <= l.enviadoEm) return false;
  const s = situacaoDe(l, icmsAtual);
  return s === "divergente" || s === "erro";
}

// Precificação pelo CRM = último envio com sucesso ao VHSYS (enviadoEm), que
// grava custo/venda e o bloco "[Precificação CRM — data · autor]". Edições ou
// custo de nota sem envio não contam. Produto sem VHSYS não entra (não há envio).
const DIA = 86_400_000;
const FUSO_MS = 3 * 3_600_000; // America/Fortaleza = UTC−3, sem horário de verão
const diaLocal = (ms: number) => Math.floor((ms - FUSO_MS) / DIA);

export const DIAS_PRECIFICACAO_ANTIGA = 90;

/** Dias (de calendário, em Fortaleza) desde a última precificação; null = nunca. */
export function diasDesdePrecificacao(l: LinhaProduto, agora: number = Date.now()): number | null {
  if (!l.enviadoEm) return null;
  const t = Date.parse(l.enviadoEm);
  return Number.isNaN(t) ? null : Math.max(0, diaLocal(agora) - diaLocal(t));
}

export function nuncaPrecificado(l: LinhaProduto): boolean {
  return l.idVhsys !== null && l.vhsys !== null && !l.enviadoEm;
}

/** "hoje", "ontem", "há 5 dias", "há 3 meses", "há 1 ano". */
export function tempoRelativo(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 60) return `há ${dias} dias`;
  if (dias < 365) return `há ${Math.floor(dias / 30)} meses`;
  const anos = Math.floor(dias / 365);
  return `há ${anos} ano${anos > 1 ? "s" : ""}`;
}

/** Data e hora da precificação em Fortaleza ("11/11/2026 14:30"). */
export function dataHoraPrecificacao(iso: string): string {
  return new Date(iso)
    .toLocaleString("pt-BR", {
      timeZone: "America/Fortaleza",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}
