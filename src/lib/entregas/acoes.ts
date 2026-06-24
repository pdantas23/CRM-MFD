"use server";
// Server Actions de ESCRITA em entregas. Validam admin e invalidam o cache
// in-memory da lista (comCache chave "entregas|...") para a UI refletir na hora.
//
// Modelo: a entrega é vinculada ao ORÇAMENTO (entregas.orcamento_id). O usuário
// identifica os pedidos pelo NÚMERO DO ORÇAMENTO (sequência própria do VHSYS,
// diferente da do pedido). Regra "só pedidos reais viram entregas": no cadastro
// exige-se que o orçamento já tenha sido emitido como pedido (pedido_emitido).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheInvalidate } from "@/lib/crm/cache";
import { ehAdmin } from "@/lib/auth/roles";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { moverSituacaoPedido } from "@/lib/vhsys/acoes";
import { construirModeloSituacoes, type SituacaoBase } from "@/lib/vhsys/situacoes-modelo";
import type { Periodo, StatusEntrega } from "@/lib/types/database";

/** Dados do orçamento úteis para preencher e vincular uma entrega. */
export interface OrcamentoParaEntrega {
  id: string; // uuid em vhsys_orcamentos
  idVhsys: number;
  numero: number;
  nome_cliente: string;
  emitido: boolean;
  cpf_cnpj: string | null;
  bairro: string | null;
  endereco: string | null;
}

type ResultadoBusca =
  | { ok: true; orcamento: OrcamentoParaEntrega }
  | { ok: false; erro: string };

async function exigirAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, erro: "Não autenticado." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!ehAdmin((profile as { role: string } | null)?.role)) {
    return { supabase, userId: null, erro: "Permissão negada: somente administradores." as const };
  }
  return { supabase, userId: user.id, erro: null };
}

type OrcamentoRowMin = {
  id: string;
  id_vhsys: number;
  numero: number;
  nome_cliente: string;
  cliente_id_vhsys: number | null;
  pedido_emitido: boolean | null;
};

/** Busca o orçamento pelo número + dados do cliente. */
export async function buscarOrcamentoParaEntrega(
  numeroOrcamento: number
): Promise<ResultadoBusca> {
  if (!Number.isInteger(numeroOrcamento) || numeroOrcamento <= 0) {
    return { ok: false, erro: "Número de orçamento inválido." };
  }

  const { supabase, erro } = await exigirAdmin();
  if (erro) return { ok: false, erro };

  const conta = await getContaAtiva();

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id, id_vhsys, numero, nome_cliente, cliente_id_vhsys, pedido_emitido")
    .eq("conta_id", conta.id)
    .eq("numero", numeroOrcamento)
    .eq("lixeira", false)
    .limit(1)
    .maybeSingle();
  if (!orcData) {
    return { ok: false, erro: "Orçamento não encontrado com esse número." };
  }
  const orc = orcData as unknown as OrcamentoRowMin;

  type ClienteEntrega = {
    cnpj_cpf: string | null;
    bairro: string | null;
    endereco: string | null;
    numero: string | null;
  };
  let cli: ClienteEntrega | null = null;
  if (orc.cliente_id_vhsys) {
    const { data } = await supabase
      .from("vhsys_clientes")
      .select("cnpj_cpf, bairro, endereco, numero")
      .eq("conta_id", conta.id)
      .eq("id_vhsys", orc.cliente_id_vhsys)
      .maybeSingle();
    cli = (data as unknown as ClienteEntrega | null) ?? null;
  }

  const endereco = cli
    ? [cli.endereco, cli.numero].filter(Boolean).join(", ") || null
    : null;

  return {
    ok: true,
    orcamento: {
      id: orc.id,
      idVhsys: orc.id_vhsys,
      numero: orc.numero,
      nome_cliente: orc.nome_cliente,
      emitido: orc.pedido_emitido === true,
      cpf_cnpj: cli?.cnpj_cpf ?? null,
      bairro: cli?.bairro ?? null,
      endereco,
    },
  };
}

export interface DadosEntrega {
  data: string;
  periodo: Periodo;
  status: StatusEntrega;
  nome_cliente: string;
  cpf_cnpj: string;
  numero_orcamento: string;
  bairro: string;
  endereco: string;
}

type ResultadoCriar =
  | { ok: true; entregaId: string }
  | { ok: false; erro: string };

/**
 * Cria uma entrega vinculada a um orçamento. Bloqueia se o orçamento ainda não
 * virou pedido (pedido_emitido=false) — só pedidos reais geram entregas.
 */
