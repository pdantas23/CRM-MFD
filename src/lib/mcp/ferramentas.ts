// Ferramentas do MCP (IA externa) — SERVER-ONLY. Consultas, mais uma única
// escrita: `alterar_margem`, que grava só no CRM (o envio ao VHSYS segue manual).
// Service role, sem sessão: por isso cada ferramenta devolve só campos listados
// aqui, nunca o jsonb `dados`, CPF/CNPJ, endereço, telefone, e-mail ou observações.

import { createAdminClient } from "@/lib/supabase/admin";
import { getContaComTokensPorId, listarContasAtivas, type Account } from "@/lib/accounts/repo";
import { runComTokensVhsys, vhsysGet } from "@/lib/vhsys/client";
import { carregarConfigs } from "@/lib/produtos/dados";
import { centavos, custoLiquido, vendaParaMargem, type TaxasProduto } from "@/lib/produtos/precificacao";
import { calcularMargem, detalharCusto, type ItemOrcamento } from "./margem";

/** Erro de uso (argumento inválido, não encontrado): volta como texto à IA. */
export class ErroFerramenta extends Error {}

type Args = Record<string, unknown>;

const LIMITE = 20;
const AVISO_CUSTO_ATUAL =
  "A margem usa o custo ATUAL cadastrado, não o custo da data do orçamento. Itens com custo_alterado_depois=true tiveram o custo mudado depois do orçamento.";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function texto(v: unknown, campo: string): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > 100) throw new ErroFerramenta(`${campo} inválido.`);
  return v.trim() || undefined;
}

function numeroDocumento(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new ErroFerramenta("numero inválido.");
  return n;
}

const padraoIlike = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;

async function contasAlvo(conta: unknown): Promise<Account[]> {
  const contas = await listarContasAtivas();
  const slug = texto(conta, "conta")?.toLowerCase();
  if (!slug) return contas;
  const achadas = contas.filter((c) => c.slug === slug);
  if (!achadas.length) throw new ErroFerramenta(`Conta inválida. Use: ${contas.map((c) => c.slug).join(", ")}.`);
  return achadas;
}

interface PrecificacaoRow {
  conta_id: string;
  id_vhsys: number;
  nome: string | null;
  secao: string | null;
  preco_custo: unknown;
  frete: unknown;
  credito_icms: unknown;
  custo_op: unknown;
  comissao: unknown;
  imposto_saida: unknown;
  valor_venda: unknown;
  ultima_compra: string | null;
  alterado_em: string | null;
}

const COLUNAS_PRECIFICACAO =
  "conta_id, id_vhsys, nome, secao, preco_custo, frete, credito_icms, custo_op, comissao, imposto_saida, valor_venda, ultima_compra, alterado_em";

const paraTaxas = (r: PrecificacaoRow): TaxasProduto => ({
  precoCusto: num(r.preco_custo),
  frete: num(r.frete),
  creditoIcms: num(r.credito_icms),
  custoOp: num(r.custo_op) ?? 0,
  comissao: num(r.comissao) ?? 0,
  impostoSaida: num(r.imposto_saida) ?? 0,
});

async function precificacaoDe(contaId: string, ids: number[]): Promise<PrecificacaoRow[]> {
  if (!ids.length) return [];
  const { data, error } = await createAdminClient()
    .from("precificacao_produtos")
    .select(COLUNAS_PRECIFICACAO)
    .eq("conta_id", contaId)
    .in("id_vhsys", ids);
  if (error) throw new Error(`precificacao_produtos: ${error.message}`);
  return (data ?? []) as PrecificacaoRow[];
}

async function buscarOrcamento(args: Args) {
  const numero = numeroDocumento(args.numero);
  const cliente = texto(args.cliente, "cliente");
  if (!numero && !cliente) throw new ErroFerramenta("Informe numero ou cliente.");
  const contas = await contasAlvo(args.conta);
  const slug = new Map(contas.map((c) => [c.id, c.slug]));

  let consulta = createAdminClient()
    .from("vhsys_orcamentos")
    .select("conta_id, numero, nome_cliente, vendedor_nome, valor_total, status_base, pedido_emitido, data_orcamento, validade")
    .in("conta_id", contas.map((c) => c.id))
    .eq("lixeira", false);
  if (numero) consulta = consulta.eq("numero", numero);
  if (cliente) consulta = consulta.ilike("nome_cliente", padraoIlike(cliente));
  const { data, error } = await consulta.order("data_orcamento", { ascending: false }).limit(LIMITE);
  if (error) throw new Error(`vhsys_orcamentos: ${error.message}`);

  return {
    orcamentos: (data ?? []).map((o) => ({
      conta: slug.get(o.conta_id as string),
      numero: o.numero,
      cliente: o.nome_cliente,
      vendedor: o.vendedor_nome,
      valor_total: num(o.valor_total),
      status: o.status_base,
      pedido_emitido: o.pedido_emitido,
      data: o.data_orcamento,
      validade: o.validade,
    })),
  };
}

