// Dispara o sync de catálogos VHSYS → Supabase fora do Next, para UMA conta.
// Uso: npx tsx scripts/vhsys-pull-inicial.ts <slug-da-conta> [completo]
// A conta (id + credenciais) é lida da tabela `accounts` (rode seed-accounts antes).

import { readFileSync } from "node:fs";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    // Aceita = dentro do valor; remove apenas aspas externas balanceadas do mesmo tipo.
    const m = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }

  const slug = process.argv[2];
  if (!slug || slug === "completo") {
    console.error("Uso: npx tsx scripts/vhsys-pull-inicial.ts <slug-da-conta> [completo]");
    process.exit(1);
  }
  const modo = process.argv[3] === "completo" ? "completo" : "incremental";

  const { getContaComTokens } = await import("../src/lib/accounts/repo");
  const conta = await getContaComTokens(slug);
  if (!conta) {
    console.error(`Conta "${slug}" não encontrada em accounts. Rode scripts/seed-accounts.ts.`);
    process.exit(1);
  }

  const { sincronizarEspelho } = await import("../src/lib/vhsys/sync");

  console.log(`Sync do espelho VHSYS — conta "${slug}" (${modo})...`);
  const resultados = await sincronizarEspelho(modo, {
    id: conta.account.id,
    slug: conta.account.slug,
    tokens: conta.tokens,
  });
  for (const r of resultados) {
    console.log(`  ${r.entidade}: ${r.erro ? `ERRO — ${r.erro}` : `${r.registros} registros`}`);
  }
  process.exit(resultados.some((r) => r.erro) ? 1 : 0);
}

main();
