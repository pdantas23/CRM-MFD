"use server";
// Server Actions de ESCRITA de orçamentos no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Valida admin ou vendedor antes de agir.
// Fluxo: POST /orcamentos → POST /orcamentos/{id}/produtos → upsert no espelho.

import { createAdminClient } from "@/lib/supabase/admin";
import { vhsysPost, vhsysPut, vhsysDelete, vhsysGet } from "./client";
import { exigirAdminOuVendedor } from "./acoes";
import type {
  PayloadCriarOrcamento,
  PayloadItemOrcamento,
  ItensDiff,
  RespostaCriarOrcamento,
  VhsysOrcamento,
} from "./types";
import { SITUACAO } from "./fluxo";

// ── Helpers ────────────────────────────────────────────────────────────────

function dataOuNull(s: string | null | undefined): string | null {
  if (!s || s.startsWith("0000-00-00")) return null;
  return s;
}

function numeroOuNull(s: string | null | undefined): number | null {
  if (!s || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function situacaoEfetiva(situacaoId: number | null, statusBase: string | null) {
  if (situacaoId) return { situacaoId, origem: "vhsys" as const };
  const map: Record<string, number> = {
    "Em Aberto": SITUACAO.AGUARDANDO_PAGAMENTO,
    "Em Andamento": SITUACAO.PAGAMENTO_APROVADO,
    "Atendido": SITUACAO.ENTREGUE,
    "Cancelado": SITUACAO.CANCELADO,
  };
  const id = statusBase ? (map[statusBase] ?? null) : null;
  return { situacaoId: id, origem: "legado" as const };
}

async function upsertOrcamento(orc: VhsysOrcamento): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetiva(orc.situacao || null, orc.status_pedido || null);
  const linha = {
    id_vhsys: orc.id_orcamento,
    numero: orc.id_pedido,
    cliente_id_vhsys: orc.id_cliente || null,
    nome_cliente: orc.nome_cliente,
    vendedor_id_vhsys: orc.vendedor_pedido_id || null,
    vendedor_nome: orc.vendedor_pedido || null,
    valor_total: numeroOuNull(orc.valor_total_nota),
    situacao_id: orc.situacao || null,
    status_base: orc.status_pedido || null,
    origem_situacao: efetiva.origem,
    pedido_emitido: orc.pedido_emitido === 1,
    data_orcamento: dataOuNull(orc.data_pedido),
    validade: dataOuNull(orc.validade_orcamento),
    referencia: orc.referencia_pedido || null,
    obs: orc.obs_pedido || null,
    lixeira: orc.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(orc.data_cad_pedido),
    data_mod_vhsys: dataOuNull(orc.data_mod_pedido),
    dados: orc,
    sincronizado_em: new Date().toISOString(),
  };
  const { error } = await admin
    .from("vhsys_orcamentos")
    .upsert(linha, { onConflict: "id_vhsys" });
  if (error) throw new Error(`upsert orçamento no espelho: ${error.message}`);
}

// ── Validação de campos de entrada ─────────────────────────────────────────

function validarItens(itens: PayloadItemOrcamento[]): void {
  for (const item of itens) {
    if (!Number.isInteger(item.id_produto) || item.id_produto <= 0) {
      throw new Error(`id_produto inválido: ${item.id_produto}`);
    }
    if (!item.desc_produto || item.desc_produto.length > 255) {
      throw new Error("desc_produto inválido (vazio ou >255 chars).");
    }
    if (!Number.isFinite(item.qtde_produto) || item.qtde_produto <= 0) {
      throw new Error(`qtde_produto deve ser > 0. Recebido: ${item.qtde_produto}`);
    }
    if (!Number.isFinite(item.valor_unit_produto) || item.valor_unit_produto <= 0) {
      throw new Error(`valor_unit_produto deve ser > 0. Recebido: ${item.valor_unit_produto}`);
    }
  }
}

function validarPayload(payload: PayloadCriarOrcamento): void {
  if (!payload.nome_cliente || payload.nome_cliente.length > 255) {
    throw new Error("nome_cliente inválido (vazio ou >255 chars).");
  }
  if (payload.obs_pedido && payload.obs_pedido.length > 1000) {
    throw new Error("obs_pedido excede 1000 caracteres.");
  }
  if (payload.referencia_pedido && payload.referencia_pedido.length > 100) {
    throw new Error("referencia_pedido excede 100 caracteres.");
  }
}

export interface ResultadoCriarOrcamento {
  ok: boolean;
  idOrcamentoVhsys?: number;
  erro?: string;
}

// ── Ação: criar orçamento ──────────────────────────────────────────────────

/**
 * Cria orçamento no VHSYS e faz upsert imediato no espelho.
 * Vendedor sempre cria em seu próprio nome (vendedor_id da sessão).
 * Admin pode especificar qualquer vendedor via payload.
 */
export async function criarOrcamento(
  payload: PayloadCriarOrcamento,
  itens: PayloadItemOrcamento[]
): Promise<ResultadoCriarOrcamento> {
  try {
    const ctx = await exigirAdminOuVendedor();

    validarPayload(payload);
    validarItens(itens);

    // Vendedor sempre usa seu próprio id — ignora o que vier do form
    const payloadFinal: PayloadCriarOrcamento = { ...payload };
    if (ctx.role === "vendedor") {
      if (!ctx.vendedorId) throw new Error("Perfil de vendedor sem vendedor_id configurado.");
      payloadFinal.vendedor_pedido_id = ctx.vendedorId;
      // nome do vendedor não validamos aqui; o VHSYS resolve pelo id
    }

    const novoOrc = await vhsysPost<RespostaCriarOrcamento>("/orcamentos", payloadFinal);
    const idVhsys = novoOrc.id_orcamento;
    if (!idVhsys) throw new Error("VHSYS não retornou id_orcamento.");

    // Adiciona itens sequencialmente (API não suporta batch real)
    for (const item of itens) {
      await vhsysPost(`/orcamentos/${idVhsys}/produtos`, item);
    }

    // Refetch e upsert no espelho
    const { data: lista } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idVhsys}`);
    if (lista[0]) await upsertOrcamento(lista[0]);

    return { ok: true, idOrcamentoVhsys: idVhsys };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

// ── Ação: editar orçamento ─────────────────────────────────────────────────

export interface ResultadoAcao {
  ok: boolean;
  erro?: string;
}

/**
 * Edita orçamento via PUT e aplica diff de itens (deleta antigos, insere novos).
 * Exige admin ou autor (vendedor_id da sessão == vendedor do orçamento).
 */
export async function editarOrcamento(
  idVhsys: number,
  payload: Partial<PayloadCriarOrcamento>,
  itensDiff: ItensDiff
): Promise<ResultadoAcao> {
  try {
    const ctx = await exigirAdminOuVendedor();

    if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
      throw new Error("idVhsys inválido.");
    }

    if (payload.obs_pedido && payload.obs_pedido.length > 1000) {
      throw new Error("obs_pedido excede 1000 caracteres.");
    }
    if (payload.referencia_pedido && payload.referencia_pedido.length > 100) {
      throw new Error("referencia_pedido excede 100 caracteres.");
    }
    validarItens(itensDiff.inserir);

    // Verifica autoria
    if (ctx.role === "vendedor") {
      const admin = createAdminClient();
      const { data: orc } = await admin
        .from("vhsys_orcamentos")
        .select("vendedor_id_vhsys")
        .eq("id_vhsys", idVhsys)
        .single();
      const vendedorOrc = (orc as { vendedor_id_vhsys: number | null } | null)?.vendedor_id_vhsys ?? null;
      if (vendedorOrc !== ctx.vendedorId) {
        throw new Error("Permissão negada: este orçamento não pertence ao seu vendedor.");
      }
      // Vendedor não pode mudar o vendedor do orçamento
      delete payload.vendedor_pedido_id;
      delete payload.vendedor_pedido;
    }

    // PUT campos principais
    if (Object.keys(payload).length > 0) {
      await vhsysPut(`/orcamentos/${idVhsys}`, payload);
    }

    // Deletar itens removidos
    for (const idPedProduto of itensDiff.deletar) {
      if (!Number.isInteger(idPedProduto) || idPedProduto <= 0) {
        throw new Error(`id_ped_produto inválido: ${idPedProduto}`);
      }
      await vhsysDelete(`/orcamentos/${idVhsys}/produtos/${idPedProduto}`);
    }

    // Inserir itens novos
    for (const item of itensDiff.inserir) {
      await vhsysPost(`/orcamentos/${idVhsys}/produtos`, item);
    }

    // Refetch e upsert no espelho
    const { data: lista } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idVhsys}`);
    if (lista[0]) await upsertOrcamento(lista[0]);

    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}
