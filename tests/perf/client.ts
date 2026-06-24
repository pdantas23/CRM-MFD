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
import { construirModeloSituacoes } from "@/lib/vhsys/situacoes-modelo";
import { construirModeloOrcamento } from "@/lib/vhsys/situacoes-orcamento";

/** Modelo de situações fixo (situações da conta SA, base da suíte de perf). */
const MODELO_TESTE = construirModeloSituacoes([
  { id_vhsys: 858, nome: "Aguardando Pagamento", tipo_status: "Em Aberto", ordem: 1 },
  { id_vhsys: 1179, nome: "Pagamento Parcial", tipo_status: "Em Aberto", ordem: 2 },
  { id_vhsys: 857, nome: "Pagamento Aprovado", tipo_status: "Em Andamento", ordem: 3 },
  { id_vhsys: 859, nome: "Em Separação", tipo_status: "Em Andamento", ordem: 4 },
  { id_vhsys: 1180, nome: "Entrega Parcial", tipo_status: "Em Aberto", ordem: 5 },
  { id_vhsys: 777, nome: "Entregue", tipo_status: "Atendido", ordem: 6 },
  { id_vhsys: 778, nome: "Cancelado", tipo_status: "Cancelado", ordem: 7 },
]);

/** Modelo de situações de ORÇAMENTO fixo (situações da conta SA). */
export const MODELO_ORC_TESTE = construirModeloOrcamento([
  { id_vhsys: 860, nome: "Em negociação", tipo_status: "Em Aberto", ordem: 1 },
  { id_vhsys: 768, nome: "Aprovado", tipo_status: "Atendido", ordem: 2 },
  { id_vhsys: 769, nome: "Perdido", tipo_status: "Cancelado", ordem: 3 },
]);

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

/** Conta usada nos cenários de perf (defina PERF_CONTA_ID para uma conta real). */
export const CONTA_ID_TESTE =
  process.env.PERF_CONTA_ID ?? "00000000-0000-0000-0000-000000000000";

/** Escopo de aplicação "admin" para os cenários (vê tudo, sem RLS por vendedor). */
export const escopoAdminTeste: Escopo = {
  role: "admin",
  vendedorId: null,
  contaId: CONTA_ID_TESTE,
  modelo: MODELO_TESTE,
};

/** Escopo de aplicação "vendedor" (restringe a um vendedor_id_vhsys). */
export function escopoVendedorTeste(id: number): Escopo {
  return { role: "vendedor", vendedorId: id, contaId: CONTA_ID_TESTE, modelo: MODELO_TESTE };
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
