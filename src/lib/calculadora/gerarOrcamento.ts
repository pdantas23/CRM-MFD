// Ponte calculadora → orçamento. A calculadora guarda os itens calculados
// (nome GENÉRICO + quantidade) e o form de Novo Orçamento os lê ao abrir. Como
// os nomes da calculadora não batem com os produtos cadastrados, o usuário
// escolhe o produto real de cada linha lá (o nome genérico fica como dica).

export interface ItemOrcamentoCalc {
  descricao: string;
  quantidade: number;
  unidade: string;
}

const CHAVE = "calculadora-orcamento-itens";
export const URL_NOVO_ORCAMENTO = "/orcamentos/novo?origem=calculadora";

/** Guarda os itens (só os com quantidade > 0) e retorna a URL do form, ou null. */
export function prepararItensOrcamento(itens: ItemOrcamentoCalc[]): string | null {
  const validos = itens.filter((i) => i.quantidade > 0 && i.descricao.trim() !== "");
  if (validos.length === 0) return null;
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(validos));
  } catch {
    return null;
  }
  return URL_NOVO_ORCAMENTO;
}

/** Lê e CONSOME (remove) os itens salvos pela calculadora. */
export function lerItensDaCalculadora(): ItemOrcamentoCalc[] {
  try {
    const raw = sessionStorage.getItem(CHAVE);
    if (!raw) return [];
    sessionStorage.removeItem(CHAVE);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is ItemOrcamentoCalc =>
        !!i &&
        typeof i.descricao === "string" &&
        typeof i.quantidade === "number" &&
        typeof i.unidade === "string",
    );
  } catch {
    return [];
  }
}
