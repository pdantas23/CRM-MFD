// Precificação de produtos — contas puras (mesmas fórmulas da planilha
// "Produtos - Modular"). Sem "use server": usado no server e no client.
//
//   Custo líquido = custo + frete + DIFAL
//     DIFAL (fração do custo, ver difalPct):
//       crédito em branco → zero (compra interna)
//       crédito ≥ 0%      → diferença simples de alíquotas: ICMS atual − crédito
//                           (0% → 22,5% cheio; 4% → 18,5%). Escolha do negócio: não
//                           usa a base dupla da SEFAZ, que dá um DIFAL maior.
//   Preço de equilíbrio = custo líquido ÷ (1 − (op + comissão + imposto))
//   Margem = 1 − custo líquido ÷ venda − (op + comissão + imposto)
//
// Todos os % são frações (0.0982 = 9,82%) e "por dentro" do preço de venda.

export interface TaxasProduto {
  precoCusto: number | null;
  frete: number | null;
  /** null = compra interna (sem DIFAL); 0 ou mais = DIFAL de (ICMS atual − crédito). */
  creditoIcms: number | null;
  custoOp: number;
  comissao: number;
  impostoSaida: number;
}

export interface ConfigPrecificacao {
  contaId: string;
  icmsAtual: number;
  custoOpPadrao: number;
  comissaoPadrao: number;
  impostoSaidaPadrao: number;
}

export const CONFIG_PADRAO: Omit<ConfigPrecificacao, "contaId"> = {
  icmsAtual: 0.225,
  custoOpPadrao: 0.07,
  comissaoPadrao: 0.02,
  impostoSaidaPadrao: 0.0982,
};

export const SEM_SECAO = "Sem seção";

// Ordem das seções da planilha; seções desconhecidas vão antes de "Sem seção".
export const ORDEM_SECOES = [
  "Placas de drywall",
  "Perfis de drywall (paredes)",
  "Estrutura e acabamento de forro drywall",
  "Perfis de forro modular",
  "Forros (placas) e arremates",
  "Placas cimentícias e fachada",
  "Painéis acústicos e decorativos",
  "Divisórias e portas",
  "Massas, colas e argamassas",
  "Fitas e telas",
  "Fixação",
  "Isolamento",
  "Pisos, rodapés e mantas",
  "Ferramentas",
  "Outros",
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Fornecimento/instalação e mão de obra não entram na precificação (mesmo
// critério usado para montar a planilha).
const SERVICO =
  /^(fornecimento|instala|mao de obra|servico)|fornecimento e instala|pintura|servico eletrico/;

export function ehServico(descricao: string): boolean {
  return SERVICO.test(normalizar(descricao));
}

export function somaTaxas(t: Pick<TaxasProduto, "custoOp" | "comissao" | "impostoSaida">): number {
  return t.custoOp + t.comissao + t.impostoSaida;
}

/** DIFAL como fração do custo (regras no topo do arquivo). */
export function difalPct(creditoIcms: number | null, icmsAtual: number): number {
  if (creditoIcms === null) return 0;
  return Math.max(0, icmsAtual - creditoIcms);
}

export function custoLiquido(t: TaxasProduto, icmsAtual: number): number | null {
  if (t.precoCusto === null) return null;
  const difal = difalPct(t.creditoIcms, icmsAtual) * t.precoCusto;
  return t.precoCusto + (t.frete ?? 0) + difal;
}

export function precoEquilibrio(t: TaxasProduto, icmsAtual: number): number | null {
  const liq = custoLiquido(t, icmsAtual);
  const divisor = 1 - somaTaxas(t);
  if (liq === null || divisor <= 0) return null;
  return liq / divisor;
}

export function margem(t: TaxasProduto, icmsAtual: number, venda: number | null): number | null {
  const liq = custoLiquido(t, icmsAtual);
  if (liq === null || venda === null || venda <= 0) return null;
  return 1 - liq / venda - somaTaxas(t);
}

/** Venda que dá a margem pedida (inverso de `margem`). */
export function vendaParaMargem(t: TaxasProduto, icmsAtual: number, m: number): number | null {
  const liq = custoLiquido(t, icmsAtual);
  const divisor = 1 - somaTaxas(t) - m;
  if (liq === null || divisor <= 0) return null;
  return liq / divisor;
}

/** Arredonda em centavos (valores enviados ao VHSYS). */
export function centavos(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Bloco de precificação nas observações do produto no VHSYS ──────────────
// Fica entre marcadores e é SUBSTITUÍDO a cada envio; o resto do texto das
// observações é preservado.

const INICIO_BLOCO = "[Precificação CRM";
const FIM_BLOCO = "[/Precificação CRM]";
const RE_BLOCO = /\[Precificação CRM[^\]]*\][\s\S]*?\[\/Precificação CRM\]/;

const reais = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const porcento = (f: number | null) =>
  f === null ? "—" : `${(f * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** Texto da última precificação (custo → despesas → venda), com data e autor. */
export function blocoPrecificacao(
  t: TaxasProduto,
  icmsAtual: number,
  venda: number | null,
  autor: string,
  quando: Date = new Date()
): string {
  const liq = custoLiquido(t, icmsAtual);
  const equilibrio = precoEquilibrio(t, icmsAtual);
  const pctDifal = difalPct(t.creditoIcms, icmsAtual);
  const difal = t.precoCusto === null ? null : pctDifal * t.precoCusto;
  const vendaFinal = venda ?? equilibrio;
  const m = venda === null ? 0 : margem(t, icmsAtual, venda);
  const lucro = vendaFinal === null || liq === null ? null : vendaFinal - liq - somaTaxas(t) * vendaFinal;
  const data = quando.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return [
    `${INICIO_BLOCO} — ${data} · ${autor}]`,
    `Custo ${reais(t.precoCusto)} + frete ${reais(t.frete ?? 0)} + DIFAL ${porcento(pctDifal)} (${reais(difal)}) = custo líquido ${reais(liq)}`,
    `Despesas da venda: operacional ${porcento(t.custoOp)} · comissão ${porcento(t.comissao)} · imposto ${porcento(t.impostoSaida)} (total ${porcento(somaTaxas(t))})`,
    `Preço mínimo (equilíbrio): ${reais(equilibrio)}`,
    venda === null
      ? `Venda: ${reais(vendaFinal)} (sem margem — preço mínimo)`
      : `Venda: ${reais(vendaFinal)} · margem ${porcento(m)} · lucro ${reais(lucro)}`,
    FIM_BLOCO,
  ].join("\n");
}

/** Observações com o bloco de precificação trocado (ou acrescentado ao fim). */
export function obsComPrecificacao(obsAtual: string | null | undefined, bloco: string): string {
  const atual = (obsAtual ?? "").trim();
  // Função como substituto: o bloco tem "R$", que numa string seria padrão especial.
  if (RE_BLOCO.test(atual)) return atual.replace(RE_BLOCO, () => bloco);
  return atual ? `${atual}\n\n${bloco}` : bloco;
}

/** Cabeçalho do bloco (1ª linha) — usado para conferir que o VHSYS gravou. */
export const cabecalhoBloco = (bloco: string) => bloco.split("\n")[0];
