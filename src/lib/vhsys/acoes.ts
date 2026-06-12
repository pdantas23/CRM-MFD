"use server";
// Server Actions de ESCRITA no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Toda ação valida role='admin' antes de agir.
// Arquitetura: escrever no VHSYS primeiro → em caso de sucesso, upsert imediato
// no espelho Supabase via admin client (não aguarda o ciclo de sync).

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { vhsysPost, vhsysPut, vhsysGet } from "./client";
import { tipoStatusParaSituacao, transicaoPermitida, SITUACAO } from "./fluxo";
import type {
  PayloadStatusPedido,
  PayloadStatusOrcamento,
  PayloadCriarPedido,
  PayloadItemPedido,
  RespostaCriarPedido,
  RespostaStatusPedido,
  VhsysPedido,
  VhsysOrcamento,
} from "./types";

// ── Helpers internos ───────────────────────────────────────────────────────

/** Valida que o usuário logado é admin; lança erro se não for. */
async function exigirAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Permissão negada: somente administradores podem executar esta ação.");
  }
}

/** Formata Date como YYYY-MM-DD no fuso de Brasília. */
function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Reutiliza os transformadores de sync.ts para fazer upsert cirúrgico
// — copiado inline para evitar dependência circular (sync importa catalogos/vendas).

