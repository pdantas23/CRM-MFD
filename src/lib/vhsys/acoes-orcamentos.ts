"use server";
// Server Actions de ESCRITA de orçamentos no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Valida admin ou vendedor antes de agir.
// Fluxo: POST /orcamentos → POST /orcamentos/{id}/produtos → upsert no espelho.

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { vhsysPost, vhsysPut, vhsysDelete, vhsysGet } from "./client";
import { exigirAdminOuVendedor } from "./acoes";
import type {
  PayloadCriarOrcamento,
  PayloadItemOrcamento,
  PayloadParcelaOrcamento,
  ItensDiff,
  RespostaCriarOrcamento,
  VhsysOrcamento,
} from "./types";
import { situacaoEfetivaOrcamento } from "./fluxo-orcamentos";
import type { OrcamentoRow } from "@/lib/types/pedidos";

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

async function upsertOrcamento(orc: VhsysOrcamento): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetivaOrcamento(orc.situacao || null, orc.status_pedido || null);
  const linha = {
    id_vhsys: orc.id_orcamento,
    numero: orc.id_pedido,
    cliente_id_vhsys: orc.id_cliente || null,
    nome_cliente: orc.nome_cliente,
    vendedor_id_vhsys: orc.vendedor_pedido_id || null,
    vendedor_nome: orc.vendedor_pedido || null,
    valor_total: numeroOuNull(orc.valor_total_nota),
    situacao_id: efetiva.situacaoId,
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
    // Campos opcionais — quando presentes, devem ser não-negativos
    for (const campo of ["ipi_produto", "icms_produto", "valor_custo_produto", "peso_produto", "peso_liq_produto"] as const) {
      const v = item[campo];
      if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
        throw new Error(`${campo} deve ser número não-negativo. Recebido: ${v}`);
      }
    }
  }
}

function validarParcelas(parcelas: PayloadParcelaOrcamento[]): void {
  const dataRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const parcela of parcelas) {
    if (!parcela.data_parcela || !dataRe.test(parcela.data_parcela)) {
      throw new Error(`data_parcela inválida: ${parcela.data_parcela}. Use YYYY-MM-DD.`);
    }
    if (!Number.isFinite(parcela.valor_parcela) || parcela.valor_parcela <= 0) {
      throw new Error(`valor_parcela deve ser > 0. Recebido: ${parcela.valor_parcela}`);
    }
    if (parcela.observacoes_parcela && parcela.observacoes_parcela.length > 255) {
      throw new Error("observacoes_parcela excede 255 caracteres.");
    }
  }
}

function validarPayload(payload: PayloadCriarOrcamento): void {
  if (!payload.nome_cliente || payload.nome_cliente.length > 255) {
    throw new Error("nome_cliente inválido (vazio ou >255 chars).");
  }
  if (payload.obs_pedido && payload.obs_pedido.length > 500) {
    throw new Error("obs_pedido excede 500 caracteres.");
  }
  if (payload.referencia_pedido && payload.referencia_pedido.length > 100) {
    throw new Error("referencia_pedido excede 100 caracteres.");
  }
  // Novos campos — validações de limites
  if (payload.frete_por_pedido !== undefined && ![0, 1, 9].includes(payload.frete_por_pedido)) {
    throw new Error("frete_por_pedido deve ser 0, 1 ou 9.");
  }
  if (
    payload.prazo_orcamento !== undefined &&
    (!Number.isInteger(payload.prazo_orcamento) || payload.prazo_orcamento < 0)
  ) {
    throw new Error("prazo_orcamento deve ser inteiro ≥ 0.");
  }
  if (payload.transportadora_pedido && payload.transportadora_pedido.length > 255) {
    throw new Error("transportadora_pedido excede 255 caracteres.");
  }
  if (payload.obs_interno_pedido && payload.obs_interno_pedido.length > 500) {
    throw new Error("obs_interno_pedido excede 500 caracteres.");
  }
  // Campos monetários/peso — strings decimais ≤12 chars
  for (const campo of [
    "desconto_pedido",
    "frete_pedido",
    "peso_total_nota",
    "peso_total_nota_liq",
    "valor_baseICMS",
    "valor_ICMS",
    "valor_baseST",
    "valor_ST",
    "valor_IPI",
  ] as const) {
    const v = payload[campo];
    if (v !== undefined) {
      if (v.length > 12) throw new Error(`${campo} excede 12 caracteres.`);
      if (!/^\d+(\.\d+)?$/.test(v)) throw new Error(`${campo} não é decimal válido.`);
    }
  }
  if (payload.desconto_pedido_porc !== undefined) {
    if (payload.desconto_pedido_porc.length > 100) throw new Error("desconto_pedido_porc excede 100 caracteres.");
    if (!/^\d+(\.\d+)?$/.test(payload.desconto_pedido_porc)) throw new Error("desconto_pedido_porc não é decimal válido.");
  }
  if (payload.valor_total_nota !== undefined) {
    if (payload.valor_total_nota.length > 13) throw new Error("valor_total_nota excede 13 caracteres.");
    if (!/^\d+(\.\d+)?$/.test(payload.valor_total_nota)) throw new Error("valor_total_nota não é decimal válido.");
  }
  if (payload.valor_total_produtos !== undefined && (!Number.isFinite(payload.valor_total_produtos) || payload.valor_total_produtos < 0)) {
    throw new Error("valor_total_produtos deve ser número não-negativo.");
  }
}

