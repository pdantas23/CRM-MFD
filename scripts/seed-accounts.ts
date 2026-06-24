// Semeia/atualiza a tabela `accounts` a partir das variáveis de ambiente
// VHSYS_ACCOUNT_<N>_* (.env.local). Cifra os tokens com APP_MASTER_KEY.
// Idempotente (upsert por slug). NUNCA loga tokens.
//
// Uso: npx tsx scripts/seed-accounts.ts

import { readFileSync } from "node:fs";

// ── Carrega .env.local ────────────────────────────────────────────────────
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (!m || process.env[m[1]]) continue;
  let val = m[2].trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  process.env[m[1]] = val;
}

interface ContaEnv {
  slug: string;
  accessToken: string;
  secretToken: string;
  apiBase: string;
  themeColor: string;
}

/** Lê VHSYS_ACCOUNT_1_*, _2_*, ... até não encontrar mais um SLUG. */
function lerContasDoEnv(): ContaEnv[] {
  const contas: ContaEnv[] = [];
  for (let n = 1; ; n++) {
    const p = `VHSYS_ACCOUNT_${n}_`;
    const slug = process.env[`${p}SLUG`];
    if (!slug) break;
    const accessToken = process.env[`${p}ACCESS_TOKEN`];
    const secretToken = process.env[`${p}SECRET_ACCESS_TOKEN`];
    if (!accessToken || !secretToken) {
      console.error(`ERRO: conta ${n} (${slug}) sem ACCESS_TOKEN/SECRET_ACCESS_TOKEN.`);
      process.exit(1);
    }
    contas.push({
      slug,
      accessToken,
      secretToken,
      apiBase: process.env[`${p}API_BASE`] || "https://api.vhsys.com/v2",
      themeColor: process.env[`${p}THEME_COLOR`] || "#1a73e8",
    });
  }
  return contas;
}

async function main() {
  const { encrypt } = await import("../src/lib/accounts/cripto");
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { atualizarNomeEmpresa } = await import("../src/lib/vhsys/empresa");

  const contas = lerContasDoEnv();
  if (contas.length === 0) {
    console.error("Nenhuma conta encontrada (defina VHSYS_ACCOUNT_1_SLUG, ...).");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log("=== SEED DE CONTAS VHSYS ===");

  for (const c of contas) {
    const { error } = await supabase.from("accounts").upsert(
      {
        slug: c.slug,
        api_base: c.apiBase,
        theme_color: c.themeColor,
        access_token_enc: encrypt(c.accessToken),
        secret_token_enc: encrypt(c.secretToken),
        ativo: true,
      },
      { onConflict: "slug" }
    );
    if (error) {
      console.error(`  ✗ Conta "${c.slug}": ${error.message}`);
      process.exit(1);
    }

    // Busca e cacheia o nome da empresa direto do VHSYS (best-effort).
    const { data: row } = await supabase
      .from("accounts")
      .select("id")
      .eq("slug", c.slug)
      .single();
    const id = (row as { id: string } | null)?.id;
    let nome: string | null = null;
    if (id) {
      nome = await atualizarNomeEmpresa({
        id,
        tokens: { accessToken: c.accessToken, secretToken: c.secretToken, apiBase: c.apiBase },
      });
    }
    console.log(`  ✓ Conta "${c.slug}" sincronizada${nome ? ` (empresa: ${nome})` : ""}`);
  }

  // Backfill da transição single→multi conta: se existe EXATAMENTE uma conta,
  // atribui a ela todas as linhas-espelho/entregas pré-existentes que ficaram
  // com conta_id NULL (dados anteriores ao multi-conta). Evita linhas órfãs.
  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true });
  if (count === 1) {
    const { data: unica } = await supabase.from("accounts").select("id, slug").single();
    const id = (unica as { id: string; slug: string } | null)?.id;
    const slug = (unica as { id: string; slug: string } | null)?.slug ?? "";
    if (id) {
      // vhsys_sync_estado NÃO entra: a migração 0020 o trunca (cursores efêmeros).
      const TABELAS = [
        "vhsys_situacoes", "vhsys_produtos", "vhsys_clientes", "vhsys_vendedores",
        "vhsys_pedidos", "vhsys_orcamentos", "vhsys_contas_receber",
        "vhsys_notas_fiscais", "entregas",
      ];
      console.log("\n=== BACKFILL conta_id (transição single→multi) ===");
      for (const t of TABELAS) {
        const { error } = await supabase.from(t).update({ conta_id: id }).is("conta_id", null);
        console.log(`  ${t}: ${error ? `ERRO — ${error.message}` : "ok"}`);
      }

      // Usuários existentes (não-owner) → vinculados à conta única + sufixo no
      // nome de login (ex.: sandro → sandro-<slug>). Idempotente.
      const { aplicarSufixoLogin } = await import("../src/lib/accounts/login-nome");
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome, role, conta_id")
        .is("conta_id", null);
      const pendentes = ((profs ?? []) as { id: string; nome: string; role: string }[])
        .filter((p) => p.role !== "owner");
      console.log("\n=== BACKFILL usuários (conta_id + sufixo de login) ===");
      for (const p of pendentes) {
        const nomeNovo = aplicarSufixoLogin(p.nome, slug);
        const { error } = await supabase
          .from("profiles")
          .update({ conta_id: id, nome: nomeNovo })
          .eq("id", p.id);
        console.log(`  ${p.nome} → ${nomeNovo}: ${error ? `ERRO — ${error.message}` : "ok"}`);
      }
    }
  }

  console.log("=== FIM ===");
}

main().catch((err) => {
  console.error("Erro inesperado:", err instanceof Error ? err.message : err);
  process.exit(1);
});
