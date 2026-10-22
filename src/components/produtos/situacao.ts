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
