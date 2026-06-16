import { cache } from "react";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { medir } from "@/lib/perf/boot";

// Memoização por-request via `cache()` do React: deduplica chamadas DENTRO do
// mesmo request (não atravessa requests nem o runtime do middleware). É
// exatamente o que colapsa o `getUser()`/profile do layout e da page do
// (dashboard) num único roundtrip cada. NÃO usamos unstable_cache (esse seria
// cache persistente entre requests — indesejado para dados de sessão).
//
// Estes helpers retornam SÓ dados: nenhum redirect/signOut aqui. Quem decide o
// que fazer com user/profile ausentes é o layout/page (preserva o
// comportamento atual de auth/redirect).

// ── Cache de processo (cross-request, por instância) ────────────────────────
//
// Camadas em ordem:
//   1. process-cache (5 s, por instância)  ← esta camada
//   2. React.cache() (por-request, deduplication)
//   3. Supabase getUser() + query de profile
//
// Quando há HIT fresco (mesma cookieHash, não expirado) o Supabase nunca é
// tocado. Quando o cookie muda (hash diferente) é MISS automático — bypass
// por revogação não precisa de lógica extra.
//
// TTL de 5 s: serve sessão "velha" por até 5 s após revogação. Aceitável para
// o cenário de uso; quando RLS restritivo entrar, role/vendedor_id mudam raro
// e o TTL de 5 s mitiga qualquer delay de propagação.
//
// Nota serverless: em Vercel cada lambda tem seu próprio Map (aquece por
// instância, não é compartilhado globalmente) — esperado e aceitável.

interface EntradaSessao {
  value: { user: User | null; profile: Profile | null };
  expira: number;
}

const SESSAO_TTL_MS = 5_000;
const SESSAO_CAP = 200;

const sessaoCache = new Map<string, EntradaSessao>();

/** Lê o hash SHA-256 do cookie de sessão do Supabase (nunca guarda o token raw). */
async function cookieSessionHash(): Promise<string> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore
    .getAll()
    .filter((c) => /^sb-.+-auth-token/.test(c.name))
    .map((c) => c.value)
    .join("");
  return createHash("sha256").update(rawCookie).digest("hex");
}

export const getSessao = cache(async (): Promise<{ user: User | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
});

// Implementação interna (sem process-cache): mantém o React.cache() de
// deduplication por-request e faz a query real ao Supabase.
const getSessaoComProfileInternal = cache(
  async (): Promise<{ user: User | null; profile: Profile | null }> => {
    const { user } = await getSessao();
    if (!user) {
      return { user: null, profile: null };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile: (profile as Profile | null) ?? null };
  }
);

export async function getSessaoComProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const cookieHash = await cookieSessionHash();

  // 1. Process-cache: verifica HIT fresco com limpeza preguiçosa.
  const entrada = sessaoCache.get(cookieHash);
  if (entrada) {
    if (Date.now() <= entrada.expira) {
      console.log("[perf-boot] sessao=HIT cacheMs=0ms source=sessao");
      return entrada.value;
    }
    // Entrada expirada — remove e continua para o Supabase.
    sessaoCache.delete(cookieHash);
  }

  // 2. MISS: chama a camada interna (React.cache + Supabase).
  const [value, msSupabase] = await medir(() => getSessaoComProfileInternal());

  // 3. Popula o process-cache com descarte do mais antigo quando cap atingido.
  if (sessaoCache.size >= SESSAO_CAP && !sessaoCache.has(cookieHash)) {
    const primeiraChave = sessaoCache.keys().next().value;
    if (primeiraChave !== undefined) sessaoCache.delete(primeiraChave);
  }
  sessaoCache.set(cookieHash, { value, expira: Date.now() + SESSAO_TTL_MS });

  console.log(`[perf-boot] sessao=MISS supabaseMs=${msSupabase}ms source=sessao`);

  return value;
}