function numeroOuNull(s: string | null | undefined): number | null {
  if (!s || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function dataOuNull(s: string | null | undefined): string | null {
  if (!s || s.startsWith("0000-00-00")) return null;
  return s;
}

function situacaoEfetivaInline(situacaoId: number | null, statusBase: string | null) {
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

async function upsertPedidoNoEspelho(pedido: VhsysPedido): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetivaInline(pedido.situacao || null, pedido.status_pedido || null);
  const linha = {
    id_vhsys: pedido.id_ped,
    numero: pedido.id_pedido,
    cliente_id_vhsys: pedido.id_cliente || null,
    nome_cliente: pedido.nome_cliente,
    vendedor_id_vhsys: pedido.vendedor_pedido_id || null,
    vendedor_nome: pedido.vendedor_pedido || null,
    valor_total: numeroOuNull(pedido.valor_total_nota),
    frete: numeroOuNull(pedido.frete_pedido),
    desconto: numeroOuNull(pedido.desconto_pedido),
    situacao_id: efetiva.situacaoId,
    status_base: pedido.status_pedido || null,
    origem_situacao: efetiva.origem,
    data_pedido: dataOuNull(pedido.data_pedido),
    prazo_entrega: pedido.prazo_entrega || null,
    referencia: pedido.referencia_pedido || null,
    obs: pedido.obs_pedido || null,
    lixeira: pedido.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(pedido.data_cad_pedido),
    data_mod_vhsys: dataOuNull(pedido.data_mod_pedido),
    dados: pedido,
    sincronizado_em: new Date().toISOString(),
  };
  const { error } = await admin
    .from("vhsys_pedidos")
    .upsert(linha, { onConflict: "id_vhsys" });
  if (error) throw new Error(`upsert pedido no espelho: ${error.message}`);
}

async function upsertOrcamentoNoEspelho(orc: VhsysOrcamento): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetivaInline(orc.situacao || null, orc.status_pedido || null);
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

// ── Actions públicas ───────────────────────────────────────────────────────

export interface ResultadoAcao {
  ok: boolean;
  erro?: string;
}

/**
 * Mover pedido para nova situação no Kanban.
 * Escopo: qualquer transição exceto CANCELADO (regra 9).
 * Exige role='admin'.
 */
export async function moverSituacaoPedido(
  idVhsys: number,
  novaSituacaoId: number,
  obs?: string
): Promise<ResultadoAcao> {
  try {
    await exigirAdmin();

    // Validação de entrada
    if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
      throw new Error("idVhsys inválido.");
    }
    const tipoStatus = tipoStatusParaSituacao(novaSituacaoId);
    if (!tipoStatus) throw new Error(`Situação ${novaSituacaoId} desconhecida.`);

    // Busca situação atual no espelho para validar transição
    const admin = createAdminClient();
    const { data: pedidoEspelho } = await admin
      .from("vhsys_pedidos")
      .select("situacao_id")
      .eq("id_vhsys", idVhsys)
      .single();

    const situacaoAtual = (pedidoEspelho as { situacao_id: number | null } | null)?.situacao_id ?? null;

    if (!transicaoPermitida(situacaoAtual, novaSituacaoId)) {
      throw new Error(
        `Transição de ${situacaoAtual} para ${novaSituacaoId} não é permitida.`
      );
    }

    if (obs && obs.length > 255) {
      throw new Error("Observação excede 255 caracteres.");
    }

    // Monta payload — inclui campo extra "situacao" para teste da lacuna
    const payload: PayloadStatusPedido = {
      data_status: hojeISO(),
      tipo_status: tipoStatus,
      ...(obs ? { obs_status: obs } : {}),
      situacao: novaSituacaoId, // testar se a API aceita — documentar resultado
    };

    await vhsysPost<RespostaStatusPedido>(`/pedidos/${idVhsys}/status`, payload);

    // Refetch e upsert imediato no espelho
    const { data: pedidoAtualizado } = await vhsysGet<VhsysPedido>(`/pedidos/${idVhsys}`);
    if (pedidoAtualizado[0]) {
      await upsertPedidoNoEspelho(pedidoAtualizado[0]);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Ao criar entrega vinculada a pedido, move o pedido para EM_SEPARACAO (859).
 * Falha aqui NÃO reverte a entrega — exibir aviso discreto na UI.
 * Exige role='admin' (Server Actions são endpoints HTTP invocáveis diretamente;
 * a proteção da página não é suficiente).
 */
export async function registrarEntregaEmSeparacao(
  idVhsysPedido: number
): Promise<ResultadoAcao> {
  try {
    await exigirAdmin();

    if (!Number.isInteger(idVhsysPedido) || idVhsysPedido <= 0) {
      throw new Error("idVhsysPedido inválido.");
    }

    // Verifica situação atual — só move se gate estiver habilitado e destino for válido
    const admin = createAdminClient();
    const { data: espelho } = await admin
      .from("vhsys_pedidos")
      .select("situacao_id")
      .eq("id_vhsys", idVhsysPedido)
      .single();

    const situacaoAtual = (espelho as { situacao_id: number | null } | null)?.situacao_id ?? null;

    // Já em separação ou mais avançado — sem ação necessária
    if (situacaoAtual === SITUACAO.EM_SEPARACAO) return { ok: true };
    if (!transicaoPermitida(situacaoAtual, SITUACAO.EM_SEPARACAO)) return { ok: true };

    const payload: PayloadStatusPedido = {
      data_status: hojeISO(),
      tipo_status: "Em Andamento",
      obs_status: "Entrega cadastrada no CRM.",
      situacao: SITUACAO.EM_SEPARACAO,
    };

    await vhsysPost<RespostaStatusPedido>(
      `/pedidos/${idVhsysPedido}/status`,
      payload
    );

    // Refetch e upsert no espelho
    const { data: pedidoAtualizado } = await vhsysGet<VhsysPedido>(`/pedidos/${idVhsysPedido}`);
    if (pedidoAtualizado[0]) {
      await upsertPedidoNoEspelho(pedidoAtualizado[0]);
    }

    return { ok: true };
  } catch (err) {
    // Falha não reverte a entrega — retorna erro para aviso discreto
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Emite pedido a partir de orçamento aprovado (situacao 768).
 * Idempotente: verifica pedido_emitido no espelho antes de agir.
 * Estratégia: PUT /orcamentos/{id} status_pedido='Atendido' +
 * POST /orcamentos/{id}/status tipo_status='Atendido'.
 * Se pedido_emitido ainda não aparecer após isso, usa fallback:
 * POST /pedidos copiando dados do orçamento.
 * Exige role='admin'.
 */
export async function emitirPedidoDeOrcamento(
  idOrcamentoVhsys: number
): Promise<ResultadoAcao & { idPedidoVhsys?: number }> {
  try {
    await exigirAdmin();

    if (!Number.isInteger(idOrcamentoVhsys) || idOrcamentoVhsys <= 0) {
      throw new Error("idOrcamentoVhsys inválido.");
    }

    const admin = createAdminClient();

    // Idempotência: checar espelho (inclui situacao_id para validação)
    const { data: orcEspelho } = await admin
      .from("vhsys_orcamentos")
      .select("pedido_emitido, situacao_id, nome_cliente, cliente_id_vhsys, vendedor_id_vhsys, vendedor_nome, valor_total, dados")
      .eq("id_vhsys", idOrcamentoVhsys)
      .single();

    if (!orcEspelho) throw new Error("Orçamento não encontrado no espelho.");

    // Idempotência: já emitido → erro visível ao admin
    if ((orcEspelho as { pedido_emitido: boolean }).pedido_emitido) {
      return { ok: false, erro: "Pedido já emitido para este orçamento." };
    }

    // Validação: só orçamentos com situacao_id=768 (Aprovado) podem ser emitidos
    const situacaoOrc = (orcEspelho as { situacao_id: number | null }).situacao_id;
    if (situacaoOrc !== 768) {
      throw new Error(
        `Orçamento não está na situação Aprovado (situacao_id=${situacaoOrc}). Emissão bloqueada.`
      );
    }

    // Tenta marcar orçamento como Atendido via PUT + POST status
    await vhsysPut(`/orcamentos/${idOrcamentoVhsys}`, { status_pedido: "Atendido" });

    const payloadStatusOrc: PayloadStatusOrcamento = {
      data_status: hojeISO(),
      tipo_status: "Atendido",
      obs_status: "Pedido emitido via CRM.",
    };
    await vhsysPost(`/orcamentos/${idOrcamentoVhsys}/status`, payloadStatusOrc);

    // Refetch orçamento para verificar se pedido_emitido mudou
    const { data: orcAtualizado } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idOrcamentoVhsys}`);
    const orc = orcAtualizado[0];
    if (orc) await upsertOrcamentoNoEspelho(orc);

    // Se pedido_emitido=1 após o PUT/POST, buscar pedido novo na API não é
    // trivial (não há referência direta). Registrar sucesso com aviso.
    if (orc?.pedido_emitido === 1) {
      return { ok: true };
    }

    // Fallback: criar pedido manualmente copiando dados do orçamento.
    // ATENÇÃO: a API VHSYS não tem rollback — se o PUT acima falhou após
    // persistir e já houver um pedido com referencia ORC-{id} no espelho,
    // não criar novamente para evitar duplicatas.
    const referenciaPedido = `ORC-${idOrcamentoVhsys}`;
    const { data: pedidoExistente } = await admin
      .from("vhsys_pedidos")
      .select("id_vhsys")
      .eq("referencia", referenciaPedido)
      .eq("lixeira", false)
      .maybeSingle();

    if (pedidoExistente) {
      // Pedido já criado em execução anterior — marcar orçamento como emitido e retornar
      await admin
        .from("vhsys_orcamentos")
        .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
        .eq("id_vhsys", idOrcamentoVhsys);
      return { ok: true, idPedidoVhsys: (pedidoExistente as { id_vhsys: number }).id_vhsys };
    }

    const dadosOrc = (orcEspelho as { dados: VhsysOrcamento }).dados;
    const payloadPedido: PayloadCriarPedido = {
      nome_cliente: dadosOrc?.nome_cliente ?? String(orcEspelho.nome_cliente),
      id_cliente: dadosOrc?.id_cliente ?? undefined,
      vendedor_pedido: dadosOrc?.vendedor_pedido ?? String(orcEspelho.vendedor_nome ?? ""),
      vendedor_pedido_id: dadosOrc?.vendedor_pedido_id ?? undefined,
      referencia_pedido: referenciaPedido,
      obs_pedido: dadosOrc?.obs_pedido ?? "",
      status_pedido: "Em Aberto",
      estoque_pedido: 0,
      contas_pedido: 0,
    };

    const respostaPedido = await vhsysPost<RespostaCriarPedido[]>(
      "/pedidos",
      payloadPedido
    );

    const idPedido = Array.isArray(respostaPedido)
      ? respostaPedido[0]?.id_ped
      : (respostaPedido as RespostaCriarPedido).id_ped;

    if (!idPedido) throw new Error("Pedido criado mas id_ped não retornado pela API.");

    // Copiar itens do orçamento para o pedido
    const { data: itens } = await vhsysGet<Record<string, unknown>>(
      `/orcamentos/${idOrcamentoVhsys}/produtos`
    );
    for (const item of itens) {
      const i = item as Record<string, unknown>;
      const payloadItem: PayloadItemPedido = {
        id_produto: Number(i.id_produto),
        desc_produto: String(i.desc_produto ?? ""),
        qtde_produto: Number(i.qtde_produto ?? 1),
        valor_unit_produto: Number(i.valor_unit_produto ?? 0),
        desconto_produto: i.desconto_produto ? Number(i.desconto_produto) : undefined,
      };
      await vhsysPost(`/pedidos/${idPedido}/produtos`, payloadItem);
    }

    // Refetch pedido criado e upsert no espelho
    const { data: pedidoCriado } = await vhsysGet<VhsysPedido>(`/pedidos/${idPedido}`);
    if (pedidoCriado[0]) await upsertPedidoNoEspelho(pedidoCriado[0]);

    // Atualizar espelho do orçamento com pedido_emitido=true
    await admin
      .from("vhsys_orcamentos")
      .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
      .eq("id_vhsys", idOrcamentoVhsys);

    return { ok: true, idPedidoVhsys: idPedido };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

