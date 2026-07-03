"use server";
// Server Actions de ESCRITA no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Toda ação valida role='admin' antes de agir.
// Arquitetura: escrever no VHSYS primeiro → em caso de sucesso, upsert imediato
// no espelho Supabase via admin client (não aguarda o ciclo de sync).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheInvalidate } from "@/lib/crm/cache";
import { vhsysPost, vhsysPut, vhsysGet, vhsysDelete, runComTokensVhsys, type VhsysTokens } from "./client";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { getContaComTokensPorId } from "@/lib/accounts/repo";
import { registrarPedidoEmitido, registrarPagamentoAprovado } from "@/lib/notificacoes/registro";
import {
  construirModeloSituacoes,
  situacaoEfetiva,
  tipoStatusDe,
  transicaoPermitida,
  type ModeloSituacoes,
  type SituacaoBase,
} from "./situacoes-modelo";
import {
  construirModeloOrcamento,
  tipoStatusOrcamentoDe,
  transicaoOrcamentoPermitida,
  situacaoEfetivaOrcamento,
  type ModeloOrcamento,
} from "./situacoes-orcamento";
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
  role: "admin" | "superadmin" | "vendedor" | "entregador" | "financeiro";
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

  if (!profile || !["admin", "superadmin", "vendedor"].includes(profile.role as string)) {
    throw new Error("Permissão negada: somente administradores e vendedores podem executar esta ação.");
  }

  // superadmin é tratado como admin no contexto da ação (mesmos poderes).
  const roleEfetiva = profile.role === "superadmin" ? "admin" : (profile.role as "admin" | "vendedor");

  return {
    role: roleEfetiva,
    vendedorId: (profile as { vendedor_id: number | null }).vendedor_id ?? null,
    userId: user.id,
  };
}

/**
 * Guard das ações de MOVER SITUAÇÃO DE PEDIDO. Além de admin/superadmin/vendedor,
 * autoriza o papel 'financeiro' (controle total da situação do pedido). NÃO é
 * usado nas ações de orçamento nem na criação de pedido — financeiro não opera
 * essas telas. Exportado para reuso.
 */
export async function exigirMoverPedido(): Promise<ContextoAcao> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, vendedor_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "superadmin", "vendedor", "financeiro"].includes(profile.role as string)) {
    throw new Error("Permissão negada: sem autorização para mover a situação de pedidos.");
  }

  // Mantém o papel REAL (não colapsa superadmin em admin): superadmin e
  // financeiro têm um privilégio que o admin não tem — aprovar pagamento.
  return {
    role: profile.role as ContextoAcao["role"],
    vendedorId: (profile as { vendedor_id: number | null }).vendedor_id ?? null,
    userId: user.id,
  };
}


/** Conta ativa para ESCRITA: id (espelho), tokens (VHSYS) e modelos de situações. */
interface ContaEscrita {
  id: string;
  tokens: VhsysTokens;
  modelo: ModeloSituacoes;
  modeloOrc: ModeloOrcamento;
}

/**
 * Resolve a conta ativa para as ações de escrita: credenciais VHSYS (para
 * runComTokensVhsys) + modelos de situações (pedidos e orçamentos) da conta,
 * ambos data-driven das situações sincronizadas. SERVER-ONLY.
 */
async function montarContaEscrita(id: string, tokens: VhsysTokens): Promise<ContaEscrita> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vhsys_situacoes")
    .select("id_vhsys, nome, tipo_status, ordem, entidade")
    .eq("conta_id", id)
    .eq("lixeira", false)
    .order("ordem");
  const todas = (data ?? []) as (SituacaoBase & { entidade: string })[];
  return {
    id,
    tokens,
    modelo: construirModeloSituacoes(todas.filter((s) => s.entidade === "pedidos")),
    modeloOrc: construirModeloOrcamento(todas.filter((s) => s.entidade === "orcamentos")),
  };
}

async function contaEscrita(): Promise<ContaEscrita> {
  const conta = await getContaAtiva();
  return montarContaEscrita(conta.id, { ...conta.tokens, apiBase: conta.apiBase });
}

