"use server";
// Server Actions de seleção/troca de conta ativa + configuração da conta.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessao, getSessaoComProfile } from "@/lib/auth/sessao";
import { ehSuperadmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { contasDoUsuario, getContaAtiva, COOKIE_CONTA, COOKIE_CONTA_OPTS } from "./contexto";

/**
 * Define a conta ativa (cookie) e volta ao dashboard. Valida que o usuário
 * realmente tem acesso à conta — nunca confia no slug cru do cliente.
 */
export async function selecionarConta(slug: string): Promise<void> {
  const { user } = await getSessao();
  if (!user) redirect("/login");

  const contas = await contasDoUsuario(user.id);
  const permitida = contas.some((c) => c.slug === slug);
  if (!permitida) {
    redirect("/selecionar-conta?erro=acesso");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_CONTA, slug, COOKIE_CONTA_OPTS);
  redirect("/");
}

export type ResultadoCor = { ok: true } | { ok: false; erro: string };

/**
 * Atualiza a cor primária (theme_color) da CONTA ATIVA. Restrito a superadmin
 * (mesmo gate da aba Configurações). Valida o formato hex e revalida o layout
 * para a nova cor ser aplicada imediatamente.
 */
export async function atualizarCorConta(cor: string): Promise<ResultadoCor> {
  const { profile } = await getSessaoComProfile();
  if (!profile || !ehSuperadmin(profile.role)) {
    return { ok: false, erro: "Sem permissão." };
  }

  const hex = cor.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return { ok: false, erro: "Cor inválida. Use o formato #RRGGBB." };
  }

  const conta = await getContaAtiva();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accounts")
    .update({ theme_color: hex })
    .eq("id", conta.id);
  if (error) return { ok: false, erro: error.message };

  // Re-renderiza o layout do dashboard (CSS vars derivadas da nova cor).
  revalidatePath("/", "layout");
  return { ok: true };
}
