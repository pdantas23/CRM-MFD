// Envio da precificação ao VHSYS — SERVER-ONLY e SEM checagem de sessão: quem
// chama autoriza antes. Fora de acoes.ts ("use server") de propósito, para não
// virar uma Server Action pública. O servidor RECALCULA custo líquido e venda.

import { createAdminClient } from "@/lib/supabase/admin";
import { getContaComTokensPorId } from "@/lib/accounts/repo";
import { runComTokensVhsys, vhsysGet, vhsysPut } from "@/lib/vhsys/client";
import { humanizarErroVhsys } from "@/lib/vhsys/erros";
import type { VhsysProduto } from "@/lib/vhsys/types";
import type { ResultadoEnvio } from "./acoes";
import { carregarConfigs } from "./dados";
import {
  blocoPrecificacao,
  cabecalhoBloco,
  centavos,
  custoLiquido,
  obsComPrecificacao,
  precoEquilibrio,
  type TaxasProduto,
} from "./precificacao";

export interface RegistroEnvio {
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

export const COLUNAS_ENVIO =
  "id, conta_id, id_vhsys, preco_custo, frete, credito_icms, custo_op, comissao, imposto_saida, valor_venda, fornecedor_id, nome";

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/**
 * Envia custo líquido e venda de um registro ao VHSYS da conta dele e registra
 * o resultado (enviado_vhsys_em / erro_envio).
 */
export async function enviarRegistro(r: RegistroEnvio, autor: string): Promise<ResultadoEnvio> {
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
