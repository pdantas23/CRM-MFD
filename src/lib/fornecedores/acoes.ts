"use server";
// Server Action: define as seções de um fornecedor (Drywall / Piso Vinílico /
// Solução Acústica). Exclusiva de admin; escreve via service role (a tabela
// fornecedor_secoes tem RLS só de leitura). Escopada pela conta ativa.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { CHAVES_SECAO } from "./secoes";

export async function salvarSecoesFornecedor(
  fornecedorId: number,
  secoes: string[]
): Promise<{ ok: boolean; erro?: string }> {
  const { profile } = await getSessaoComProfile();
  if (!ehAdmin(profile?.role)) {
    return { ok: false, erro: "Permissão negada." };
  }
  if (!Number.isInteger(fornecedorId) || fornecedorId <= 0) {
    return { ok: false, erro: "Fornecedor inválido." };
  }

  // Só chaves válidas, sem duplicatas.
  const validas = Array.from(new Set(secoes.filter((s) => CHAVES_SECAO.includes(s))));

  const conta = await getContaAtiva();
  const admin = createAdminClient();
  const { error } = await admin.from("fornecedor_secoes").upsert(
    {
      conta_id: conta.id,
      fornecedor_id: fornecedorId,
      secoes: validas,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "conta_id,fornecedor_id" }
  );
  if (error) return { ok: false, erro: error.message };

  revalidatePath("/fornecedores");
  return { ok: true };
}
