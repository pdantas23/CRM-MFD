// Cria (ou reconcilia) as contas de vendedor no Supabase Auth + profiles.
// Carrega .env.local com o mesmo padrão de vhsys-pull-inicial.ts.
// NUNCA imprime chaves/secrets.
//
// Uso: npx tsx scripts/criar-vendedores.ts

import { readFileSync } from "node:fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("ERRO: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes em .env.local");
  process.exit(1);
}


// ── Definição dos vendedores ──────────────────────────────────────────────
// Dados sensíveis (e-mail/senha/vendedor_id) NÃO ficam no código: são lidos de
// scripts/vendedores.seed.json (ignorado pelo git via *.seed.json).
// TODO: rotacionar as senhas de seed expostas no histórico do git (versões
// anteriores deste arquivo continham senhas em texto plano) — trocar no Supabase Auth.

interface VendedorSpec {
  email: string;
  senha: string;
  nome: string;
  vendedor_id: number;
}

const SEED_PATH = "./scripts/vendedores.seed.json";

function carregarVendedores(): VendedorSpec[] {
  let bruto: string;
  try {
    bruto = readFileSync(SEED_PATH, "utf-8");
  } catch {
    console.error(
      `ERRO: ${SEED_PATH} não encontrado. Crie o arquivo (não versionado) com o ` +
        `formato [{ "email", "senha", "nome", "vendedor_id" }].`
    );
    process.exit(1);
  }
  const dados = JSON.parse(bruto) as VendedorSpec[];
  if (!Array.isArray(dados) || dados.length === 0) {
    console.error(`ERRO: ${SEED_PATH} vazio ou em formato inválido.`);
    process.exit(1);
  }
  return dados;
}

const VENDEDORES: VendedorSpec[] = carregarVendedores();

// ── Cliente Supabase (inicializado em main após env load) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let admin: SupabaseClient<any, any, any>;

// ── Helpers ───────────────────────────────────────────────────────────────

async function usuarioExistente(email: string): Promise<string | null> {
  // Auth Admin API não tem busca por email direta — lista e filtra.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const user = data.users.find((u) => u.email === email);
  return user ? user.id : null;
}

async function criarOuReconciliar(spec: VendedorSpec): Promise<void> {
  console.log(`\n→ Processando: ${spec.nome} (${spec.email})`);

  const idExistente = await usuarioExistente(spec.email);

  let userId: string;

  if (idExistente) {
    console.log(`  Conta já existe (uid=${idExistente}) — pulando createUser.`);
    userId = idExistente;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.senha,
      email_confirm: true,
      user_metadata: { nome: spec.nome, role: "vendedor" },
    });
    if (error) throw new Error(`createUser ${spec.email}: ${error.message}`);
    userId = data.user.id;
    console.log(`  Conta criada (uid=${userId}).`);
  }

  // Reconcilia profile: o trigger handle_new_user cria com role='vendedor'
  // via raw_user_meta_data, mas pode não ter vendedor_id. Upsert garante.
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        nome: spec.nome,
        role: "vendedor",
        vendedor_id: spec.vendedor_id,
      },
      { onConflict: "id" }
    );

  if (upsertErr) throw new Error(`upsert profile ${spec.email}: ${upsertErr.message}`);
  console.log(`  Profile reconciliado (vendedor_id=${spec.vendedor_id}).`);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== CRIAR / RECONCILIAR CONTAS DE VENDEDOR ===");

  for (const spec of VENDEDORES) {
    await criarOuReconciliar(spec);
  }

  // Select final de verificação (sem expor dados sensíveis)
  console.log("\n=== SELECT FINAL (profiles dos vendedores) ===");
  const { data: profiles, error: selErr } = await admin
    .from("profiles")
    .select("id, nome, role, vendedor_id")
    .eq("role", "vendedor")
    .order("vendedor_id");

  if (selErr) {
    console.error("Erro ao buscar profiles:", selErr.message);
    process.exit(1);
  }

  console.log("\nid                                   | nome        | role     | vendedor_id");
  console.log("-------------------------------------|-------------|----------|------------");
  for (const p of profiles ?? []) {
    const row = p as { id: string; nome: string; role: string; vendedor_id: number | null };
    console.log(`${row.id} | ${row.nome.padEnd(11)} | ${row.role.padEnd(8)} | ${row.vendedor_id}`);
  }

  console.log("\n=== FIM ===");
}

main().catch((err) => {
  console.error("Erro inesperado:", err instanceof Error ? err.message : err);
  process.exit(1);
});
