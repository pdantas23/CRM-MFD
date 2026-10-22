// Leitura da aba Produtos — SERVER-ONLY (service role: custos e margens não
// têm policy de leitura). Junta o espelho vhsys_produtos com as entradas de
// precificacao_produtos de cada conta permitida.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Account } from "@/lib/accounts/repo";
import { CONFIG_PADRAO, SEM_SECAO, ehServico, type ConfigPrecificacao } from "./precificacao";

/** Fornecedor do VHSYS (id + nome), por conta. */
export interface FornecedorVhsys {
  id: number;
  nome: string;
}

/** Linha da tabela — seguro para o client (sem segredos). */
export interface LinhaProduto {
  /** Chave estável: id do registro ou "contaId:idVhsys" para produto ainda sem registro. */
  chave: string;
  /** precificacao_produtos.id; null = produto do VHSYS ainda sem precificação salva. */
  id: string | null;
  contaId: string;
  contaSlug: string;
  idVhsys: number | null;
  /** Nome exibido: o renomeado no CRM (pendente de envio) ou o do VHSYS. */
  produto: string;
  /** Nome renomeado no CRM e ainda não enviado ao VHSYS; null = sem alteração. */
  nomeEditado: string | null;
  secao: string;
  precoCusto: number | null;
  frete: number | null;
  creditoIcms: number | null;
  custoOp: number;
  comissao: number;
  impostoSaida: number;
  valorVenda: number | null;
  /** Fornecedor desejado (id VHSYS): o escolhido no CRM ou, sem escolha, o atual do VHSYS. */
  fornecedorId: number | null;
  ultimaCompra: string | null;
  /** Nota de entrada cujo custo não pôde ser aplicado (ex.: unidade diferente). */
  avisoCompra: string | null;
  /** Valores atuais no VHSYS (espelho); null = sem cadastro ativo no VHSYS. */
  vhsys: { valor: number | null; valorCusto: number | null; fornecedorId: number | null; nome: string } | null;
  enviadoEm: string | null;
  erroEnvio: string | null;
  /** Última alteração de precificação no CRM (edição ou nota); null = só a carga inicial. */
  alteradoEm: string | null;
}

interface RegistroRow {
  id: string;
  conta_id: string;
  id_vhsys: number | null;
  produto: string;
  nome: string | null;
  secao: string | null;
  preco_custo: number | null;
  frete: number | null;
  credito_icms: number | null;
  custo_op: number;
  comissao: number;
  imposto_saida: number;
  valor_venda: number | null;
  fornecedor_id: number | null;
  ultima_compra: string | null;
  aviso_compra: string | null;
  enviado_vhsys_em: string | null;
  erro_envio: string | null;
  alterado_em: string | null;
}

interface EspelhoRow {
  conta_id: string;
  id_vhsys: number;
  descricao: string;
  valor: number | null;
  valor_custo: number | null;
  fornecedor_produto: string | null;
  fornecedor_produto_id: number | null;
}

interface ConfigRow {
  conta_id: string;
  icms_atual: number;
  custo_op_padrao: number;
  comissao_padrao: number;
  imposto_saida_padrao: number;
}

// numeric do Postgres chega como number ou string, conforme o driver.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 0/null = sem fornecedor (mesma convenção da tela Fornecedores).
const idFornecedor = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

const espelhoVhsys = (e: EspelhoRow) => ({
  valor: num(e.valor),
  valorCusto: num(e.valor_custo),
  fornecedorId: idFornecedor(e.fornecedor_produto_id),
  nome: e.descricao.trim(),
});

const positivo = (v: unknown) => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

export async function carregarConfigs(contaIds: string[]): Promise<Map<string, ConfigPrecificacao>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("precificacao_config")
    .select("conta_id, icms_atual, custo_op_padrao, comissao_padrao, imposto_saida_padrao")
    .in("conta_id", contaIds);
  if (error) throw new Error(`precificacao_config: ${error.message}`);
  const mapa = new Map<string, ConfigPrecificacao>();
  for (const id of contaIds) mapa.set(id, { contaId: id, ...CONFIG_PADRAO });
  for (const r of (data ?? []) as ConfigRow[]) {
    mapa.set(r.conta_id, {
      contaId: r.conta_id,
      icmsAtual: num(r.icms_atual) ?? CONFIG_PADRAO.icmsAtual,
      custoOpPadrao: num(r.custo_op_padrao) ?? CONFIG_PADRAO.custoOpPadrao,
      comissaoPadrao: num(r.comissao_padrao) ?? CONFIG_PADRAO.comissaoPadrao,
      impostoSaidaPadrao: num(r.imposto_saida_padrao) ?? CONFIG_PADRAO.impostoSaidaPadrao,
    });
  }
  return mapa;
}

