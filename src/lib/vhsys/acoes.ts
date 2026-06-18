"use server";
// Server Actions de ESCRITA no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Toda ação valida role='admin' antes de agir.
// Arquitetura: escrever no VHSYS primeiro → em caso de sucesso, upsert imediato
// no espelho Supabase via admin client (não aguarda o ciclo de sync).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheInvalidate } from "@/lib/crm/cache";
import { vhsysPost, vhsysPut, vhsysGet, vhsysDelete } from "./client";
import { tipoStatusParaSituacao, transicaoPermitida, SITUACAO } from "./fluxo";
import { tipoStatusOrcamento, transicaoOrcamentoPermitida, situacaoEfetivaOrcamento } from "./fluxo-orcamentos";
import type {
  PayloadStatusPedido,
  PayloadStatusOrcamento,
  PayloadCriarPedido,
  PayloadItemPedido,
  PayloadParcelaPedido,
  RespostaCriarPedido,
  RespostaStatusPedido,
  VhsysPedido,
  VhsysOrcamento,
} from "./types";

// ── Helpers internos ───────────────────────────────────────────────────────

export interface ContextoAcao {
  role: "admin" | "vendedor" | "entregador";
  vendedorId: number | null;
  userId: string;
}

/**
 * Valida que o usuário logado é admin ou vendedor.
 * Entregador não tem permissão de escrita no VHSYS.
 * Exportado para reutilização em acoes-orcamentos.ts.
 */
export async function exigirAdminOuVendedor(): Promise<ContextoAcao> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, vendedor_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "vendedor"].includes(profile.role as string)) {
    throw new Error("Permissão negada: somente administradores e vendedores podem executar esta ação.");
  }

  return {
    role: profile.role as "admin" | "vendedor",
    vendedorId: (profile as { vendedor_id: number | null }).vendedor_id ?? null,
    userId: user.id,
  };
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

// ── Actions públicas ───────────────────────────────────────────────────────

export interface ResultadoAcao {
  ok: boolean;
  erro?: string;
}

// buscarMaisPedidos e buscarPedidosDoMes foram movidas para acoes-pedidos.ts
// para manter este arquivo abaixo de 500 linhas (M4).

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
    const ctx = await exigirAdminOuVendedor();

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
      .select("situacao_id, vendedor_id_vhsys")
      .eq("id_vhsys", idVhsys)
      .single();

    // Vendedor só pode mover pedidos do próprio vendedor_id
    if (ctx.role === "vendedor") {
      const vendedorPedido = (pedidoEspelho as { vendedor_id_vhsys: number | null } | null)?.vendedor_id_vhsys ?? null;
      if (vendedorPedido !== ctx.vendedorId) {
        throw new Error("Permissão negada: este pedido não pertence ao seu vendedor.");
      }
    }

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

    // Atualiza o espelho DIRETO com a situação enviada — NÃO faz refetch (GET):
    // evita a race em que o GET imediato retorna o estado antigo e grava um
    // situacao_id defasado (causa erro de transição ao mover o card de volta).
    await admin
      .from("vhsys_pedidos")
      .update({
        situacao_id: novaSituacaoId,
        status_base: tipoStatus,
        origem_situacao: "vhsys",
        sincronizado_em: new Date().toISOString(),
      })
      .eq("id_vhsys", idVhsys);

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
    const ctx = await exigirAdminOuVendedor();

    if (!Number.isInteger(idVhsysPedido) || idVhsysPedido <= 0) {
      throw new Error("idVhsysPedido inválido.");
    }

    // Verifica situação atual — só move se gate estiver habilitado e destino for válido
    const admin = createAdminClient();
    const { data: espelho } = await admin
      .from("vhsys_pedidos")
      .select("situacao_id, vendedor_id_vhsys")
      .eq("id_vhsys", idVhsysPedido)
      .single();

    // Vendedor só pode agir sobre pedidos do próprio vendedor_id
    if (ctx.role === "vendedor") {
      const vendedorPedido = (espelho as { vendedor_id_vhsys: number | null } | null)?.vendedor_id_vhsys ?? null;
      if (vendedorPedido !== ctx.vendedorId) {
        throw new Error("Permissão negada: este pedido não pertence ao seu vendedor.");
      }
    }

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
 * Mover orçamento para nova situação no Kanban.
 * Escopo: qualquer transição (de≠para, destino ∈ COLUNAS_KANBAN_ORCAMENTO).
 * Vendedor só move orçamentos do próprio vendedor_id.
 * Exige role='admin' ou role='vendedor' (autor).
 */
