// Normalização de parcelas para o formato que a API VHSYS exige.
// A API rejeita valores com muitas casas decimais ("O formato do campo
// (valor_parcela) não é válido"): um split como total/3 = 410.3766… precisa
// virar "410.38". Enviamos valor_parcela como STRING de 2 casas (como no exemplo
// da doc, "100.00") e a ÚLTIMA parcela absorve o arredondamento para a soma das
// parcelas fechar exatamente o total.

import type { PayloadParcelaOrcamento, PayloadParcelaPedido } from "./types";

type ParcelaComValorNumerico = PayloadParcelaOrcamento | PayloadParcelaPedido;

/** Substitui valor_parcela (número) por string decimal de 2 casas. */
export function parcelasParaEnvio<T extends ParcelaComValorNumerico>(
  parcelas: T[],
): (Omit<T, "valor_parcela"> & { valor_parcela: string })[] {
  const n = parcelas.length;
  const totalCent = Math.round(
    parcelas.reduce((s, p) => s + (Number(p.valor_parcela) || 0), 0) * 100,
  );
  let acumulado = 0;
  return parcelas.map((p, i) => {
    // Todas menos a última: arredonda ao centavo. A última: o que faltar para o total.
    const cent = i < n - 1 ? Math.round((Number(p.valor_parcela) || 0) * 100) : totalCent - acumulado;
    acumulado += cent;
    return { ...p, valor_parcela: (cent / 100).toFixed(2) };
  });
}
