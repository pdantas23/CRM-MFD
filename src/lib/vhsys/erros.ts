// Traduz erros da API VHSYS (e de rede) em mensagens claras para o usuário.
// As mensagens cruas vêm técnicas, ex.:
//   VHSYS POST /pedidos/123/parcelas falhou (HTTP 403, code 403):
//     ["O formato do campo (valor_parcela) não é válido"]
// Aqui extraímos o essencial e explicamos em português o que houve.

import { VhsysApiError } from "./client";

// Nomes de campo da API → descrição legível.
const CAMPOS_LEGIVEIS: Record<string, string> = {
  valor_parcela: "o valor de uma parcela",
  data_parcela: "a data de uma parcela",
  forma_pagamento: "a forma de pagamento",
  valor_unit_produto: "o valor unitário de um produto",
  qtde_produto: "a quantidade de um produto",
  valor_custo_produto: "o custo de um produto",
  valor_total_nota: "o valor total",
  valor_total_produtos: "o total dos produtos",
  desconto_pedido: "o desconto",
  desconto_pedido_porc: "o desconto (%)",
  frete_pedido: "o frete",
  peso_total_nota: "o peso bruto",
  peso_total_nota_liq: "o peso líquido",
  nome_cliente: "o nome do cliente",
  data_pedido: "a data",
  id_produto: "o produto",
};

function maiuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extrai o "data" da VHSYS de dentro da mensagem técnica e limpa aspas/colchetes. */
function extrairDetalhe(raw: string): string {
  const apos = raw.match(/\):\s*([\s\S]+)$/); // tudo após "): "
  let d = (apos ? apos[1] : raw).trim();
  // ["mensagem"] ou "mensagem" → mensagem
  d = d.replace(/^\[\s*/, "").replace(/\s*\]$/, "").trim();
  d = d.replace(/^"/, "").replace(/"$/, "").trim();
  return d;
}

/** Mensagem amigável a partir de qualquer erro (VhsysApiError, rede, genérico). */
export function humanizarErroVhsys(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Rede / tempo esgotado
  if (/erro de rede|abort|timeout|network|fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(raw)) {
    return "Não foi possível falar com o VHSYS (conexão ou tempo esgotado). Verifique a internet e tente novamente.";
  }

  const detalhe = extrairDetalhe(raw);

  // "O formato do campo (X) não é válido"
  const fmt = detalhe.match(/formato do campo\s*\(?\s*([a-z_]+)\s*\)?/i);
  if (fmt) {
    const legivel = CAMPOS_LEGIVEIS[fmt[1]] ?? `o campo "${fmt[1]}"`;
    return `${maiuscula(legivel)} está em um formato inválido.`;
  }

  // "campo (X) é obrigatório" / "obrigatório"
  const obr = detalhe.match(/campo\s*\(?\s*([a-z_]+)\s*\)?[^.]*obrigat/i);
  if (obr) {
    const legivel = CAMPOS_LEGIVEIS[obr[1]] ?? `o campo "${obr[1]}"`;
    return `${maiuscula(legivel)} é obrigatório.`;
  }

  // Detalhe já legível em português (frase curta): usa como veio.
  if (detalhe && detalhe !== "null" && detalhe.length <= 200 && /[a-zà-ú]/i.test(detalhe)) {
    return maiuscula(detalhe.replace(/\s+/g, " "));
  }

  // 403 sem detalhe útil
  if (err instanceof VhsysApiError && err.httpStatus === 403) {
    return "O VHSYS recusou a operação (dados inválidos ou sem permissão). Confira os campos e tente novamente.";
  }
  if (err instanceof VhsysApiError && err.httpStatus >= 500) {
    return "O VHSYS está indisponível no momento. Tente novamente em instantes.";
  }

  return "Ocorreu um erro ao comunicar com o VHSYS. Tente novamente.";
}