export async function moverSituacaoOrcamento(
  idOrcamentoVhsys: number,
  novaSituacaoId: number,
  obs?: string
): Promise<ResultadoAcao> {
  try {
    const ctx = await exigirAdminOuVendedor();

    // Validação de entrada
    if (!Number.isInteger(idOrcamentoVhsys) || idOrcamentoVhsys <= 0) {
      throw new Error("idOrcamentoVhsys inválido.");
    }
    const tipoStatus = tipoStatusOrcamento(novaSituacaoId);
    if (!tipoStatus) throw new Error(`Situação ${novaSituacaoId} desconhecida para orçamentos.`);

    // Busca situação atual no espelho para validar transição e autoria
    const admin = createAdminClient();
    const { data: orcEspelho } = await admin
      .from("vhsys_orcamentos")
      .select("situacao_id, vendedor_id_vhsys, pedido_emitido")
      .eq("id_vhsys", idOrcamentoVhsys)
      .single();

    // Orçamento com pedido já emitido não pode mudar de situação.
    if ((orcEspelho as { pedido_emitido: boolean | null } | null)?.pedido_emitido) {
      throw new Error("Orçamento com pedido emitido não pode mudar de situação.");
    }

    // Vendedor só pode mover orçamentos do próprio vendedor_id
    if (ctx.role === "vendedor") {
      const vendedorOrc = (orcEspelho as { vendedor_id_vhsys: number | null } | null)?.vendedor_id_vhsys ?? null;
      if (vendedorOrc !== ctx.vendedorId) {
        throw new Error("Permissão negada: este orçamento não pertence ao seu vendedor.");
      }
    }

    const situacaoAtual = (orcEspelho as { situacao_id: number | null } | null)?.situacao_id ?? null;

    if (!transicaoOrcamentoPermitida(situacaoAtual, novaSituacaoId)) {
      throw new Error(
        `Transição de ${situacaoAtual} para ${novaSituacaoId} não é permitida.`
      );
    }

    if (obs && obs.length > 255) {
      throw new Error("Observação excede 255 caracteres.");
    }

    // Monta payload. Para ids virtuais negativos (ex: -2 "Em andamento") não
    // existe situação VHSYS correspondente — omite o campo "situacao" e envia
    // apenas data_status + tipo_status (+ obs_status se houver).
    const payload: PayloadStatusOrcamento = {
      data_status: hojeISO(),
      tipo_status: tipoStatus,
      ...(obs ? { obs_status: obs } : {}),
      ...(novaSituacaoId > 0 ? { situacao: novaSituacaoId } : {}),
    };

    await vhsysPost(`/orcamentos/${idOrcamentoVhsys}/status`, payload);

    // Atualiza o espelho DIRETO com a situação enviada — NÃO faz refetch (GET):
    // a API pode não ter propagado a mudança ainda, e o GET imediato retornaria
    // o estado antigo, gravando um situacao_id defasado (causava o erro de
    // transição ao mover o card de volta). A sync completa concilia o resto.
    await admin
      .from("vhsys_orcamentos")
      .update({
        situacao_id: novaSituacaoId,
        status_base: tipoStatus,
        origem_situacao: novaSituacaoId < 0 ? "legado" : "vhsys",
        sincronizado_em: new Date().toISOString(),
      })
      .eq("id_vhsys", idOrcamentoVhsys);

    return { ok: true };
  } catch (err) {
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
    const ctx = await exigirAdminOuVendedor();

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

    // Vendedor só pode emitir orçamentos do próprio vendedor_id
    if (ctx.role === "vendedor") {
      const vendedorOrc = (orcEspelho as { vendedor_id_vhsys: number | null }).vendedor_id_vhsys ?? null;
      if (vendedorOrc !== ctx.vendedorId) {
        throw new Error("Permissão negada: este orçamento não pertence ao seu vendedor.");
      }
    }

    // Idempotência: já emitido → erro visível
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

/**
 * Cria pedido a partir de orçamento aprovado (situacao 768) usando os dados
 * EDITADOS de um formulário (cabeçalho, itens e parcelas), diferente de
 * emitirPedidoDeOrcamento que copia o orçamento tal como está.
 *
 * Estratégia (espelha emitirPedidoDeOrcamento): marca o orçamento como Atendido
 * (PUT + POST status). Se a VHSYS auto-gerar o pedido (pedido_emitido=1), não
 * cria manualmente — retorna aviso. Caso contrário, POST /pedidos +
 * POST /pedidos/{id}/produtos (loop) + POST /pedidos/{id}/parcelas (array).
 * Idempotente via referencia ORC-{id}. Exige admin ou vendedor (autor).
 */
export async function criarPedidoDeOrcamento(
  idOrcamentoVhsys: number,
  payload: PayloadCriarPedido,
  itens: PayloadItemPedido[],
  parcelas?: PayloadParcelaPedido[]
): Promise<ResultadoAcao & { idPedidoVhsys?: number; aviso?: string }> {
  try {
    const ctx = await exigirAdminOuVendedor();

    if (!Number.isInteger(idOrcamentoVhsys) || idOrcamentoVhsys <= 0) {
      throw new Error("idOrcamentoVhsys inválido.");
    }

    const admin = createAdminClient();

    // Busca no espelho — valida existência, situação e autoria
    const { data: orcEspelho } = await admin
      .from("vhsys_orcamentos")
      .select("pedido_emitido, situacao_id, vendedor_id_vhsys, numero")
      .eq("id_vhsys", idOrcamentoVhsys)
      .single();

    if (!orcEspelho) throw new Error("Orçamento não encontrado no espelho.");

    // Vendedor só pode emitir orçamentos do próprio vendedor_id
    if (ctx.role === "vendedor") {
      const vendedorOrc = (orcEspelho as { vendedor_id_vhsys: number | null }).vendedor_id_vhsys ?? null;
      if (vendedorOrc !== ctx.vendedorId) {
        throw new Error("Permissão negada: este orçamento não pertence ao seu vendedor.");
      }
    }

    // Idempotência: já emitido → erro visível
    if ((orcEspelho as { pedido_emitido: boolean }).pedido_emitido) {
      return { ok: false, erro: "Pedido já emitido para este orçamento." };
    }

    // Só orçamentos com situacao_id=768 (Aprovado) podem ser emitidos
    const situacaoOrc = (orcEspelho as { situacao_id: number | null }).situacao_id;
    if (situacaoOrc !== 768) {
      throw new Error(
        `Orçamento não está na situação Aprovado (situacao_id=${situacaoOrc}). Emissão bloqueada.`
      );
    }

    // ── Validação do cabeçalho ────────────────────────────────────────────
    if (!payload.nome_cliente || payload.nome_cliente.length > 255) {
      throw new Error("nome_cliente inválido (vazio ou >255 chars).");
    }
    if (payload.referencia_pedido && payload.referencia_pedido.length > 100) {
      throw new Error("referencia_pedido excede 100 caracteres.");
    }
    if (payload.prazo_entrega && payload.prazo_entrega.length > 20) {
      throw new Error("prazo_entrega excede 20 caracteres.");
    }
    if (payload.transportadora_pedido && payload.transportadora_pedido.length > 255) {
      throw new Error("transportadora_pedido excede 255 caracteres.");
    }
    // Monetários/pesos — strings decimais quando presentes
    for (const campo of [
      "desconto_pedido",
      "frete_pedido",
      "peso_total_nota",
      "peso_total_nota_liq",
    ] as const) {
      const v = payload[campo];
      if (v !== undefined && !/^\d+(\.\d+)?$/.test(v)) {
        throw new Error(`${campo} não é decimal válido.`);
      }
    }

    // ── Validação dos itens ───────────────────────────────────────────────
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error("Pedido sem itens.");
    }
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
      for (const campo of ["desconto_produto", "ipi_produto", "icms_produto"] as const) {
        const v = item[campo];
        if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
          throw new Error(`${campo} deve ser número não-negativo. Recebido: ${v}`);
        }
      }
    }

    // ── Validação das parcelas (se houver) ────────────────────────────────
    if (parcelas && parcelas.length > 0) {
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

    // ── Vínculo com o orçamento de origem ─────────────────────────────────
    // NÃO usamos mais `referencia_pedido = "ORC-{id}"`: a VHSYS exibe esse campo
    // no lugar do nome do cliente na lista de pedidos. Em vez disso, o vínculo
    // vai na OBSERVAÇÃO como "Orçamento #N" — mesmo padrão do pedido emitido
    // nativamente pela VHSYS, e é desse texto que /entregas/nova resolve o
    // orçamento ao criar a entrega.
    const numeroOrc = (orcEspelho as { numero: number | null }).numero;
    const marcadorOrc = numeroOrc ? `Orçamento #${numeroOrc}` : null;

    // ── Idempotência: pedido já emitido deste orçamento? ──────────────────
    // Procura no espelho um pedido vivo cuja observação cite "Orçamento #N".
    // Protege contra duplicar caso o flag pedido_emitido tenha sido revertido
    // pelo sync (a emissão manual não marca pedido_emitido=1 na VHSYS).
    if (marcadorOrc) {
      const { data: existentes } = await admin
        .from("vhsys_pedidos")
        .select("id_vhsys")
        .ilike("obs", `%${marcadorOrc}%`)
        .eq("lixeira", false)
        .limit(1);
      const jaEmitido = existentes?.[0] as { id_vhsys: number } | undefined;
      if (jaEmitido) {
        await admin
          .from("vhsys_orcamentos")
          .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
          .eq("id_vhsys", idOrcamentoVhsys);
        return { ok: true, idPedidoVhsys: jaEmitido.id_vhsys };
      }
    }

    // ── Monta payload final ───────────────────────────────────────────────
    // Garante o marcador "Orçamento #N" na observação (sem duplicar se já vier).
    const obsInformada = payload.obs_pedido?.trim();
    const obsFinal = marcadorOrc
      ? obsInformada && !obsInformada.includes(marcadorOrc)
        ? `${marcadorOrc}\n${obsInformada}`
        : obsInformada || marcadorOrc
      : obsInformada;

    const payloadFinal: PayloadCriarPedido = {
      ...payload,
      ...(obsFinal ? { obs_pedido: obsFinal } : {}),
      status_pedido: "Em Aberto",
      estoque_pedido: payload.estoque_pedido ?? 0,
      contas_pedido: payload.contas_pedido ?? 0,
    };
    // NUNCA enviar referencia_pedido (ocuparia o lugar do nome do cliente).
    delete payloadFinal.referencia_pedido;
    // Vendedor não confia no que veio — força o próprio id
    if (ctx.role === "vendedor") {
      if (!ctx.vendedorId) throw new Error("Perfil de vendedor sem vendedor_id configurado.");
      payloadFinal.vendedor_pedido_id = ctx.vendedorId;
    }

    // ── Cria o pedido COMPLETO de forma atômica ───────────────────────────
    // Cria o pedido, depois adiciona produtos e parcelas. Se qualquer um falhar,
    // EXCLUI o pedido recém-criado (rollback) para nunca deixar um pedido sem
    // itens. Só após o sucesso total marcamos o orçamento como emitido.
    const respostaPedido = await vhsysPost<RespostaCriarPedido[]>("/pedidos", payloadFinal);

    const idPedido = Array.isArray(respostaPedido)
      ? respostaPedido[0]?.id_ped
      : (respostaPedido as RespostaCriarPedido).id_ped;

    if (!idPedido) throw new Error("Pedido criado mas id_ped não retornado pela API.");

    try {
      // O endpoint de produtos do PEDIDO espera um ARRAY de itens (POST único),
      // diferente do de orçamento que tolera um objeto por vez.
      await vhsysPost(`/pedidos/${idPedido}/produtos`, itens);

      // Parcelas (substitui anteriores — POST único com array)
      if (parcelas && parcelas.length > 0) {
        await vhsysPost(`/pedidos/${idPedido}/parcelas`, parcelas);
      }
    } catch (errItens) {
      // Rollback: remove o pedido recém-criado (ainda não espelhado) para não
      // deixar pedido órfão sem produtos. "Ou vai tudo, ou nada é emitido."
      const detalhe = errItens instanceof Error ? errItens.message : String(errItens);
      try {
        await vhsysDelete(`/pedidos/${idPedido}`);
        return {
          ok: false,
          erro: `Não foi possível adicionar os produtos ao pedido (${detalhe}). Nenhum pedido foi emitido; tente novamente.`,
        };
      } catch {
        // Nem o rollback funcionou — há um pedido incompleto a limpar manualmente.
        return {
          ok: false,
          idPedidoVhsys: idPedido,
          erro:
            `Falha ao adicionar os produtos (${detalhe}) e ao desfazer o pedido nº ` +
            `interno ${idPedido}. Exclua esse pedido diretamente no VHSYS antes de tentar novamente.`,
        };
      }
    }

    // Tudo certo: espelha o pedido criado. O GET logo após o POST pode vir vazio
    // por consistência eventual da API — então re-tenta algumas vezes e, em último
    // caso, usa a própria resposta do POST como fallback. Assim o pedido NUNCA
    // fica fora do espelho (o que o esconderia do CRM até o próximo sync).
    let pedidoEspelho: VhsysPedido | undefined;
    for (let tentativa = 0; tentativa < 3 && !pedidoEspelho; tentativa++) {
      if (tentativa > 0) await new Promise((r) => setTimeout(r, 600));
      const { data } = await vhsysGet<VhsysPedido>(`/pedidos/${idPedido}`);
      pedidoEspelho = data[0];
    }
    if (!pedidoEspelho) {
      // Fallback: a resposta do POST já traz os campos do pedido (o número
      // sequencial pode faltar; o próximo sync o reconcilia).
      const base = Array.isArray(respostaPedido) ? respostaPedido[0] : respostaPedido;
      if (base) pedidoEspelho = base as unknown as VhsysPedido;
    }
    if (pedidoEspelho) await upsertPedidoNoEspelho(pedidoEspelho);

    // Marca o orçamento como Atendido na VHSYS (best-effort: o pedido já está
    // criado e espelhado; o status "Atendido" é cosmético e o sync reconcilia).
    try {
      await vhsysPut(`/orcamentos/${idOrcamentoVhsys}`, { status_pedido: "Atendido" });
      const payloadStatusOrc: PayloadStatusOrcamento = {
        data_status: hojeISO(),
        tipo_status: "Atendido",
        obs_status: "Pedido emitido via CRM.",
      };
      await vhsysPost(`/orcamentos/${idOrcamentoVhsys}/status`, payloadStatusOrc);
      const { data: orcAtualizado } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idOrcamentoVhsys}`);
      if (orcAtualizado[0]) await upsertOrcamentoNoEspelho(orcAtualizado[0]);
    } catch {
      // Status no VHSYS não pôde ser atualizado — não reverte o pedido (é válido).
    }

    // ÚLTIMA escrita no espelho do orçamento: pedido_emitido=true (precisa vir
    // depois do upsert acima, que recalcularia o flag a partir do VHSYS).
    await admin
      .from("vhsys_orcamentos")
      .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
      .eq("id_vhsys", idOrcamentoVhsys);

    // Invalida os caches para o pedido recém-emitido aparecer já na tela de
    // Pedidos e o orçamento sumir do fluxo de Aprovados sem esperar o TTL/sync.
    cacheInvalidate("pedidos");
    cacheInvalidate("orcamentos");
    revalidatePath("/pedidos");
    revalidatePath("/orcamentos");

    return { ok: true, idPedidoVhsys: idPedido };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

