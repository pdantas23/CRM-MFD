import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

// Memoização por-request via `cache()` do React: deduplica chamadas DENTRO do
// mesmo request (não atravessa requests nem o runtime do middleware). É
// exatamente o que colapsa o `getUser()`/profile do layout e da page do
// (dashboard) num único roundtrip cada. NÃO usamos unstable_cache (esse seria
// cache persistente entre requests — indesejado para dados de sessão).
//
// Estes helpers retornam SÓ dados: nenhum redirect/signOut aqui. Quem decide o
// que fazer com user/profile ausentes é o layout/page (preserva o
// comportamento atual de auth/redirect).

export const getSessao = cache(async (): Promise<{ user: User | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
});

export const getSessaoComProfile = cache(
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
