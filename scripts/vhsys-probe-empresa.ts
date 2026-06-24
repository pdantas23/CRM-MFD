// Sonda endpoints candidatos da API VHSYS para descobrir QUAL retorna os dados
// da empresa autenticada (nome/razão/fantasia). Usa os tokens da conta no banco.
//
// Uso: npx tsx scripts/vhsys-probe-empresa.ts <slug-da-conta>

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

const CANDIDATOS = [
  "/empresa", "/empresas", "/dados-cadastrais", "/dados-empresa", "/minha-conta",
  "/conta", "/contas", "/usuario", "/usuarios", "/me", "/perfil",
  "/configuracoes", "/config", "/info", "/dados", "/cadastro",
];

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Uso: npx tsx scripts/vhsys-probe-empresa.ts <slug>");
    process.exit(1);
  }

  const { getContaComTokens } = await import("../src/lib/accounts/repo");
  const conta = await getContaComTokens(slug);
  if (!conta) {
    console.error(`Conta "${slug}" não encontrada.`);
    process.exit(1);
  }
  const { accessToken, secretToken, apiBase } = conta.tokens;

  const headers = {
    "access-token": accessToken,
    "secret-access-token": secretToken,
    "User-Agent": process.env.APP_USER_AGENT ?? "CRM/0.1",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  };

  console.log(`Sondando ${CANDIDATOS.length} endpoints em ${apiBase} (conta "${slug}")...\n`);

  for (const path of CANDIDATOS) {
    try {
      const res = await fetch(apiBase + path, { headers, cache: "no-store" });
      const txt = await res.text();
      const corpo = txt.replace(/\s+/g, " ").slice(0, 220);
      const marca = res.ok && res.status === 200 ? "✅" : "  ";
      console.log(`${marca} ${res.status}  ${path}\n      ${corpo}\n`);
    } catch (err) {
      console.log(`  ERR  ${path} — ${err instanceof Error ? err.message : err}\n`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("Procure a linha ✅ cujo corpo contenha nome/razão/fantasia da empresa.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
