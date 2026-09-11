// Total do orçamento reconstruído do SUBTOTAL DOS PRODUTOS (valor_total_produtos)
// + frete − descontos. Preferido ao valor_total_nota: a API às vezes devolve o
// valor_total_nota INCOMPLETO (acumulador que perde o 1º item, ex.: orçamento
// #310), enquanto valor_total_produtos reflete a soma real dos itens. Se o
// subtotal não vier, cai no valor_total_nota.

import type { VhsysOrcamento } from "./types";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** valor_total do orçamento; corrige o valor_total_nota quando ele perde itens. */
export function valorTotalOrcamento(orc: VhsysOrcamento): number | null {
  const o = orc as Record<string, unknown>;
  const notaRaw = o.valor_total_nota;
  const nota =
    notaRaw === undefined || notaRaw === null || notaRaw === "" || !Number.isFinite(Number(notaRaw))
      ? null
      : Number(notaRaw);

  const produtos = num(o.valor_total_produtos);
  if (produtos > 0) {
    const frete = num(o.frete_pedido);
    const descAbs = num(o.desconto_pedido);
    const descPorc = num(o.desconto_pedido_porc);
    // Subtotal dos produtos já com desconto. O valor_total_nota NUNCA deveria
    // ser menor que isso (frete e impostos só somam). Se for, um item se perdeu
    // no acumulador da VHSYS (bug do #310) → reconstrói. Senão, confia na nota
    // (que pode incluir IPI/ST que o subtotal não tem).
    const base = produtos * (1 - descPorc / 100) - descAbs;
    if (nota === null || nota < base - 0.01) {
      return Number((base + frete).toFixed(2));
    }
  }
  return nota;
}

/** Total a partir dos itens que ESTAMOS enviando (autoritativo em criar). */
export function valorTotalDosItens(
  itens: { qtde_produto: number; valor_unit_produto: number }[],
  opcoes?: { frete?: string | number; descontoAbs?: string | number; descontoPorc?: string | number },
): number {
  const totalProdutos = itens.reduce((s, i) => s + num(i.qtde_produto) * num(i.valor_unit_produto), 0);
  const frete = num(opcoes?.frete);
  const descAbs = num(opcoes?.descontoAbs);
  const descPorc = num(opcoes?.descontoPorc);
  return Number((totalProdutos * (1 - descPorc / 100) - descAbs + frete).toFixed(2));
}
