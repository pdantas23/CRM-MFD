"use server";
// Server Actions da aba Produtos. Exclusivas de admin; escrevem via service
// role (precificacao_* não têm policies). Salvar grava só no CRM; o envio ao
// VHSYS é manual, por linha. No envio o servidor RECALCULA custo líquido e
// venda (não confia no client):
//   valor_custo_produto = custo líquido
//   valor_produto       = valor de venda, ou o preço de equilíbrio sem venda
//   fornecedor_produto_id = fornecedor escolhido no CRM (só quando houver escolha)
//   desc_produto          = nome renomeado no CRM (só quando houver)
//   obs_produto           = observações com o bloco da última precificação
//                           (substituído a cada envio; o resto do texto fica)
// O PUT é parcial (só esses campos) e confirmado com um GET em seguida.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { getContaComTokensPorId, listarContasAtivas } from "@/lib/accounts/repo";
import { runComTokensVhsys, vhsysDelete, vhsysGet, vhsysPut } from "@/lib/vhsys/client";
import { humanizarErroVhsys } from "@/lib/vhsys/erros";
import type { VhsysProduto } from "@/lib/vhsys/types";
import { carregarConfigs } from "./dados";
import {
  blocoPrecificacao,
  cabecalhoBloco,
  centavos,
  custoLiquido,
  obsComPrecificacao,
  precoEquilibrio,
  somaTaxas,
  type TaxasProduto,
} from "./precificacao";

type Resultado = { ok: boolean; erro?: string };

export type ResultadoSalvar = Resultado & { id?: string };
export type ResultadoEnvio = Resultado & {
  vhsys?: { valor: number | null; valorCusto: number | null; fornecedorId: number | null; nome: string };
  enviadoEm?: string;
};

export interface EntradaProduto {
  /** precificacao_produtos.id; null = criar a partir de um produto do VHSYS. */
  id: string | null;
  contaId: string;
  /** Obrigatório quando id = null. Ignorado quando id existe (vale o do banco). */
  idVhsys: number | null;
  secao: string | null;
  precoCusto: number | null;
  frete: number | null;
  creditoIcms: number | null;
  custoOp: number;
  comissao: number;
  impostoSaida: number;
  valorVenda: number | null;
  /** Id do fornecedor no VHSYS (um dos já usados nos produtos da conta). */
  fornecedorId: number | null;
  /** Novo nome (modal do produto). Omitido = não mexe no nome. */
  nome?: string | null;
}

/** Dados de cadastro do produto no VHSYS (modal do produto). */
export interface DetalhesProduto {
  codigo: string | null;
  unidade: string | null;
  ncm: string | null;
  marca: string | null;
  estoque: number | null;
  tipo: string | null;
  status: string | null;
  modificadoEm: string | null;
}

export interface EntradaConfig {
  contaId: string;
  icmsAtual: number;
  custoOpPadrao: number;
  comissaoPadrao: number;
  impostoSaidaPadrao: number;
}

/** Admin + contas ativas (a aba mostra todas, independente da conta logada). */
async function autorizar(): Promise<{ userId: string; nome: string; contaIds: Set<string> } | null> {
  const { user, profile } = await getSessaoComProfile();
  if (!user || !profile || !ehAdmin(profile.role)) return null;
  const ativas = await listarContasAtivas();
  return { userId: user.id, nome: profile.nome, contaIds: new Set(ativas.map((c) => c.id)) };
}

const ehValor = (v: number | null) => v === null || (Number.isFinite(v) && v >= 0 && v < 1e9);
const ehFracao = (v: number | null) => v === null || (Number.isFinite(v) && v >= 0 && v < 1);

function validar(e: EntradaProduto): string | null {
  if (!ehValor(e.precoCusto) || !ehValor(e.frete)) return "Preço de custo ou frete inválido.";
  if (e.valorVenda !== null && !(Number.isFinite(e.valorVenda) && e.valorVenda > 0 && e.valorVenda < 1e9)) {
    return "Valor de venda inválido.";
  }
  if (![e.creditoIcms, e.custoOp, e.comissao, e.impostoSaida].every(ehFracao)) {
    return "Percentual inválido (use de 0% a 99,99%).";
  }
  if (somaTaxas(e) >= 1) return "Custos operacionais + comissões + imposto passam de 100%.";
  if (e.secao !== null && e.secao.length > 100) return "Seção muito longa.";
  if (e.fornecedorId !== null && !(Number.isInteger(e.fornecedorId) && e.fornecedorId > 0)) {
    return "Fornecedor inválido.";
  }
  if (e.nome !== undefined && e.nome !== null) {
    const nome = e.nome.trim();
    if (!nome) return "O nome do produto não pode ficar vazio.";
    if (nome.length > 255) return "Nome muito longo (máx. 255 caracteres).";
  }
  return null;
}

