// Repositório da tabela `accounts` — SERVER-ONLY.
// Lê via service role (createAdminClient), que ignora RLS. O tipo Account
// exposto NUNCA carrega os tokens cifrados; as credenciais só são decifradas
// sob demanda por getTokensPorSlug/getContaComTokens.

import { createAdminClient } from "../supabase/admin";
import { decrypt } from "./cripto";

/** Conta sem segredos — seguro para passar a componentes/props. */
export interface Account {
  id: string;
  slug: string;
  nomeEmpresa: string | null;
  themeColor: string;
  apiBase: string;
  ativo: boolean;
  nomeSyncEm: string | null;
}

/** Credenciais VHSYS decifradas — SERVER-ONLY, nunca expor ao cliente. */
export interface VhsysTokens {
  accessToken: string;
  secretToken: string;
  apiBase: string;
}

interface AccountRow {
  id: string;
  slug: string;
  nome_empresa: string | null;
  theme_color: string;
  api_base: string;
  access_token_enc: string;
  secret_token_enc: string;
  ativo: boolean;
  nome_sync_em: string | null;
}

const COLUNAS_PUBLICAS = "id, slug, nome_empresa, theme_color, api_base, ativo, nome_sync_em";

function mapAccount(row: Omit<AccountRow, "access_token_enc" | "secret_token_enc">): Account {
  return {
    id: row.id,
    slug: row.slug,
    nomeEmpresa: row.nome_empresa,
    themeColor: row.theme_color,
    apiBase: row.api_base,
    ativo: row.ativo,
    nomeSyncEm: row.nome_sync_em,
  };
}

/** Lista as contas ativas (sem segredos). */
export async function listarContasAtivas(): Promise<Account[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(COLUNAS_PUBLICAS)
    .eq("ativo", true)
    .order("slug");
  if (error) throw new Error(`listarContasAtivas: ${error.message}`);
  return (data ?? []).map((r) => mapAccount(r as AccountRow));
}

/** Busca uma conta por slug (sem segredos). Retorna null se não existir. */
export async function getContaPorSlug(slug: string): Promise<Account | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(COLUNAS_PUBLICAS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getContaPorSlug: ${error.message}`);
  return data ? mapAccount(data as AccountRow) : null;
}

/** Conta + tokens decifrados numa única leitura (uso interno do contexto). */
export async function getContaComTokens(
  slug: string
): Promise<{ account: Account; tokens: VhsysTokens } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`${COLUNAS_PUBLICAS}, access_token_enc, secret_token_enc`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getContaComTokens: ${error.message}`);
  if (!data) return null;
  const row = data as AccountRow;
  return {
    account: mapAccount(row),
    tokens: {
      accessToken: decrypt(row.access_token_enc),
      secretToken: decrypt(row.secret_token_enc),
      apiBase: row.api_base,
    },
  };
}

/** Tokens decifrados de uma conta. SERVER-ONLY. */
export async function getTokensPorSlug(slug: string): Promise<VhsysTokens | null> {
  const res = await getContaComTokens(slug);
  return res ? res.tokens : null;
}