/**
 * Igual a contaEscrita(), mas para uma conta ARBITRÁRIA por id — não a ativa.
 * Necessário quando a ação atua sobre um registro de outra conta (mural
 * compartilhado): a baixa precisa dos tokens e do modelo de situações da conta
 * DONA do registro, senão o `id_vhsys` (que pode colidir entre contas) moveria
 * o pedido errado na conta ativa. SERVER-ONLY.
 */
async function contaEscritaPorId(contaId: string): Promise<ContaEscrita> {
  const res = await getContaComTokensPorId(contaId);
  if (!res || !res.account.ativo) {
    throw new Error("Conta da entrega não encontrada ou inativa.");
  }
  return montarContaEscrita(res.account.id, res.tokens);
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

// Data (só YYYY-MM-DD) de um valor que pode vir como timestamp ou date.
function soDataOuNull(s: string | null | undefined): string | null {
  const v = dataOuNull(s);
  return v ? v.slice(0, 10) : null;
}

// Data da última mudança de situação (coluna data_situacao). Mesmo fallback
// do sync/backfill: data_status (quando o payload trouxer) → data_mod_pedido
// → data_pedido — para a coluna nunca ficar nula só porque a API a omitiu.
function dataSituacaoPedido(p: VhsysPedido): string | null {
  const ds = typeof p.data_status === "string" ? p.data_status : null;
  return soDataOuNull(ds) ?? soDataOuNull(p.data_mod_pedido) ?? dataOuNull(p.data_pedido);
}


async function upsertPedidoNoEspelho(pedido: VhsysPedido, conta: ContaEscrita): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetiva(conta.modelo, pedido.situacao || null, pedido.status_pedido || null);
  const linha = {
    conta_id: conta.id,
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
    data_situacao: dataSituacaoPedido(pedido),
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
    .upsert(linha, { onConflict: "conta_id,id_vhsys" });
  if (error) throw new Error(`upsert pedido no espelho: ${error.message}`);
}

async function upsertOrcamentoNoEspelho(orc: VhsysOrcamento, conta: ContaEscrita): Promise<void> {
  const admin = createAdminClient();
  const efetiva = situacaoEfetivaOrcamento(conta.modeloOrc, orc.situacao || null, orc.status_pedido || null);
  const linha = {
    conta_id: conta.id,
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
    .upsert(linha, { onConflict: "conta_id,id_vhsys" });
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
 * Papéis: admin/superadmin/vendedor/financeiro. Aprovar pagamento (mover PARA
 * pagamento parcial/aprovado) ou tirar um pedido de "aguardando pagamento" é
 * exclusivo de superadmin e financeiro; vendedor é escopado ao próprio vendedor.
 */
export async function moverSituacaoPedido(
  idVhsys: number,
  novaSituacaoId: number,
  obs?: string,
  // Conta dona do pedido. Omitido → conta ativa (comportamento padrão do Kanban).
  // Informado → roteia tokens/espelho/modelo para essa conta (mural compartilhado).
  contaIdOverride?: string
): Promise<ResultadoAcao> {
  try {
    const ctx = await exigirMoverPedido();
    const conta = contaIdOverride
      ? await contaEscritaPorId(contaIdOverride)
      : await contaEscrita();

    // Validação de entrada
    if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
      throw new Error("idVhsys inválido.");
    }
    const tipoStatus = tipoStatusDe(conta.modelo, novaSituacaoId);
    if (!tipoStatus) throw new Error(`Situação ${novaSituacaoId} desconhecida.`);

    // Busca situação atual no espelho para validar transição
    const admin = createAdminClient();
    const { data: pedidoEspelho } = await admin
      .from("vhsys_pedidos")
      .select("situacao_id, vendedor_id_vhsys, numero, nome_cliente")
      .eq("conta_id", conta.id)
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

    // Separação de funções: aprovar pagamento (mover PARA "pagamento parcial" ou
    // "pagamento aprovado") e tirar um pedido de "aguardando pagamento" são
    // EXCLUSIVOS de superadmin e financeiro. Admin/vendedor só atuam depois da
    // aprovação (situações à frente: em separação, entrega parcial, entregue).
    const alvoPagamento =
      novaSituacaoId === conta.modelo.pagamentoAprovadoId ||
      novaSituacaoId === conta.modelo.pagamentoParcialId;
    const origemAguardando =
      situacaoAtual !== null && situacaoAtual === conta.modelo.aguardandoPagamentoId;
    if (
      (alvoPagamento || origemAguardando) &&
      ctx.role !== "superadmin" &&
      ctx.role !== "financeiro"
    ) {
      throw new Error(
        "Aprovar pagamento (ou mover um pedido em 'aguardando pagamento') é exclusivo do financeiro ou superadmin."
      );
    }

    if (!transicaoPermitida(conta.modelo, situacaoAtual, novaSituacaoId)) {
      const nomeAtual =
        (situacaoAtual !== null ? conta.modelo.nomePorId[situacaoAtual] : null) ?? "a situação atual";
      const nomeNovo = conta.modelo.nomePorId[novaSituacaoId] ?? "essa situação";
      throw new Error(
        situacaoAtual === novaSituacaoId
          ? `O pedido já está em "${nomeNovo}".`
          : `Não é possível mover de "${nomeAtual}" para "${nomeNovo}".`
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

    await runComTokensVhsys(conta.tokens, () =>
      vhsysPost<RespostaStatusPedido>(`/pedidos/${idVhsys}/status`, payload)
    );

    // Atualiza o espelho DIRETO com a situação enviada — NÃO faz refetch (GET):
    // evita a race em que o GET imediato retorna o estado antigo e grava um
    // situacao_id defasado (causa erro de transição ao mover o card de volta).
    await admin
      .from("vhsys_pedidos")
      .update({
        situacao_id: novaSituacaoId,
        status_base: tipoStatus,
        origem_situacao: "vhsys",
        // Mesma data enviada em data_status no payload acima: registra QUANDO
        // a situação mudou, para o filtro "Atualizadas em" da tela de Pedidos.
        data_situacao: payload.data_status,
        sincronizado_em: new Date().toISOString(),
      })
      .eq("conta_id", conta.id)
      .eq("id_vhsys", idVhsys);

    // Invalida o cache in-memory (comCache) para o router.refresh() do cliente
    // reler dados frescos. NÃO usa revalidatePath: re-renderizar e reencaminhar a
    // resposta da Server Action falhava intermitentemente ("failed to forward
    // action response"), o cliente recebia undefined e revertia o card mesmo com
    // a escrita já persistida. O router.refresh() do cliente já reconcilia a UI.
    cacheInvalidate("pedidos");

    // Notifica admin/superadmin quando o pagamento é APROVADO (libera entrega).
    if (novaSituacaoId === conta.modelo.pagamentoAprovadoId) {
      const ped = pedidoEspelho as { numero: number | null; nome_cliente: string | null } | null;
      const { data: perfil } = await admin
        .from("profiles")
        .select("nome")
        .eq("id", ctx.userId)
        .maybeSingle();
      await registrarPagamentoAprovado(admin, {
        contaId: conta.id,
        pedidoIdVhsys: idVhsys,
        pedidoNumero: ped?.numero ?? null,
        nomeCliente: ped?.nome_cliente ?? null,
        atorUserId: ctx.userId,
        atorNome: (perfil as { nome: string } | null)?.nome ?? null,
      });
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
    const ctx = await exigirAdminOuVendedor();
    const conta = await contaEscrita();
    const emSeparacaoId = conta.modelo.emSeparacaoId;
    // Conta sem etapa "Em separação" → nada a mover.
    if (emSeparacaoId === null) return { ok: true };

    if (!Number.isInteger(idVhsysPedido) || idVhsysPedido <= 0) {
      throw new Error("idVhsysPedido inválido.");
    }

    // Verifica situação atual — só move se gate estiver habilitado e destino for válido
    const admin = createAdminClient();
    const { data: espelho } = await admin
      .from("vhsys_pedidos")
      .select("situacao_id, vendedor_id_vhsys")
      .eq("conta_id", conta.id)
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
    if (situacaoAtual === emSeparacaoId) return { ok: true };
    if (!transicaoPermitida(conta.modelo, situacaoAtual, emSeparacaoId)) return { ok: true };

    const payload: PayloadStatusPedido = {
      data_status: hojeISO(),
      tipo_status: "Em Andamento",
      obs_status: "Entrega cadastrada no CRM.",
      situacao: emSeparacaoId,
    };

    const pedidoAtualizado = await runComTokensVhsys(conta.tokens, async () => {
      await vhsysPost<RespostaStatusPedido>(`/pedidos/${idVhsysPedido}/status`, payload);
      // Refetch para upsert no espelho.
      const { data } = await vhsysGet<VhsysPedido>(`/pedidos/${idVhsysPedido}`);
      return data;
    });
    if (pedidoAtualizado[0]) {
      await upsertPedidoNoEspelho(pedidoAtualizado[0], conta);
    }

    cacheInvalidate("pedidos");
    revalidatePath("/pedidos");

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
    const conta = await contaEscrita();

    // Validação de entrada
    if (!Number.isInteger(idOrcamentoVhsys) || idOrcamentoVhsys <= 0) {
      throw new Error("idOrcamentoVhsys inválido.");
    }
    const tipoStatus = tipoStatusOrcamentoDe(conta.modeloOrc, novaSituacaoId);
    if (!tipoStatus) throw new Error(`Situação ${novaSituacaoId} desconhecida para orçamentos.`);

    // Busca situação atual no espelho para validar transição e autoria
    const admin = createAdminClient();
    const { data: orcEspelho } = await admin
      .from("vhsys_orcamentos")
      .select("situacao_id, vendedor_id_vhsys, pedido_emitido")
      .eq("conta_id", conta.id)
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

    if (!transicaoOrcamentoPermitida(conta.modeloOrc, situacaoAtual, novaSituacaoId)) {
      const nomeAtual =
        (situacaoAtual !== null ? conta.modeloOrc.nomePorId[situacaoAtual] : null) ?? "a situação atual";
      const nomeNovo = conta.modeloOrc.nomePorId[novaSituacaoId] ?? "essa situação";
      throw new Error(
        situacaoAtual === novaSituacaoId
          ? `O orçamento já está em "${nomeNovo}".`
          : `Não é possível mover de "${nomeAtual}" para "${nomeNovo}".`
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

    await runComTokensVhsys(conta.tokens, () =>
      vhsysPost(`/orcamentos/${idOrcamentoVhsys}/status`, payload)
    );

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
      .eq("conta_id", conta.id)
      .eq("id_vhsys", idOrcamentoVhsys);

    // Invalida o cache in-memory (comCache); o router.refresh() do cliente relê
    // fresco. NÃO usa revalidatePath (ver moverSituacaoPedido: o forward da
    // resposta falhava e revertia o card com a escrita já persistida).
    cacheInvalidate("orcamentos");

    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Cria pedido a partir de orçamento aprovado (situação "Aprovado" da conta) usando os dados
 * EDITADOS no formulário do EmitirPedidoModal (cabeçalho, itens e parcelas).
 *
 * Fluxo: POST /pedidos + POST /pedidos/{id}/produtos (array) +
 * POST /pedidos/{id}/parcelas (array); rollback (DELETE) se itens/parcelas
 * falharem. Confirma o pedido lendo-o pela PK (GET /pedidos/{id_ped}); se o GET
 * vier vazio, FALHA e NÃO marca como emitido (sem "emissão fantasma"). Só após
 * confirmar, marca o orçamento como Atendido e pedido_emitido=true no espelho.
 * Idempotente via observação "Orçamento #N". Exige admin ou vendedor (autor).
 */
export async function criarPedidoDeOrcamento(
  idOrcamentoVhsys: number,
  payload: PayloadCriarPedido,
  itens: PayloadItemPedido[],
  parcelas?: PayloadParcelaPedido[]
): Promise<ResultadoAcao & { idPedidoVhsys?: number; aviso?: string }> {
  try {
    const ctx = await exigirAdminOuVendedor();
    const conta = await contaEscrita();
    const aguardandoId = conta.modelo.aguardandoPagamentoId;

    if (!Number.isInteger(idOrcamentoVhsys) || idOrcamentoVhsys <= 0) {
      throw new Error("idOrcamentoVhsys inválido.");
    }

    const admin = createAdminClient();

    // Busca no espelho — valida existência, situação e autoria
    const { data: orcEspelho } = await admin
      .from("vhsys_orcamentos")
      .select("pedido_emitido, situacao_id, vendedor_id_vhsys, numero")
      .eq("conta_id", conta.id)
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

    // Só orçamentos na situação "Aprovado" da conta podem ser emitidos.
    const situacaoOrc = (orcEspelho as { situacao_id: number | null }).situacao_id;
    if (conta.modeloOrc.aprovadoId === null || situacaoOrc !== conta.modeloOrc.aprovadoId) {
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
        .eq("conta_id", conta.id)
        .ilike("obs", `%${marcadorOrc}%`)
        .eq("lixeira", false)
        .limit(1);
      const jaEmitido = existentes?.[0] as { id_vhsys: number } | undefined;
      if (jaEmitido) {
        await admin
          .from("vhsys_orcamentos")
          .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
          .eq("conta_id", conta.id)
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
    const respostaPedido = await runComTokensVhsys(conta.tokens, () =>
      vhsysPost<RespostaCriarPedido[]>("/pedidos", payloadFinal)
    );

    const idPedido = Array.isArray(respostaPedido)
      ? respostaPedido[0]?.id_ped
      : (respostaPedido as RespostaCriarPedido).id_ped;

    if (!idPedido) throw new Error("Pedido criado mas id_ped não retornado pela API.");

    try {
      await runComTokensVhsys(conta.tokens, async () => {
        // O endpoint de produtos do PEDIDO espera um ARRAY de itens (POST único),
        // diferente do de orçamento que tolera um objeto por vez.
        await vhsysPost(`/pedidos/${idPedido}/produtos`, itens);

        // Parcelas (substitui anteriores — POST único com array)
        if (parcelas && parcelas.length > 0) {
          await vhsysPost(`/pedidos/${idPedido}/parcelas`, parcelas);
        }

        // Situação inicial: sem isso o pedido nasce SEM situação personalizada
        // (situacao=""), o espelho o marca como origem "legado" e a aba Pedidos o
        // ESCONDE (filtro "Ocultar legado" ligado por padrão). Atribui a situação
        // "Aguardando pagamento" da conta — mesmo protocolo de moverSituacaoPedido.
        const payloadSituacaoInicial: PayloadStatusPedido = {
          data_status: hojeISO(),
          tipo_status: "Em Aberto",
          ...(aguardandoId ? { situacao: aguardandoId } : {}),
        };
        await vhsysPost<RespostaStatusPedido>(
          `/pedidos/${idPedido}/status`,
          payloadSituacaoInicial
        );
      });
    } catch (errItens) {
      // Rollback: remove o pedido recém-criado (ainda não espelhado) para não
      // deixar pedido órfão sem produtos. "Ou vai tudo, ou nada é emitido."
      const detalhe = errItens instanceof Error ? errItens.message : String(errItens);
      try {
        await runComTokensVhsys(conta.tokens, () => vhsysDelete(`/pedidos/${idPedido}`));
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

    // Confirma que o pedido REALMENTE existe no VHSYS lendo-o pela PK. O GET logo
    // após o POST pode vir vazio por consistência eventual — re-tenta algumas vezes.
    let pedidoEspelho: VhsysPedido | undefined;
    for (let tentativa = 0; tentativa < 3 && !pedidoEspelho; tentativa++) {
      if (tentativa > 0) await new Promise((r) => setTimeout(r, 600));
      const { data } = await runComTokensVhsys(conta.tokens, () =>
        vhsysGet<VhsysPedido>(`/pedidos/${idPedido}`)
      );
      pedidoEspelho = data[0];
    }
    if (!pedidoEspelho) {
      // SEM MASCARAMENTO: antes, quando o GET vinha vazio, forjávamos o espelho
      // com a resposta do POST e seguíamos como sucesso — isso criava "emissões
      // fantasma" (ok:true sem o pedido existir no VHSYS). Agora falhamos de
      // forma honesta e NÃO marcamos o orçamento como emitido.
      return {
        ok: false,
        erro:
          `O VHSYS aceitou a emissão (id interno ${idPedido}) mas não confirmou o ` +
          `pedido no sistema — nada foi marcado como emitido. Verifique no VHSYS e ` +
          `tente novamente; se persistir, a integração de emissão precisa de ajuste.`,
      };
    }
    await upsertPedidoNoEspelho(pedidoEspelho, conta);

    // Fixa a situação inicial no espelho de forma AUTORITATIVA. O GET acima pode
    // ter trazido a situação antes do POST /status propagar (situacao=""), o que
    // gravaria origem "legado" e ESCONDERIA o pedido da aba (filtro "Ocultar
    // legado"). Mesma estratégia de moverSituacaoPedido: grava direto, sem refetch.
    await admin
      .from("vhsys_pedidos")
      .update({
        situacao_id: aguardandoId,
        status_base: "Em Aberto",
        origem_situacao: "vhsys",
        data_situacao: hojeISO(),
        sincronizado_em: new Date().toISOString(),
      })
      .eq("conta_id", conta.id)
      .eq("id_vhsys", idPedido);

    // Marca o orçamento como Atendido na VHSYS (best-effort: o pedido já está
    // criado e espelhado; o status "Atendido" é cosmético e o sync reconcilia).
    try {
      const orcAtualizado = await runComTokensVhsys(conta.tokens, async () => {
        await vhsysPut(`/orcamentos/${idOrcamentoVhsys}`, { status_pedido: "Atendido" });
        const payloadStatusOrc: PayloadStatusOrcamento = {
          data_status: hojeISO(),
          tipo_status: "Atendido",
          obs_status: "Pedido emitido via CRM.",
        };
        await vhsysPost(`/orcamentos/${idOrcamentoVhsys}/status`, payloadStatusOrc);
        const { data } = await vhsysGet<VhsysOrcamento>(`/orcamentos/${idOrcamentoVhsys}`);
        return data;
      });
      if (orcAtualizado[0]) await upsertOrcamentoNoEspelho(orcAtualizado[0], conta);
    } catch {
      // Status no VHSYS não pôde ser atualizado — não reverte o pedido (é válido).
    }

    // ÚLTIMA escrita no espelho do orçamento: pedido_emitido=true (precisa vir
    // depois do upsert acima, que recalcularia o flag a partir do VHSYS).
    await admin
      .from("vhsys_orcamentos")
      .update({ pedido_emitido: true, sincronizado_em: new Date().toISOString() })
      .eq("conta_id", conta.id)
      .eq("id_vhsys", idOrcamentoVhsys);

    // Invalida os caches para o pedido recém-emitido aparecer já na tela de
    // Pedidos e o orçamento sumir do fluxo de Aprovados sem esperar o TTL/sync.
    cacheInvalidate("pedidos");
    cacheInvalidate("orcamentos");
    revalidatePath("/pedidos");
    revalidatePath("/orcamentos");

    // Notifica financeiro/superadmin: pedido emitido (chega em aguardando pgto).
    // O nome do emissor é anexado à notificação. Best-effort.
    const { data: perfilEmissor } = await admin
      .from("profiles")
      .select("nome")
      .eq("id", ctx.userId)
      .maybeSingle();
    await registrarPedidoEmitido(admin, {
      contaId: conta.id,
      pedidoIdVhsys: idPedido,
      pedidoNumero: pedidoEspelho.id_pedido ?? null,
      nomeCliente: pedidoEspelho.nome_cliente ?? null,
      atorUserId: ctx.userId,
      atorNome: (perfilEmissor as { nome: string } | null)?.nome ?? null,
    });

    return { ok: true, idPedidoVhsys: idPedido };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