interface RegistroEnvio {
  id: string;
  conta_id: string;
  id_vhsys: number | null;
  preco_custo: number | null;
  frete: number | null;
  credito_icms: number | null;
  custo_op: number;
  comissao: number;
  imposto_saida: number;
  valor_venda: number | null;
  fornecedor_id: number | null;
  nome: string | null;
}

const COLUNAS_ENVIO =
  "id, conta_id, id_vhsys, preco_custo, frete, credito_icms, custo_op, comissao, imposto_saida, valor_venda, fornecedor_id, nome";

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Envia custo líquido e venda de um registro ao VHSYS da conta dele e registra
 * o resultado (enviado_vhsys_em / erro_envio).
 */
async function enviarRegistro(r: RegistroEnvio, autor: string): Promise<ResultadoEnvio> {
  if (r.id_vhsys === null) return { ok: false, erro: "Produto sem cadastro no VHSYS." };
  const admin = createAdminClient();
  // Tempos por etapa (log) — diagnóstico de lentidão do envio.
  const t0 = Date.now();
  const tempos: Record<string, number> = {};
  const marcar = (etapa: string, desde: number) => (tempos[etapa] = Date.now() - desde);

  // Credenciais da conta em paralelo com os parâmetros (uma ida ao banco a menos na espera).
  const contaPromise = getContaComTokensPorId(r.conta_id).catch(() => null);
  const icmsAtual = (await carregarConfigs([r.conta_id])).get(r.conta_id)!.icmsAtual;
  const t: TaxasProduto = {
    precoCusto: n(r.preco_custo),
    frete: n(r.frete),
    creditoIcms: n(r.credito_icms),
    custoOp: Number(r.custo_op),
    comissao: Number(r.comissao),
    impostoSaida: Number(r.imposto_saida),
  };
  const liq = custoLiquido(t, icmsAtual);
  const venda = n(r.valor_venda) ?? precoEquilibrio(t, icmsAtual);

  const fornecedorId = n(r.fornecedor_id);
  const nome = r.nome?.trim() || null;
  const corpo: {
    valor_custo_produto?: string;
    valor_produto?: string;
    fornecedor_produto_id?: number;
    desc_produto?: string;
    obs_produto?: string;
  } = {};
  if (nome) corpo.desc_produto = nome;
  if (liq !== null) corpo.valor_custo_produto = centavos(liq).toFixed(2);
  if (venda !== null) corpo.valor_produto = centavos(venda).toFixed(2);
  if (fornecedorId !== null) corpo.fornecedor_produto_id = fornecedorId;
  if (!corpo.valor_custo_produto && !corpo.valor_produto) {
    return { ok: false, erro: "Sem custo nem venda para enviar." };
  }

  let erro: string | null = null;
  let vhsys: ResultadoEnvio["vhsys"];
  try {
    marcar("preparo", t0);
    const conta = await contaPromise;
    if (!conta) throw new Error("Conta não encontrada.");
    const bloco = blocoPrecificacao(t, icmsAtual, n(r.valor_venda), autor);
    const confirmado = await runComTokensVhsys(conta.tokens, async () => {
      // Observações atuais (frescas) para trocar só o bloco de precificação.
      const tAntes = Date.now();
      const { data: antes } = await vhsysGet<VhsysProduto>(`/produtos/${r.id_vhsys}`);
      marcar("getAntes", tAntes);
      corpo.obs_produto = obsComPrecificacao(antes[0]?.obs_produto, bloco);
      const tPut = Date.now();
      await vhsysPut(`/produtos/${r.id_vhsys}`, corpo);
      marcar("put", tPut);
      const tGet = Date.now();
      const { data } = await vhsysGet<VhsysProduto>(`/produtos/${r.id_vhsys}`);
      marcar("get", tGet);
      return data[0];
    });
    const confere = (enviado: string | undefined, atual: string | undefined) =>
      enviado === undefined || Math.abs(Number(atual) - Number(enviado)) < 0.005;
    if (
      !confirmado ||
      !confere(corpo.valor_custo_produto, confirmado.valor_custo_produto) ||
      !confere(corpo.valor_produto, confirmado.valor_produto)
    ) {
      throw new Error("O VHSYS aceitou o envio mas não confirmou os novos valores.");
    }
    if (fornecedorId !== null && Number(confirmado.fornecedor_produto_id) !== fornecedorId) {
      throw new Error("O VHSYS gravou custo e venda, mas não aplicou o fornecedor escolhido.");
    }
    if (!String(confirmado.obs_produto ?? "").includes(cabecalhoBloco(bloco))) {
      throw new Error("O VHSYS gravou custo e venda, mas não gravou a precificação nas observações.");
    }
    if (nome && String(confirmado.desc_produto ?? "").trim() !== nome) {
      throw new Error("O VHSYS gravou custo e venda, mas não aplicou o novo nome.");
    }
    vhsys = {
      valor: Number(confirmado.valor_produto),
      valorCusto: Number(confirmado.valor_custo_produto),
      fornecedorId: Number(confirmado.fornecedor_produto_id) || null,
      nome: String(confirmado.desc_produto ?? "").trim(),
    };
    // Espelho atualizado na hora (o sync incremental traria os mesmos valores).
    await admin
      .from("vhsys_produtos")
      .update({
        ...(corpo.valor_custo_produto ? { valor_custo: Number(corpo.valor_custo_produto) } : {}),
        ...(corpo.valor_produto ? { valor: Number(corpo.valor_produto) } : {}),
        ...(fornecedorId !== null
          ? { fornecedor_produto_id: fornecedorId, fornecedor_produto: confirmado.fornecedor_produto || null }
          : {}),
        ...(nome ? { descricao: nome } : {}),
        sincronizado_em: new Date().toISOString(),
      })
      .eq("conta_id", r.conta_id)
      .eq("id_vhsys", r.id_vhsys);
  } catch (err) {
    erro = humanizarErroVhsys(err);
    console.error(`[produtos] envio VHSYS falhou conta=${r.conta_id} produto=${r.id_vhsys}: ${
      err instanceof Error ? err.message : String(err)
    }`);
  }

  const enviadoEm = new Date().toISOString();
  console.info(
    `[produtos] envio produto=${r.id_vhsys} ${erro ? "ERRO" : "ok"} total=${Date.now() - t0}ms ` +
      Object.entries(tempos)
        .map(([k, v]) => `${k}=${v}ms`)
        .join(" ")
  );
  await admin
    .from("precificacao_produtos")
    // Nome confirmado no VHSYS deixa de ser "pendente" (passa a valer o do espelho).
    .update(erro ? { erro_envio: erro } : { erro_envio: null, enviado_vhsys_em: enviadoEm, nome: null })
    .eq("id", r.id);
  return erro ? { ok: false, erro } : { ok: true, vhsys, enviadoEm };
}

