// Resolução da CONTA ATIVA por requisição — SERVER-ONLY.
// A conta ativa é o slug guardado no cookie httpOnly `conta_ativa`.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "../supabase/admin";
import { getContaComTokens, listarContasAtivas, type Account } from "./repo";

export const COOKIE_CONTA = "conta_ativa";

/** Opções padrão do cookie de conta ativa. */
export const COOKIE_CONTA_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 ano
};

/** Conta ativa resolvida, já com os tokens VHSYS decifrados (server-only). */
export interface ContaAtiva {
  id: string;
  slug: string;
  nomeEmpresa: string | null;
  themeColor: string;
  apiBase: string;
  tokens: { accessToken: string; secretToken: string };
}

/**
 * Resolve a conta ativa a partir do cookie. Se não houver cookie ou a conta
 * não existir/estiver inativa, redireciona para a seleção de conta.
 */
export async function getContaAtiva(): Promise<ContaAtiva> {
  const cookieStore = await cookies();
  const slug = cookieStore.get(COOKIE_CONTA)?.value;
  if (!slug) {
    redirect("/selecionar-conta");
  }

  const res = await getContaComTokens(slug);
  if (!res || !res.account.ativo) {
    redirect("/selecionar-conta");
  }

  return {
    id: res.account.id,
    slug: res.account.slug,
    nomeEmpresa: res.account.nomeEmpresa,
    themeColor: res.account.themeColor,
    apiBase: res.tokens.apiBase,
    tokens: { accessToken: res.tokens.accessToken, secretToken: res.tokens.secretToken },
  };
}

/**
 * Contas que o usuário pode acessar.
 * - Se `profiles.conta_id` estiver definido → apenas aquela conta.
 * - Caso contrário → todas as contas ativas (modelo "usuários em comum entre as
 *   contas da mesma empresa").
 */
export async function contasDoUsuario(userId: string): Promise<Account[]> {
  const ativas = await listarContasAtivas();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("conta_id")
    .eq("id", userId)
    .maybeSingle();

  const contaId = (data as { conta_id: string | null } | null)?.conta_id ?? null;
  if (contaId) {
    return ativas.filter((c) => c.id === contaId);
  }
  return ativas;
}
