// Dispara o sync de catálogos VHSYS → Supabase fora do Next.
// Uso: npx tsx scripts/vhsys-pull-inicial.ts [completo]

import { readFileSync } from "node:fs";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }

  const { sincronizarEspelho } = await import("../src/lib/vhsys/sync");

  const modo = process.argv[2] === "completo" ? "completo" : "incremental";
  console.log(`Sync do espelho VHSYS (${modo})...`);
  const resultados = await sincronizarEspelho(modo);
  for (const r of resultados) {
    console.log(`  ${r.entidade}: ${r.erro ? `ERRO — ${r.erro}` : `${r.registros} registros`}`);
  }
  process.exit(resultados.some((r) => r.erro) ? 1 : 0);
}

main();