/** Salva as entradas de um produto no CRM (sem enviar ao VHSYS). */
export async function salvarProduto(entrada: EntradaProduto): Promise<ResultadoSalvar> {
  const auth = await autorizar();
  if (!auth) return { ok: false, erro: "Permissão negada." };
  if (!auth.contaIds.has(entrada.contaId)) return { ok: false, erro: "Conta não permitida." };
  const invalido = validar(entrada);
  if (invalido) return { ok: false, erro: invalido };

  const admin = createAdminClient();

  // Produto como está no VHSYS (espelho): uma consulta pontual, base para
  // fornecedor e nome.
  const { data: atualData } = entrada.idVhsys
    ? await admin
        .from("vhsys_produtos")
        .select("descricao, fornecedor_produto_id")
        .eq("conta_id", entrada.contaId)
        .eq("id_vhsys", entrada.idVhsys)
        .maybeSingle()
    : { data: null };
  const atualVhsys = atualData as { descricao: string; fornecedor_produto_id: number | null } | null;

  // Fornecedor: o MESMO que o produto já tem no VHSYS grava null (segue o
  // VHSYS); outro precisa ser um fornecedor já usado em algum produto da conta.
  let fornecedorId: number | null = null;
  if (entrada.fornecedorId !== null && Number(atualVhsys?.fornecedor_produto_id) !== entrada.fornecedorId) {
    const { data: usado } = await admin
      .from("vhsys_produtos")
      .select("id_vhsys")
      .eq("conta_id", entrada.contaId)
      .eq("fornecedor_produto_id", entrada.fornecedorId)
      .eq("lixeira", false)
      .limit(1);
    if (!usado?.length) return { ok: false, erro: "Fornecedor não encontrado no VHSYS desta conta." };
    fornecedorId = entrada.fornecedorId;
  }

  // Nome: igual ao do VHSYS (ou vazio) = sem alteração pendente.
  let nomeCampo: string | null | undefined;
  if (entrada.nome !== undefined) {
    const nome = entrada.nome?.trim() || null;
    nomeCampo = nome && nome !== atualVhsys?.descricao.trim() ? nome : null;
  }

  const campos = {
    secao: entrada.secao?.trim() || null,
    preco_custo: entrada.precoCusto,
    frete: entrada.frete,
    credito_icms: entrada.creditoIcms,
    custo_op: entrada.custoOp,
    comissao: entrada.comissao,
    imposto_saida: entrada.impostoSaida,
    valor_venda: entrada.valorVenda,
    fornecedor_id: fornecedorId,
    ...(nomeCampo !== undefined ? { nome: nomeCampo } : {}),
    aviso_compra: null,
    atualizado_em: new Date().toISOString(),
    alterado_em: new Date().toISOString(),
    atualizado_por: auth.userId,
  };

  let id = entrada.id;
  if (!id) {
    // Produto do VHSYS sem registro: confere no espelho e cria (ou reaproveita
    // um registro criado em paralelo para o mesmo produto).
    if (!Number.isInteger(entrada.idVhsys) || (entrada.idVhsys ?? 0) <= 0) {
      return { ok: false, erro: "Produto inválido." };
    }
    const { data: prod } = await admin
      .from("vhsys_produtos")
      .select("descricao")
      .eq("conta_id", entrada.contaId)
      .eq("id_vhsys", entrada.idVhsys)
      .eq("lixeira", false)
      .maybeSingle();
    if (!prod) return { ok: false, erro: "Produto não encontrado no VHSYS desta conta." };
    const { data: existente } = await admin
      .from("precificacao_produtos")
      .select("id")
      .eq("conta_id", entrada.contaId)
      .eq("id_vhsys", entrada.idVhsys)
      .maybeSingle();
    if (existente) {
      id = (existente as { id: string }).id;
    } else {
      const { data: novo, error } = await admin
        .from("precificacao_produtos")
        .insert({
          ...campos,
          conta_id: entrada.contaId,
          id_vhsys: entrada.idVhsys,
          produto: (prod as { descricao: string }).descricao.trim(),
        })
        .select("id")
        .single();
      if (error) return { ok: false, erro: error.message };
      id = (novo as { id: string }).id;
    }
  }

  const { data: registro, error } = await admin
    .from("precificacao_produtos")
    .update(campos)
    .eq("id", id)
    .eq("conta_id", entrada.contaId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!registro) return { ok: false, erro: "Produto não encontrado." };
  return { ok: true, id };
}

