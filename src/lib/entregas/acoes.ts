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
import { cacheInvalidate } from "@/lib/crm/cache";
import { ehAdmin } from "@/lib/auth/roles";
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

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id, id_vhsys, numero, nome_cliente, cliente_id_vhsys, pedido_emitido")
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

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id, pedido_emitido")
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

  const { data: orcData } = await supabase
    .from("vhsys_orcamentos")
    .select("id")
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