// ── Ação: carregar mais orçamentos (Kanban paginação) ────────────────────────

/** Colunas mínimas para o Kanban (sem dados jsonb). */
const COLS_ORCAMENTO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, " +
  "vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, " +
  "pedido_emitido, data_orcamento, validade, referencia, obs, lixeira";

type ProfileLeanOrc = { role: string; vendedor_id: number | null };

async function obterProfileOrc(): Promise<ProfileLeanOrc> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, vendedor_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Perfil não encontrado.");
  return profile as ProfileLeanOrc;
}

/**
 * Carrega mais orçamentos de uma coluna específica do Kanban (paginação).
 * Vendedor vê apenas os próprios orçamentos (filtro vendedor_id_vhsys).
 * Espelha buscarMaisPedidos de acoes-pedidos.ts.
 */
export async function buscarMaisOrcamentos(
  situacaoId: number,
  offset: number
): Promise<{ orcamentos: OrcamentoRow[]; erro?: string }> {
  try {
    // situacaoId pode ser negativo (coluna virtual, ex.: -2 "Em andamento");
    // só 0 é inválido.
    if (!Number.isInteger(situacaoId) || situacaoId === 0) {
      throw new Error("situacaoId inválido.");
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset inválido.");
    }

    const profile = await obterProfileOrc();

    if (profile.role === "vendedor" && !profile.vendedor_id) {
      return { orcamentos: [] };
    }

    const supabase = await createClient();
    const LIMITE = 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("vhsys_orcamentos")
      .select(COLS_ORCAMENTO)
      .eq("lixeira", false)
      .eq("situacao_id", situacaoId)
      .order("data_orcamento", { ascending: false })
      .range(offset, offset + LIMITE - 1);

    if (profile.role === "vendedor") {
      query = query.eq("vendedor_id_vhsys", profile.vendedor_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { orcamentos: (data ?? []) as unknown as OrcamentoRow[] };
  } catch (err) {
    return { orcamentos: [], erro: err instanceof Error ? err.message : String(err) };
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
 * Se `parcelas` for fornecido, registra as parcelas após criar os itens
 * (o VHSYS substitui as parcelas anteriores a cada POST).
 */
export async function criarOrcamento(
  payload: PayloadCriarOrcamento,
  itens: PayloadItemOrcamento[],
  parcelas?: PayloadParcelaOrcamento[]
): Promise<ResultadoCriarOrcamento> {
  try {
    const ctx = await exigirAdminOuVendedor();

    validarPayload(payload);
    validarItens(itens);
    if (parcelas && parcelas.length > 0) validarParcelas(parcelas);

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

    // Registra parcelas (substitui anteriores — POST único com array)
    if (parcelas && parcelas.length > 0) {
      await vhsysPost(`/orcamentos/${idVhsys}/parcelas`, parcelas);
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
 * Se `parcelas` for fornecido, registra as parcelas (o VHSYS substitui as anteriores).
 */
export async function editarOrcamento(
  idVhsys: number,
  payload: Partial<PayloadCriarOrcamento>,
  itensDiff: ItensDiff,
  parcelas?: PayloadParcelaOrcamento[]
): Promise<ResultadoAcao> {
  try {
    const ctx = await exigirAdminOuVendedor();

    if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
      throw new Error("idVhsys inválido.");
    }

    if (payload.obs_pedido && payload.obs_pedido.length > 500) {
      throw new Error("obs_pedido excede 500 caracteres.");
    }
    if (payload.referencia_pedido && payload.referencia_pedido.length > 100) {
      throw new Error("referencia_pedido excede 100 caracteres.");
    }
    validarItens(itensDiff.inserir);
    if (parcelas && parcelas.length > 0) validarParcelas(parcelas);

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

    // Registra parcelas (substitui anteriores — POST único com array)
    if (parcelas && parcelas.length > 0) {
      await vhsysPost(`/orcamentos/${idVhsys}/parcelas`, parcelas);
    }

    // Refetch e upsert no espelho
    const { data: lista } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idVhsys}`);
    if (lista[0]) await upsertOrcamento(lista[0]);

    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}
