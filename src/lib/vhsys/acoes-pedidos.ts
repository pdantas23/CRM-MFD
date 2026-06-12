"use server";
// Server Actions de LEITURA de pedidos — paginação e calendário.
// Extraído de acoes.ts para manter aquele arquivo abaixo de 500 linhas.

import { createClient } from "@/lib/supabase/server";
import type { PedidoRow } from "@/lib/types/pedidos";

// Colunas mínimas para Kanban (excluindo dados jsonb e campos não usados)
const COLS_PEDIDO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, " +
  "vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, " +
  "data_pedido, prazo_entrega, referencia, obs, data_mod_vhsys, lixeira";

type ProfileLean = { role: string; vendedor_id: number | null };

/** Carrega o perfil autenticado. Lança erro se não autenticado ou sem perfil. */
async function obterProfile(): Promise<ProfileLean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, vendedor_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Perfil não encontrado.");
  return profile as ProfileLean;
}

/**
 * Carrega mais pedidos de uma coluna específica do Kanban (paginação).
 * Acessível a qualquer role autenticada; vendedor vê apenas seus pedidos.
 * Vendedor sem vendedor_id → retorna lista vazia (nunca vaza dados).
 */
export async function buscarMaisPedidos(
  situacaoId: number,
  offset: number
): Promise<{ pedidos: PedidoRow[]; erro?: string }> {
  try {
    // Validação de entrada
    if (!Number.isInteger(situacaoId) || situacaoId <= 0) {
      throw new Error("situacaoId inválido.");
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset inválido.");
    }

    const profile = await obterProfile();

    // C2: vendedor sem vendedor_id nunca deve ver nada — retorna vazio imediatamente
    if (profile.role === "vendedor" && !profile.vendedor_id) {
      return { pedidos: [] };
    }

    const supabase = await createClient();
    const LIMITE = 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("vhsys_pedidos")
      .select(COLS_PEDIDO)
      .eq("lixeira", false)
      .eq("situacao_id", situacaoId)
      .order("data_pedido", { ascending: false })
      .range(offset, offset + LIMITE - 1);

    // Filtro de vendedor: vendedor só vê seus próprios pedidos
    if (profile.role === "vendedor") {
      query = query.eq("vendedor_id_vhsys", profile.vendedor_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { pedidos: (data ?? []) as unknown as PedidoRow[] };
  } catch (err) {
    return { pedidos: [], erro: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Retorna todos os pedidos de um mês/ano para o Calendário.
 * Aplica filtro de vendedor quando role=vendedor.
 * Ano: 2000–2100; Mês: 1–12 (1=Janeiro).
 * Vendedor sem vendedor_id → retorna lista vazia (nunca vaza dados).
 */
export async function buscarPedidosDoMes(
  ano: number,
  mes: number
): Promise<{ pedidos: PedidoRow[]; erro?: string }> {
  try {
    // Validação de entrada
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      throw new Error("ano inválido.");
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new Error("mes inválido (1–12).");
    }

    const profile = await obterProfile();

    // C2: vendedor sem vendedor_id nunca deve ver nada — retorna vazio imediatamente
    if (profile.role === "vendedor" && !profile.vendedor_id) {
      return { pedidos: [] };
    }

    const supabase = await createClient();
    const mesPad = String(mes).padStart(2, "0");
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${ano}-${mesPad}-01`;
    const fim = `${ano}-${mesPad}-${String(ultimoDia).padStart(2, "0")}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("vhsys_pedidos")
      .select(COLS_PEDIDO)
      .eq("lixeira", false)
      .gte("data_pedido", inicio)
      .lte("data_pedido", fim)
      .order("data_pedido", { ascending: true });

    // Filtro de vendedor
    if (profile.role === "vendedor") {
      query = query.eq("vendedor_id_vhsys", profile.vendedor_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { pedidos: (data ?? []) as unknown as PedidoRow[] };
  } catch (err) {
    return { pedidos: [], erro: err instanceof Error ? err.message : String(err) };
  }
}
