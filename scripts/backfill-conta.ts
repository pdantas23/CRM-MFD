// Atribui TODOS os registros legados sem conta (conta_id NULL) a UMA conta
// específica — útil quando já existem várias contas e o backfill automático do
// seed (que só roda com 1 conta) não se aplica.
//
// Faz: espelho + entregas → conta_id; profiles não-owner sem conta → conta_id +
// sufixo de login (ex.: sandro → sandro-<slug>). Idempotente.
//
// Uso: npx tsx scripts/backfill-conta.ts <slug-da-conta>

import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let val = m[2].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[m[1]] = val;
}

const TABELAS_ESPELHO = [
  "vhsys_situacoes", "vhsys_produtos", "vhsys_clientes", "vhsys_vendedores",
  "vhsys_pedidos", "vhsys_orcamentos", "vhsys_contas_receber",
  "vhsys_notas_fiscais", "entregas",
];

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Uso: npx tsx scripts/backfill-conta.ts <slug-da-conta>");
    process.exit(1);
  }

  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { aplicarSufixoLogin } = await import("../src/lib/accounts/login-nome");
  const supabase = createAdminClient();

  const { data: conta } = await supabase
    .from("accounts")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  const id = (conta as { id: string; slug: string } | null)?.id;
  if (!id) {
    console.error(`Conta "${slug}" não encontrada.`);
    process.exit(1);
  }

  console.log(`=== BACKFILL para conta "${slug}" (${id}) ===`);
  console.log("\n-- Espelho + entregas (conta_id NULL → conta) --");
  for (const t of TABELAS_ESPELHO) {
    const { error, count } = await supabase
      .from(t)
      .update({ conta_id: id }, { count: "exact" })
      .is("conta_id", null);
    console.log(`  ${t}: ${error ? `ERRO — ${error.message}` : `${count ?? 0} linha(s)`}`);
  }

  console.log("\n-- Usuários não-owner sem conta (conta_id + sufixo) --");
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, nome, role")
    .is("conta_id", null);
  const pendentes = ((profs ?? []) as { id: string; nome: string; role: string }[])
    .filter((p) => p.role !== "owner");
  if (pendentes.length === 0) console.log("  (nenhum)");
  for (const p of pendentes) {
    const nomeNovo = aplicarSufixoLogin(p.nome, slug);
    const { error } = await supabase
      .from("profiles")
      .update({ conta_id: id, nome: nomeNovo })
      .eq("id", p.id);
    console.log(`  ${p.nome} → ${nomeNovo}: ${error ? `ERRO — ${error.message}` : "ok"}`);
  }

  console.log("\n=== FIM ===");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
