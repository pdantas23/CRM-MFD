// Client Supabase de TESTE para a suíte de performance.
//
// READ-ONLY POR CONTRATO: os cenários só executam SELECT/RPC de leitura.
// Nenhuma escrita no banco. Não toca RLS/policies. Não usa a API do VHSYS.
//
// Usa a SERVICE ROLE KEY para leitura DETERMINÍSTICA (mesmo conjunto de
// linhas em toda execução, sem depender de sessão/cookies de um usuário).
// Isso bypassa RLS — aceitável aqui porque medimos tempo do núcleo das ondas
// com escopo de aplicação explícito (escopoAdminTeste / escopoVendedorTeste),
// e NUNCA gravamos nada.
//
// Carrega env de `.env.test` se existir; senão `.env.local`.

import { config as carregarEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseFiltros, type Entidade, type FiltrosCrm } from "@/lib/crm/filtros";
import type { Escopo } from "@/lib/crm/metricas";

// Raiz do projeto (este arquivo está em tests/perf/).
const RAIZ = resolve(__dirname, "..", "..");

/** Carrega o arquivo de env apropriado uma única vez. */
let envCarregado = false;
function garantirEnv(): void {
  if (envCarregado) return;
  const test = resolve(RAIZ, ".env.test");
  const local = resolve(RAIZ, ".env.local");
  const alvo = existsSync(test) ? test : local;
  carregarEnv({ path: alvo });
  envCarregado = true;
}

/**
 * Cria o client Supabase de teste (service role, read-only por contrato).
 * Lê as MESMAS variáveis que o app: NEXT_PUBLIC_SUPABASE_URL e
 * SUPABASE_SERVICE_ROLE_KEY. No CI, mapear secrets para esses nomes.
 */
export function criarClienteTeste(): SupabaseClient {
  garantirEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (de .env.test ou .env.local / secrets do CI)."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Escopo de aplicação "admin" para os cenários (vê tudo, sem RLS por vendedor). */
export const escopoAdminTeste: Escopo = { role: "admin", vendedorId: null };

/** Escopo de aplicação "vendedor" (restringe a um vendedor_id_vhsys). */
export function escopoVendedorTeste(id: number): Escopo {
  return { role: "vendedor", vendedorId: id };
}

/**
 * Monta FiltrosCrm determinísticos a partir de uma query string de URL.
 * Ex.: filtrosDeURL("periodo=30d&com_saldo=true", "pedidos").
 */
export function filtrosDeURL(query: string, entidade: Entidade): FiltrosCrm {
  const sp: Record<string, string> = {};
  const params = new URLSearchParams(query);
  for (const [k, v] of Array.from(params.entries())) sp[k] = v;
  return parseFiltros(sp, entidade);
}