/** Envia ao VHSYS o custo líquido e a venda de um produto já salvo. */
export async function enviarProdutoAoVhsys(id: string): Promise<ResultadoEnvio> {
  const auth = await autorizar();
  if (!auth) return { ok: false, erro: "Permissão negada." };

  const admin = createAdminClient();
  const { data: registro } = await admin
    .from("precificacao_produtos")
    .select(COLUNAS_ENVIO)
    .eq("id", id)
    .maybeSingle();
  const r = registro as RegistroEnvio | null;
  if (!r || !auth.contaIds.has(r.conta_id)) return { ok: false, erro: "Produto não encontrado." };
  return enviarRegistro(r, auth.nome);
}

export async function salvarConfigPrecificacao(entrada: EntradaConfig): Promise<Resultado> {
  const auth = await autorizar();
  if (!auth) return { ok: false, erro: "Permissão negada." };
  if (!auth.contaIds.has(entrada.contaId)) return { ok: false, erro: "Conta não permitida." };
  const { icmsAtual, custoOpPadrao, comissaoPadrao, impostoSaidaPadrao } = entrada;
  if (![icmsAtual, custoOpPadrao, comissaoPadrao, impostoSaidaPadrao].every(ehFracao)) {
    return { ok: false, erro: "Percentual inválido (use de 0% a 99,99%)." };
  }
  if (custoOpPadrao + comissaoPadrao + impostoSaidaPadrao >= 1) {
    return { ok: false, erro: "As taxas padrão somam 100% ou mais." };
  }

  const { error } = await createAdminClient().from("precificacao_config").upsert(
    {
      conta_id: entrada.contaId,
      icms_atual: icmsAtual,
      custo_op_padrao: custoOpPadrao,
      comissao_padrao: comissaoPadrao,
      imposto_saida_padrao: impostoSaidaPadrao,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "conta_id" }
  );
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/produtos");
  return { ok: true };
}