function lerItens(brutos: unknown[]): ItemOrcamento[] {
  return brutos.map((b) => {
    const i = b as Record<string, unknown>;
    const id = num(i.id_produto);
    return {
      idProduto: id !== null && id > 0 ? id : null,
      descricao: String(i.desc_produto ?? "").trim(),
      qtde: num(i.qtde_produto) ?? 0,
      valorUnit: num(i.valor_unit_produto) ?? 0,
      descontoPct: num(i.desconto_produto) ?? 0,
    };
  });
}

async function explicarMargem(args: Args) {
  const numero = numeroDocumento(args.numero);
  if (!numero) throw new ErroFerramenta("Informe o numero do orçamento.");
  const contas = await contasAlvo(args.conta);
  const slug = new Map(contas.map((c) => [c.id, c.slug]));

  const { data, error } = await createAdminClient()
    .from("vhsys_orcamentos")
    .select("id_vhsys, conta_id, numero, nome_cliente, valor_total, status_base, data_orcamento, dados")
    .in("conta_id", contas.map((c) => c.id))
    .eq("numero", numero)
    .eq("lixeira", false);
  if (error) throw new Error(`vhsys_orcamentos: ${error.message}`);
  if (!data?.length) throw new ErroFerramenta(`Orçamento ${numero} não encontrado.`);
  if (data.length > 1) {
    throw new ErroFerramenta(
      `Orçamento ${numero} existe em mais de uma conta (${data.map((o) => slug.get(o.conta_id as string)).join(", ")}). Informe conta.`
    );
  }

  const orc = data[0];
  const contaId = orc.conta_id as string;
  const dados = (orc.dados ?? {}) as Record<string, unknown>;
  let brutos: unknown[] = Array.isArray(dados.produtos) ? dados.produtos : [];
  if (!brutos.length) {
    const conta = await getContaComTokensPorId(contaId);
    if (!conta) throw new Error("Conta sem credenciais VHSYS.");
    const { data: itens } = await runComTokensVhsys(conta.tokens, () =>
      vhsysGet<unknown[]>(`/orcamentos/${orc.id_vhsys}/produtos`)
    );
    brutos = Array.isArray(itens) ? itens : [];
  }

  const itens = lerItens(brutos);
  const ids = Array.from(new Set(itens.map((i) => i.idProduto).filter((i): i is number => i !== null)));
  const [linhas, configs] = await Promise.all([precificacaoDe(contaId, ids), carregarConfigs([contaId])]);
  const custos = new Map(linhas.map((r) => [Number(r.id_vhsys), paraTaxas(r)]));
  const icmsAtual = configs.get(contaId)!.icmsAtual;
  const dataOrc = orc.data_orcamento as string | null;
  const alterado = new Map(
    linhas.map((r) => [Number(r.id_vhsys), Boolean(dataOrc && r.alterado_em && r.alterado_em.slice(0, 10) > dataOrc)])
  );

  const resultado = calcularMargem(
    itens,
    { absoluto: num(dados.desconto_pedido) ?? 0, percentual: num(dados.desconto_pedido_porc) ?? 0 },
    custos,
    icmsAtual
  );

  return {
    conta: slug.get(contaId),
    numero: orc.numero,
    cliente: orc.nome_cliente,
    status: orc.status_base,
    data: dataOrc,
    valor_total: num(orc.valor_total),
    frete_cobrado_do_cliente: num(dados.frete_pedido) ?? 0,
    ...resultado,
    itens: resultado.itens.map((i) => ({ ...i, custo_alterado_depois: alterado.get(i.id_produto as number) ?? false })),
    como_calcular:
      "custo líquido = custo + frete + DIFAL; margem = 1 − custo líquido ÷ venda − despesas da venda; venda já com descontos do item e do orçamento. O frete cobrado do cliente não entra na margem.",
    aviso: AVISO_CUSTO_ATUAL,
  };
}

async function buscarProduto(args: Args) {
  const busca = texto(args.busca, "busca");
  if (!busca) throw new ErroFerramenta("Informe busca.");
  const contas = await contasAlvo(args.conta);
  const configs = await carregarConfigs(contas.map((c) => c.id));

  const porConta = await Promise.all(
    contas.map(async (conta) => {
      const { data, error } = await createAdminClient()
        .from("vhsys_produtos")
        .select("id_vhsys, descricao, valor")
        .eq("conta_id", conta.id)
        .eq("lixeira", false)
        .ilike("descricao", padraoIlike(busca))
        .limit(LIMITE);
      if (error) throw new Error(`vhsys_produtos: ${error.message}`);
      const espelho = (data ?? []) as { id_vhsys: number; descricao: string; valor: unknown }[];
      const linhas = await precificacaoDe(conta.id, espelho.map((e) => e.id_vhsys));
      const registro = new Map(linhas.map((r) => [Number(r.id_vhsys), r]));
      const icmsAtual = configs.get(conta.id)!.icmsAtual;

      return espelho.map((e) => {
        const r = registro.get(Number(e.id_vhsys));
        const base = { conta: conta.slug, id_produto: e.id_vhsys, produto: r?.nome || e.descricao.trim() };
        if (!r) return { ...base, sem_precificacao: true, valor_venda_vhsys: num(e.valor) };
        return {
          ...base,
          secao: r.secao,
          ultima_compra: r.ultima_compra,
          ...detalharCusto(paraTaxas(r), icmsAtual, num(r.valor_venda) ?? num(e.valor)),
        };
      });
    })
  );
  return { produtos: porConta.flat() };
}

