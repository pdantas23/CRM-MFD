"use server";
// Server Actions do sino de notificações (chamadas pelo componente client).
// Leitura via RLS (a policy já recorta por papel + conta); "marcar vistas"
// atualiza o marcador do próprio usuário via service role.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_CONTA } from "@/lib/accounts/contexto";
import { getContaPorSlug } from "@/lib/accounts/repo";

export interface NotificacaoItem {
  id: string;
  tipo: "pedido_emitido" | "pagamento_aprovado";
  pedidoNumero: number | null;
  nomeCliente: string | null;
  atorNome: string | null;
  createdAt: string;
}

interface NotificacaoRow {
  id: string;
  tipo: string;
  pedido_numero: number | null;
  nome_cliente: string | null;
  ator_nome: string | null;
  created_at: string;
}

/** Lista as notificações da conta ativa visíveis ao usuário + total não lidas. */
export async function listarNotificacoes(): Promise<{ itens: NotificacaoItem[]; naoLidas: number }> {
  const vazio = { itens: [], naoLidas: 0 };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vazio;

  const slug = (await cookies()).get(COOKIE_CONTA)?.value;
  if (!slug) return vazio;
  const conta = await getContaPorSlug(slug);
  if (!conta) return vazio;

  // RLS já filtra por papel (roles_alvo) e conta; o .eq abaixo escopa à conta ativa.
  const { data } = await supabase
    .from("notificacoes")
    .select("id, tipo, pedido_numero, nome_cliente, ator_nome, created_at")
    .eq("conta_id", conta.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const itens: NotificacaoItem[] = ((data ?? []) as NotificacaoRow[]).map((n) => ({
    id: n.id,
    tipo: n.tipo === "pagamento_aprovado" ? "pagamento_aprovado" : "pedido_emitido",
    pedidoNumero: n.pedido_numero,
    nomeCliente: n.nome_cliente,
    atorNome: n.ator_nome,
    createdAt: n.created_at,
  }));

  const { data: perfil } = await supabase
    .from("profiles")
    .select("notificacoes_vistas_em")
    .eq("id", user.id)
    .maybeSingle();
  const vistas = (perfil as { notificacoes_vistas_em: string | null } | null)?.notificacoes_vistas_em ?? null;

  let contagem = supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("conta_id", conta.id);
  if (vistas) contagem = contagem.gt("created_at", vistas);
  const { count } = await contagem;

  return { itens, naoLidas: count ?? 0 };
}

/** Marca todas as notificações como vistas (zera o badge) para o usuário atual. */
export async function marcarNotificacoesVistas(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ notificacoes_vistas_em: new Date().toISOString() })
    .eq("id", user.id);
}