/** Dados de cadastro de um produto no espelho do VHSYS (para o modal). */
export async function detalhesProduto(contaId: string, idVhsys: number): Promise<DetalhesProduto | null> {
  const auth = await autorizar();
  if (!auth || !auth.contaIds.has(contaId) || !Number.isInteger(idVhsys)) return null;
  const { data } = await createAdminClient()
    .from("vhsys_produtos")
    .select("codigo, unidade, marca, estoque, tipo, status, data_mod_vhsys, dados")
    .eq("conta_id", contaId)
    .eq("id_vhsys", idVhsys)
    .maybeSingle();
  if (!data) return null;
  const p = data as {
    codigo: string | null;
    unidade: string | null;
    marca: string | null;
    estoque: number | null;
    tipo: string | null;
    status: string | null;
    data_mod_vhsys: string | null;
    dados: { ncm_produto?: string } | null;
  };
  return {
    codigo: p.codigo,
    unidade: p.unidade,
    ncm: p.dados?.ncm_produto || null,
    marca: p.marca,
    estoque: p.estoque === null ? null : Number(p.estoque),
    tipo: p.tipo,
    status: p.status,
    modificadoEm: p.data_mod_vhsys,
  };
}

/**
 * Exclui um produto: no VHSYS (DELETE — vai para a lixeira de lá) e a
 * precificação no CRM. A exclusão no VHSYS é confirmada com um GET (produto
 * some ou volta com lixeira = "Sim"); sem confirmação, nada muda no CRM.
 * Produto sem cadastro no VHSYS: só remove a precificação do CRM.
 */
export async function excluirProduto(alvo: {
  id: string | null;
  contaId: string;
  idVhsys: number | null;
}): Promise<Resultado> {
  const auth = await autorizar();
  if (!auth) return { ok: false, erro: "Permissão negada." };
  if (!auth.contaIds.has(alvo.contaId)) return { ok: false, erro: "Conta não permitida." };
  if (alvo.idVhsys !== null && !(Number.isInteger(alvo.idVhsys) && alvo.idVhsys > 0)) {
    return { ok: false, erro: "Produto inválido." };
  }
  const admin = createAdminClient();

  if (alvo.idVhsys !== null) {
    try {
      const conta = await getContaComTokensPorId(alvo.contaId);
      if (!conta) throw new Error("Conta não encontrada.");
      const restante = await runComTokensVhsys(conta.tokens, async () => {
        await vhsysDelete(`/produtos/${alvo.idVhsys}`);
        const { data } = await vhsysGet<VhsysProduto>(`/produtos/${alvo.idVhsys}`);
        return data[0];
      });
      if (restante && restante.lixeira !== "Sim") {
        throw new Error("O VHSYS aceitou a exclusão mas o produto continua ativo.");
      }
    } catch (err) {
      console.error(
        `[produtos] exclusão VHSYS falhou conta=${alvo.contaId} produto=${alvo.idVhsys}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      return { ok: false, erro: humanizarErroVhsys(err) };
    }
    // Espelho na hora (o sync traria o mesmo: produto na lixeira).
    await admin
      .from("vhsys_produtos")
      .update({ lixeira: true, sincronizado_em: new Date().toISOString() })
      .eq("conta_id", alvo.contaId)
      .eq("id_vhsys", alvo.idVhsys);
    await admin.from("precificacao_produtos").delete().eq("conta_id", alvo.contaId).eq("id_vhsys", alvo.idVhsys);
  } else if (alvo.id) {
    await admin.from("precificacao_produtos").delete().eq("conta_id", alvo.contaId).eq("id", alvo.id);
  }

  console.info(`[produtos] excluído conta=${alvo.contaId} produto=${alvo.idVhsys ?? alvo.id} por=${auth.userId}`);
  return { ok: true };
}