const MARGEM_MIN_PCT = 0;
const MARGEM_MAX_PCT = 80;

async function alterarMargem(args: Args) {
  const idProduto = numeroDocumento(args.id_produto);
  if (!idProduto) throw new ErroFerramenta("Informe id_produto.");
  const margemPct = typeof args.margem_pct === "number" ? args.margem_pct : NaN;
  if (!Number.isFinite(margemPct) || margemPct < MARGEM_MIN_PCT || margemPct > MARGEM_MAX_PCT) {
    throw new ErroFerramenta(`margem_pct deve ficar entre ${MARGEM_MIN_PCT} e ${MARGEM_MAX_PCT}.`);
  }
  if (!texto(args.conta, "conta")) throw new ErroFerramenta("Informe conta.");
  const [conta] = await contasAlvo(args.conta);

  const [linha] = await precificacaoDe(conta.id, [idProduto]);
  if (!linha) throw new ErroFerramenta("Produto sem precificação na aba Produtos.");
  const taxas = paraTaxas(linha);
  const icmsAtual = (await carregarConfigs([conta.id])).get(conta.id)!.icmsAtual;
  if (custoLiquido(taxas, icmsAtual) === null) throw new ErroFerramenta("Produto sem custo cadastrado.");
  const venda = vendaParaMargem(taxas, icmsAtual, margemPct / 100);
  if (venda === null) throw new ErroFerramenta("Margem impossível com as despesas deste produto.");

  const novaVenda = centavos(venda);
  const agora = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("precificacao_produtos")
    .update({ valor_venda: novaVenda, atualizado_em: agora, alterado_em: agora, atualizado_por: null })
    .eq("conta_id", conta.id)
    .eq("id_vhsys", idProduto)
    .select("id_vhsys");
  if (error) throw new Error(`precificacao_produtos: ${error.message}`);
  if (!data?.length) throw new ErroFerramenta("Produto sem precificação na aba Produtos.");
  console.info(`[mcp] alterar_margem conta=${conta.slug} produto=${idProduto} venda ${num(linha.valor_venda)} -> ${novaVenda}`);

  return {
    conta: conta.slug,
    id_produto: idProduto,
    valor_venda_anterior: num(linha.valor_venda),
    ...detalharCusto(taxas, icmsAtual, novaVenda),
    aviso: "Salvo só no CRM. O novo preço só vale no VHSYS depois de enviado na aba Produtos.",
  };
}

const CONTA = { type: "string", description: "Conta (slug), ex.: sa ou kcm. Sem ela, busca em todas." };

export const FERRAMENTAS = [
  {
    name: "buscar_orcamento",
    description: "Encontra orçamentos por número ou nome do cliente. Devolve dados resumidos, sem documentos ou contatos do cliente.",
    inputSchema: {
      type: "object",
      properties: {
        numero: { type: "integer", description: "Número do orçamento." },
        cliente: { type: "string", description: "Parte do nome do cliente." },
        conta: CONTA,
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    executar: buscarOrcamento,
  },
  {
    name: "explicar_margem",
    description: "Calcula a margem de um orçamento item a item, com custo, frete, DIFAL, despesas e lucro. Use estes números, sem recalcular.",
    inputSchema: {
      type: "object",
      properties: { numero: { type: "integer", description: "Número do orçamento." }, conta: CONTA },
      required: ["numero"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    executar: explicarMargem,
  },
  {
    name: "buscar_produto",
    description: "Busca produtos pelo nome e devolve a precificação: custo, frete, DIFAL, custo líquido, preço de equilíbrio, venda e margem.",
    inputSchema: {
      type: "object",
      properties: { busca: { type: "string", description: "Parte do nome do produto." }, conta: CONTA },
      required: ["busca"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    executar: buscarProduto,
  },
  {
    name: "alterar_margem",
    description:
      "Altera a margem de um produto: recalcula e grava o valor de venda no CRM. Não envia ao VHSYS. Confirme com o usuário produto, conta e margem antes de chamar; pegue id_produto em buscar_produto.",
    inputSchema: {
      type: "object",
      properties: {
        id_produto: { type: "integer", description: "id_produto devolvido por buscar_produto." },
        conta: { type: "string", description: "Conta (slug), ex.: sa ou kcm." },
        margem_pct: { type: "number", description: "Margem desejada em %, de 0 a 80. Ex.: 15 para 15%." },
      },
      required: ["id_produto", "conta", "margem_pct"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    executar: alterarMargem,
  },
];
