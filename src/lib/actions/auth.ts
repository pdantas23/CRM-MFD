"use server";

import { createClient as createAdmin } from "@supabase/supabase-js";

export async function getEmailByNome(nome: string): Promise<string | null> {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("nome", nome.trim())
    .single();

  if (!profile) return null;

  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data?.user?.email ?? null;
}