export async function criarEntregaDeOrcamento(
  dados: DadosEntrega,
  numeroOrcamento: number
): Promise<ResultadoCriar> {
  const { supabase, userId, erro } = await exigirAdmin();
  if (erro) return { ok: false, erro };

  const conta = await getContaAtiva();

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id, pedido_emitido")
    .eq("conta_id", conta.id)
    .eq("numero", numeroOrcamento)
    .eq("lixeira", false)
    .limit(1)
    .maybeSingle();
  if (!orcData) return { ok: false, erro: "Orçamento não encontrado com esse número." };
  const orc = orcData as unknown as { id: string; pedido_emitido: boolean | null };

  if (orc.pedido_emitido !== true) {
    return {
      ok: false,
      erro: "Este orçamento ainda não virou pedido — não é possível cadastrar entrega.",
    };
  }

  const { data: nova, error } = await supabase
    .from("entregas")
    .insert({
      data: dados.data,
      periodo: dados.periodo,
      status: dados.status,
      nome_cliente: dados.nome_cliente,
      cpf_cnpj: dados.cpf_cnpj,
      numero_orcamento: dados.numero_orcamento,
      bairro: dados.bairro,
      endereco: dados.endereco,
      orcamento_id: orc.id,
      conta_id: conta.id,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  cacheInvalidate("entregas");
  return { ok: true, entregaId: (nova as { id: string }).id };
}

type ResultadoVinculo =
  | { ok: true; orcamentoId: string }
  | { ok: false; erro: string };

/**
 * Vínculo retroativo: associa uma entrega existente a um orçamento pelo número,
 * para sincronizar/exibir os dados e produtos. Grava entregas.orcamento_id e
 * invalida o cache.
 */
export async function vincularEntregaOrcamento(
  entregaId: string,
  numeroOrcamento: number
): Promise<ResultadoVinculo> {
  if (!Number.isInteger(numeroOrcamento) || numeroOrcamento <= 0) {
    return { ok: false, erro: "Número de orçamento inválido." };
  }

  const { supabase, erro } = await exigirAdmin();
  if (erro) return { ok: false, erro };

  const conta = await getContaAtiva();

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id")
    .eq("conta_id", conta.id)
    .eq("numero", numeroOrcamento)
    .eq("lixeira", false)
    .limit(1)
    .maybeSingle();
  if (!orcData) return { ok: false, erro: "Orçamento não encontrado com esse número." };
  const orcamentoId = (orcData as unknown as { id: string }).id;

  // .select() confirma a persistência: a RLS, se bloquear, devolve 0 linhas
  // SEM erro — sem isto a falha passaria despercebida.
  const { data: salvo, error } = await supabase
    .from("entregas")
    .update({ orcamento_id: orcamentoId })
    .eq("id", entregaId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  if (!salvo) {
    return { ok: false, erro: "Não foi possível salvar o vínculo (sem permissão para editar esta entrega)." };
  }

  cacheInvalidate("entregas");
  return { ok: true, orcamentoId };
}

const PERIODOS_VALIDOS: ReadonlySet<Periodo> = new Set<Periodo>([
  "manha",
  "tarde",
  "noite",
]);

/**
 * Move uma entrega para outro dia/turno (base do drag-and-drop do admin).
 * A RLS já garante que só admin atualiza; exigirAdmin é a checagem na borda.
 */
export async function moverEntrega(
  id: string,
  novaData: string, // "YYYY-MM-DD"
  novoPeriodo: Periodo
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!id) return { ok: false, erro: "Entrega inválida." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
      return { ok: false, erro: "Data inválida." };
    }
    if (!PERIODOS_VALIDOS.has(novoPeriodo)) {
      return { ok: false, erro: "Período inválido." };
    }

    const { erro } = await exigirAdmin();
    if (erro) return { ok: false, erro };

    const supabase = await createClient();
    const { error } = await supabase
      .from("entregas")
      .update({ data: novaData, periodo: novoPeriodo })
      .eq("id", id);

    if (error) return { ok: false, erro: error.message };

    cacheInvalidate("entregas");
    revalidatePath("/entregas");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

export async function excluirEntrega(
  id: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!id) return { ok: false, erro: "Entrega inválida." };

    const { supabase, erro } = await exigirAdmin();
    if (erro) return { ok: false, erro };

    // Carrega o anexo legado e confirma que a entrega existe.
    const { data: entregaRow } = await supabase
      .from("entregas")
      .select("anexo_url")
      .eq("id", id)
      .maybeSingle();
    if (!entregaRow) return { ok: false, erro: "Entrega não encontrada." };

    // Reúne os caminhos no bucket (anexo legado + linhas de entrega_anexos) para
    // apagar os arquivos antes do delete (o cascade só remove as linhas, não os
    // arquivos do storage).
    const extrairCaminho = (url: string | null): string | null => {
      if (!url) return null;
      const partes = url.split("/anexos-entregas/");
      return partes[1] || null;
    };

    const caminhos: string[] = [];
    const legado = extrairCaminho(
      (entregaRow as { anexo_url: string | null }).anexo_url
    );
    if (legado) caminhos.push(legado);

    const { data: anexos } = await supabase
      .from("entrega_anexos")
      .select("url")
      .eq("entrega_id", id);
    for (const a of (anexos ?? []) as { url: string }[]) {
      const c = extrairCaminho(a.url);
      if (c) caminhos.push(c);
    }

    // Best-effort: não bloqueia a exclusão se a remoção dos arquivos falhar.
    if (caminhos.length > 0) {
      await supabase.storage.from("anexos-entregas").remove(caminhos);
    }

    // Remove a entrega (cascade apaga entrega_anexos). O .select() confirma que a
    // RLS permitiu o delete (sem linha => registro inexistente ou sem permissão).
    const { data: removida, error } = await supabase
      .from("entregas")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, erro: error.message };
    if (!removida) return { ok: false, erro: "Não foi possível excluir a entrega." };

    cacheInvalidate("entregas");
    revalidatePath("/entregas");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

// ── Marcar/desmarcar entrega como realizada ("entregue") ──────────────────────

type ResultadoMarcar =
  | { ok: true; aviso?: string }
  | { ok: false; erro: string };

/**
 * Resolve o id_vhsys (id_ped) do PEDIDO emitido a partir do orçamento da entrega.
 *
 * A entrega guarda o ORÇAMENTO (orcamento_id uuid → vhsys_orcamentos.id) ou, na
 * falta dele, o numero_orcamento textual. Não há FK confiável orçamento→pedido
 * no espelho; o vínculo é o MESMO heurístico usado em /entregas/nova (sentido
 * inverso): um pedido emitido daquele orçamento cita-o por
 *   - obs "Orçamento #N"  (emissão manual via CRM — criarPedidoDeOrcamento), ou
 *   - referencia "ORC-{id_vhsys}" (emissão nativa/fallback).
 * Procura no espelho de pedidos (admin client) por qualquer um desses padrões.
 * Retorna null se não houver pedido vinculado (ex.: entrega sem orçamento ou
 * orçamento ainda não emitido) — o chamador trata como aviso, não erro.
 */
async function resolverPedidoIdVhsys(
  admin: ReturnType<typeof createAdminClient>,
  contaId: string,
  orcamentoId: string | null,
  numeroOrcamentoTexto: string | null
): Promise<number | null> {
  // 1. Descobre id_vhsys + numero do orçamento (por uuid ou por número textual).
  let orcIdVhsys: number | null = null;
  let orcNumero: number | null = null;

  if (orcamentoId) {
    const { data } = await admin
      .from("vhsys_orcamentos")
      .select("id_vhsys, numero")
      .eq("id", orcamentoId)
      .maybeSingle();
    const o = data as { id_vhsys: number; numero: number } | null;
    orcIdVhsys = o?.id_vhsys ?? null;
    orcNumero = o?.numero ?? null;
  } else if (numeroOrcamentoTexto) {
    const n = Number(numeroOrcamentoTexto);
    if (Number.isInteger(n) && n > 0) {
      const { data } = await admin
        .from("vhsys_orcamentos")
        .select("id_vhsys, numero")
        .eq("conta_id", contaId)
        .eq("numero", n)
        .eq("lixeira", false)
        .limit(1)
        .maybeSingle();
      const o = data as { id_vhsys: number; numero: number } | null;
      orcIdVhsys = o?.id_vhsys ?? null;
      orcNumero = o?.numero ?? null;
    }
  }

  if (orcIdVhsys === null && orcNumero === null) return null;

  // 2. Procura o pedido que cita esse orçamento na obs ("Orçamento #N") ou na
  //    referencia ("ORC-{id_vhsys}"). Pedido vivo (lixeira=false).
  const filtros: string[] = [];
  if (orcNumero !== null) filtros.push(`obs.ilike.%Orçamento #${orcNumero}%`);
  if (orcIdVhsys !== null) filtros.push(`referencia.eq.ORC-${orcIdVhsys}`);
  if (filtros.length === 0) return null;

  const { data: ped } = await admin
    .from("vhsys_pedidos")
    .select("id_vhsys")
    .eq("conta_id", contaId)
    .or(filtros.join(","))
    .eq("lixeira", false)
    .limit(1)
    .maybeSingle();

  return (ped as { id_vhsys: number } | null)?.id_vhsys ?? null;
}

/**
 * Marca uma entrega como entregue (estado de controle do admin). Ao marcar,
 * tenta mover o PEDIDO correspondente no VHSYS:
 *   - entrega_final   → ENTREGUE (777)
 *   - entrega_parcial → ENTREGA_PARCIAL (1180)
 * A baixa da entrega NÃO é revertida se o VHSYS falhar (pedido não encontrado,
 * transição não permitida, erro de API): retorna { ok:true, aviso } e a entrega
 * permanece marcada. Idempotente: se já estiver entregue, retorna ok.
 */
export async function marcarEntregaEntregue(
  entregaId: string
): Promise<ResultadoMarcar> {
  if (!entregaId) return { ok: false, erro: "Entrega inválida." };

  const { supabase, userId, erro } = await exigirAdmin();
  if (erro) return { ok: false, erro };

  // Carrega o estado atual da entrega.
  const { data: entregaRow } = await supabase
    .from("entregas")
    .select("status, orcamento_id, numero_orcamento, entregue_em")
    .eq("id", entregaId)
    .maybeSingle();
  if (!entregaRow) return { ok: false, erro: "Entrega não encontrada." };
  const entrega = entregaRow as {
    status: string;
    orcamento_id: string | null;
    numero_orcamento: string | null;
    entregue_em: string | null;
  };

  // Idempotente: já entregue → nada a fazer.
  if (entrega.entregue_em) return { ok: true };

  // Marca a entrega. .select() confirma a persistência (RLS devolve 0 linhas
  // sem erro se bloqueada).
  const { data: salvo, error } = await supabase
    .from("entregas")
    .update({ entregue_em: new Date().toISOString(), entregue_por: userId })
    .eq("id", entregaId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!salvo) {
    return { ok: false, erro: "Não foi possível marcar a entrega (sem permissão)." };
  }

  cacheInvalidate("entregas");
  revalidatePath("/entregas");

  // Move o pedido no VHSYS — best-effort. Falha NÃO reverte a baixa.
  const admin = createAdminClient();
  const conta = await getContaAtiva();
  const idVhsys = await resolverPedidoIdVhsys(
    admin,
    conta.id,
    entrega.orcamento_id,
    entrega.numero_orcamento
  );

  if (idVhsys === null) {
    return {
      ok: true,
      aviso:
        "Entrega marcada, mas não foi possível localizar o pedido vinculado no VHSYS para atualizar a situação.",
    };
  }

  // Situação destino derivada do modelo da CONTA ATIVA (IDs por conta).
  const { data: sits } = await admin
    .from("vhsys_situacoes")
    .select("id_vhsys, nome, tipo_status, ordem")
    .eq("conta_id", conta.id)
    .eq("entidade", "pedidos")
    .eq("lixeira", false)
    .order("ordem");
  const modelo = construirModeloSituacoes((sits ?? []) as SituacaoBase[]);
  const novaSituacao =
    entrega.status === "entrega_final"
      ? modelo.entregueId
      : (modelo.entregaParcialId ?? modelo.entregueId);
  if (novaSituacao === null) {
    return {
      ok: true,
      aviso: "Entrega marcada, mas a conta não tem situação de 'Entregue' mapeada.",
    };
  }
  const res = await moverSituacaoPedido(idVhsys, novaSituacao, "Baixa de entrega");

  // moverSituacaoPedido já gravou a nova situação no espelho (vhsys_pedidos),
  // mas o cache das telas de Pedidos/Orçamentos precisa ser invalidado para a
  // mudança aparecer sem esperar o TTL/sync — mesmo padrão da emissão de pedido.
  cacheInvalidate("pedidos");
  cacheInvalidate("orcamentos");
  revalidatePath("/pedidos");
  revalidatePath("/orcamentos");

  if (!res.ok) {
    // Transição não permitida (ex.: pedido já ENTREGUE / vindo de CANCELADO):
    // sucesso silencioso — o destino já é o esperado ou não há o que fazer.
    if (res.erro && /transi[çc][ãa]o/i.test(res.erro)) {
      return { ok: true };
    }
    return {
      ok: true,
      aviso: `Entrega marcada, mas a situação do pedido no VHSYS não pôde ser atualizada: ${res.erro ?? "erro desconhecido"}.`,
    };
  }

  return { ok: true };
}

/**
 * Desmarca a entrega (remove a baixa). NÃO reverte a situação do pedido no VHSYS:
 * o pedido pode ter avançado por outros motivos e o admin reverte manualmente no
 * Kanban se necessário — a desmarcação aqui é apenas do estado local da entrega.
 */
export async function desmarcarEntregaEntregue(
  entregaId: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!entregaId) return { ok: false, erro: "Entrega inválida." };

  const { supabase, erro } = await exigirAdmin();
  if (erro) return { ok: false, erro };

  const { data: salvo, error } = await supabase
    .from("entregas")
    .update({ entregue_em: null, entregue_por: null })
    .eq("id", entregaId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, erro: error.message };
  if (!salvo) {
    return { ok: false, erro: "Não foi possível desmarcar a entrega (sem permissão)." };
  }

  cacheInvalidate("entregas");
  revalidatePath("/entregas");
  return { ok: true };
}