async function carregarEspelho(contaId: string): Promise<EspelhoRow[]> {
  const admin = createAdminClient();
  const linhas: EspelhoRow[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await admin
      .from("vhsys_produtos")
      .select("conta_id, id_vhsys, descricao, valor, valor_custo, fornecedor_produto, fornecedor_produto_id")
      .eq("conta_id", contaId)
      .eq("lixeira", false)
      .order("id_vhsys")
      .range(de, de + 999);
    if (error) throw new Error(`vhsys_produtos: ${error.message}`);
    linhas.push(...((data ?? []) as EspelhoRow[]));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

/**
 * Fornecedores já usados nos produtos do VHSYS de uma conta (ordenados por
 * nome). Alguns produtos trazem só o id do fornecedor, com o nome vazio: vale
 * o nome de QUALQUER produto que o tenha; sem nenhum, o do cadastro em
 * vhsys_clientes (no VHSYS o fornecedor é um cadastro de cliente/fornecedor,
 * com o mesmo id).
 */
async function fornecedoresDaConta(contaId: string, espelho: EspelhoRow[]): Promise<FornecedorVhsys[]> {
  const mapa = new Map<number, string>();
  for (const e of espelho) {
    const id = idFornecedor(e.fornecedor_produto_id);
    if (!id) continue;
    const nome = e.fornecedor_produto?.trim() ?? "";
    if (!mapa.get(id)) mapa.set(id, nome);
  }

  const semNome = Array.from(mapa.entries())
    .filter(([, nome]) => !nome)
    .map(([id]) => id);
  if (semNome.length) {
    const { data } = await createAdminClient()
      .from("vhsys_clientes")
      .select("id_vhsys, razao, fantasia")
      .eq("conta_id", contaId)
      .in("id_vhsys", semNome);
    for (const c of (data ?? []) as { id_vhsys: number; razao: string | null; fantasia: string | null }[]) {
      const nome = c.razao?.trim() || c.fantasia?.trim();
      if (nome) mapa.set(Number(c.id_vhsys), nome);
    }
  }

  return Array.from(mapa.entries())
    .map(([id, nome]) => ({ id, nome: nome || `Fornecedor #${id}` }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function carregarProdutos(contas: Account[]): Promise<{
  linhas: LinhaProduto[];
  configs: ConfigPrecificacao[];
  fornecedores: Record<string, FornecedorVhsys[]>;
}> {
  const admin = createAdminClient();
  const contaIds = contas.map((c) => c.id);
  const slugPorId = new Map(contas.map((c) => [c.id, c.slug]));

  const [configs, registrosRes, espelhos] = await Promise.all([
    carregarConfigs(contaIds),
    admin.from("precificacao_produtos").select("*").in("conta_id", contaIds),
    Promise.all(contaIds.map(carregarEspelho)),
  ]);
  if (registrosRes.error) throw new Error(`precificacao_produtos: ${registrosRes.error.message}`);

  const espelhoPorChave = new Map<string, EspelhoRow>();
  for (const e of espelhos.flat()) espelhoPorChave.set(`${e.conta_id}:${e.id_vhsys}`, e);

  const linhas: LinhaProduto[] = [];
  const comRegistro = new Set<string>();

  for (const r of (registrosRes.data ?? []) as RegistroRow[]) {
    const chaveVhsys = r.id_vhsys !== null ? `${r.conta_id}:${r.id_vhsys}` : null;
    if (chaveVhsys) comRegistro.add(chaveVhsys);
    const esp = chaveVhsys ? espelhoPorChave.get(chaveVhsys) : undefined;
    linhas.push({
      chave: r.id,
      id: r.id,
      contaId: r.conta_id,
      contaSlug: slugPorId.get(r.conta_id) ?? "",
      idVhsys: r.id_vhsys,
      produto: r.nome || esp?.descricao.trim() || r.produto,
      nomeEditado: r.nome || null,
      secao: r.secao || SEM_SECAO,
      precoCusto: num(r.preco_custo),
      frete: num(r.frete),
      creditoIcms: num(r.credito_icms),
      custoOp: num(r.custo_op) ?? 0,
      comissao: num(r.comissao) ?? 0,
      impostoSaida: num(r.imposto_saida) ?? 0,
      valorVenda: num(r.valor_venda),
      fornecedorId: idFornecedor(r.fornecedor_id) ?? (esp ? idFornecedor(esp.fornecedor_produto_id) : null),
      ultimaCompra: r.ultima_compra,
      avisoCompra: r.aviso_compra ?? null,
      vhsys: esp ? espelhoVhsys(esp) : null,
      enviadoEm: r.enviado_vhsys_em,
      erroEnvio: r.erro_envio,
      alteradoEm: r.alterado_em ?? null,
    });
  }

  // Produtos do VHSYS ainda sem precificação: entram em "Sem seção" com as
  // taxas padrão da conta (fornecimento/instalação ficam de fora). O custo e a
  // venda do cadastro viram o preço de custo BRUTO e o valor de venda iniciais;
  // frete e DIFAL entram por cima. Ao salvar/enviar, o registro guarda esse
  // custo bruto — o VHSYS passa a receber o custo líquido, sem acumular.
  for (const e of espelhos.flat()) {
    const chave = `${e.conta_id}:${e.id_vhsys}`;
    if (comRegistro.has(chave) || ehServico(e.descricao)) continue;
    const cfg = configs.get(e.conta_id)!;
    linhas.push({
      chave,
      id: null,
      contaId: e.conta_id,
      contaSlug: slugPorId.get(e.conta_id) ?? "",
      idVhsys: e.id_vhsys,
      produto: e.descricao.trim(),
      nomeEditado: null,
      secao: SEM_SECAO,
      precoCusto: positivo(e.valor_custo),
      frete: null,
      creditoIcms: null,
      custoOp: cfg.custoOpPadrao,
      comissao: cfg.comissaoPadrao,
      impostoSaida: cfg.impostoSaidaPadrao,
      valorVenda: positivo(e.valor),
      fornecedorId: idFornecedor(e.fornecedor_produto_id),
      ultimaCompra: null,
      avisoCompra: null,
      vhsys: espelhoVhsys(e),
      enviadoEm: null,
      erroEnvio: null,
      alteradoEm: null,
    });
  }

  const listas = await Promise.all(contaIds.map((id, i) => fornecedoresDaConta(id, espelhos[i])));
  const fornecedores = Object.fromEntries(contaIds.map((id, i) => [id, listas[i]]));
  return { linhas, configs: Array.from(configs.values()), fornecedores };
}
