// Margem de um orçamento item a item — contas puras, com as fórmulas da aba
// Produtos (precificacao.ts). Sem custo cadastrado ou serviço, o item fica de
// fora do total e é listado à parte: nada é estimado.

import { custoLiquido, difalPct, ehServico, margem, precoEquilibrio, somaTaxas, type TaxasProduto } from "@/lib/produtos/precificacao";

export interface ItemOrcamento {
  idProduto: number | null;
  descricao: string;
  qtde: number;
  valorUnit: number;
  /** Desconto do item em %, como o CRM exibe. */
  descontoPct: number;
}

export interface Descontos {
  /** Desconto do orçamento em R$. */
  absoluto: number;
  /** Desconto do orçamento em %. */
  percentual: number;
}

const arred = (n: number | null, casas = 2) => (n === null ? null : Number(n.toFixed(casas)));
const pct = (f: number | null) => (f === null ? null : arred(f * 100));

/** Campos de custo de um produto, como devolvidos ao consumidor do MCP. */
export function detalharCusto(t: TaxasProduto, icmsAtual: number, venda: number | null) {
  const pctDifal = difalPct(t.creditoIcms, icmsAtual);
  return {
    preco_custo: arred(t.precoCusto),
    frete: arred(t.frete ?? 0),
    credito_icms_pct: pct(t.creditoIcms),
    difal_pct: pct(pctDifal),
    difal: t.precoCusto === null ? null : arred(pctDifal * t.precoCusto),
    custo_liquido: arred(custoLiquido(t, icmsAtual)),
    despesas_venda_pct: pct(somaTaxas(t)),
    preco_equilibrio: arred(precoEquilibrio(t, icmsAtual)),
    valor_venda: arred(venda),
    margem_pct: pct(margem(t, icmsAtual, venda)),
  };
}

export function calcularMargem(
  itens: ItemOrcamento[],
  descontos: Descontos,
  custos: Map<number, TaxasProduto>,
  icmsAtual: number
) {
  const bruto = (i: ItemOrcamento) => i.qtde * i.valorUnit * (1 - i.descontoPct / 100);
  const subtotal = itens.reduce((s, i) => s + bruto(i), 0);
  // O desconto do orçamento é rateado entre os itens pelo valor de cada um.
  const fator = subtotal > 0 ? 1 - descontos.percentual / 100 - descontos.absoluto / subtotal : 1;

  const calculados = [];
  const foraDoCalculo: { descricao: string; motivo: string; valor: number | null }[] = [];
  let vendaTotal = 0;
  let lucroTotal = 0;

  for (const item of itens) {
    const valor = arred(bruto(item) * fator);
    if (ehServico(item.descricao)) {
      foraDoCalculo.push({ descricao: item.descricao, motivo: "serviço", valor });
      continue;
    }
    const custo = item.idProduto === null ? undefined : custos.get(item.idProduto);
    const liquido = custo ? custoLiquido(custo, icmsAtual) : null;
    if (!custo || liquido === null) {
      foraDoCalculo.push({ descricao: item.descricao, motivo: "produto sem custo na aba Produtos", valor });
      continue;
    }
    const vendaUnit = item.qtde > 0 ? (bruto(item) * fator) / item.qtde : 0;
    const lucroUnit = vendaUnit - liquido - somaTaxas(custo) * vendaUnit;
    vendaTotal += vendaUnit * item.qtde;
    lucroTotal += lucroUnit * item.qtde;
    calculados.push({
      descricao: item.descricao,
      id_produto: item.idProduto,
      qtde: item.qtde,
      venda_unit_com_descontos: arred(vendaUnit),
      lucro_unit: arred(lucroUnit),
      lucro_total: arred(lucroUnit * item.qtde),
      ...detalharCusto(custo, icmsAtual, vendaUnit),
    });
  }

  return {
    itens: calculados,
    fora_do_calculo: foraDoCalculo,
    venda_considerada: arred(vendaTotal),
    lucro: arred(lucroTotal),
    margem_pct: vendaTotal > 0 ? pct(lucroTotal / vendaTotal) : null,
  };
}
