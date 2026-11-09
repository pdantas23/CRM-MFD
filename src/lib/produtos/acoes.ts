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
import { runComTokensVhsys, vhsysDelete, vhsysGet } from "@/lib/vhsys/client";
import { humanizarErroVhsys } from "@/lib/vhsys/erros";
import type { VhsysProduto } from "@/lib/vhsys/types";
import { COLUNAS_ENVIO, enviarRegistro, type RegistroEnvio } from "./envio";
import { somaTaxas } from "./precificacao";

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
  // VHSYS); outro precisa estar no cadastro de fornecedores da conta (ou já
  // ser usado em algum produto dela).
  let fornecedorId: number | null = null;
  if (entrada.fornecedorId !== null && Number(atualVhsys?.fornecedor_produto_id) !== entrada.fornecedorId) {
    const [{ data: cadastro }, { data: usado }] = await Promise.all([
      admin
        .from("vhsys_clientes")
        .select("id_vhsys")
        .eq("conta_id", entrada.contaId)
        .eq("id_vhsys", entrada.fornecedorId)
        .eq("lixeira", false)
        .in("dados->>tipo_cadastro", ["Fornecedor", "Ambos"])
        .limit(1),
      admin
        .from("vhsys_produtos")
        .select("id_vhsys")
        .eq("conta_id", entrada.contaId)
        .eq("fornecedor_produto_id", entrada.fornecedorId)
        .eq("lixeira", false)
        .limit(1),
    ]);
    if (!cadastro?.length && !usado?.length) return { ok: false, erro: "Fornecedor não encontrado no VHSYS desta conta." };
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
