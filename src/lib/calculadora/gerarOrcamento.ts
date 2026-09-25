// Ponte calculadora → orçamento. A calculadora guarda os itens calculados
// (nome GENÉRICO + quantidade) e o form de Novo Orçamento os lê ao abrir. Como
// os nomes da calculadora não batem com os produtos cadastrados, o usuário
// escolhe o produto real de cada linha lá (o nome genérico fica como dica).

export interface ItemOrcamentoCalc {
  descricao: string;
  quantidade: number;
  unidade: string;
}

/** Carga da ponte: itens + observação opcional (dados discriminados do cálculo). */
export interface CargaOrcamentoCalc {
  itens: ItemOrcamentoCalc[];
  observacao: string;
}

const CHAVE = "calculadora-orcamento-itens";
export const URL_NOVO_ORCAMENTO = "/orcamentos/novo?origem=calculadora";

function ehItem(i: unknown): i is ItemOrcamentoCalc {
  return (
    !!i &&
    typeof (i as ItemOrcamentoCalc).descricao === "string" &&
    typeof (i as ItemOrcamentoCalc).quantidade === "number" &&
    typeof (i as ItemOrcamentoCalc).unidade === "string"
  );
}

/**
 * Guarda os itens (só os com quantidade > 0) e uma observação opcional, e
 * retorna a URL do form — ou null se não houver item válido.
 */
export function prepararItensOrcamento(itens: ItemOrcamentoCalc[], observacao = ""): string | null {
  const validos = itens.filter((i) => i.quantidade > 0 && i.descricao.trim() !== "");
  if (validos.length === 0) return null;
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ itens: validos, observacao }));
  } catch {
    return null;
  }
  return URL_NOVO_ORCAMENTO;
}

/** Lê e CONSOME (remove) a carga salva pela calculadora (itens + observação). */
export function lerItensDaCalculadora(): CargaOrcamentoCalc {
  const vazio: CargaOrcamentoCalc = { itens: [], observacao: "" };
  try {
    const raw = sessionStorage.getItem(CHAVE);
    if (!raw) return vazio;
    sessionStorage.removeItem(CHAVE);
    const parsed: unknown = JSON.parse(raw);
    // Aceita o formato novo ({ itens, observacao }) e o antigo (array puro de itens).
    const itensRaw: unknown = Array.isArray(parsed) ? parsed : (parsed as CargaOrcamentoCalc)?.itens;
    if (!Array.isArray(itensRaw)) return vazio;
    const observacao =
      !Array.isArray(parsed) && typeof (parsed as CargaOrcamentoCalc)?.observacao === "string"
        ? (parsed as CargaOrcamentoCalc).observacao
        : "";
    return { itens: itensRaw.filter(ehItem), observacao };
  } catch {
    return vazio;
  }
}
