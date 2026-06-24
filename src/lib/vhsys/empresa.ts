// Busca o NOME DA EMPRESA diretamente da API VHSYS — SERVER-ONLY.
//
// Endpoint confirmado empiricamente (scripts/vhsys-probe-empresa.ts):
//   GET /empresas → { code:200, status:"success", data:[{ id_empresa,
//   cnpj_empresa, razao_empresa, fantasia_empresa, ... }] }.
// Em caso de falha, retorna null (o chamador usa APP_NAME / slug como fallback).

import { vhsysGet, runComTokensVhsys, corrigirEncoding, type VhsysTokens } from "./client";
import { createAdminClient } from "../supabase/admin";

// Endpoint da empresa autenticada (lista com a própria empresa do token).
const ENDPOINTS_EMPRESA = ["/empresas"];

// Campos que podem conter o nome, por prioridade (fantasia antes da razão social).
const CAMPOS_NOME = [
  "fantasia_empresa",
  "razao_empresa",
  "nome_fantasia",
  "razao_social",
  "nome_empresa",
  "nome",
];

function extrairNome(registro: unknown): string | null {
  if (!registro || typeof registro !== "object") return null;
  const obj = registro as Record<string, unknown>;
  for (const campo of CAMPOS_NOME) {
    const v = obj[campo];
    if (typeof v === "string" && v.trim()) return corrigirEncoding(v.trim());
  }
  return null;
}

/**
 * Tenta obter o nome da empresa da conta VHSYS ativa no contexto.
 * Deve ser chamada DENTRO de runComTokensVhsys (ou via atualizarNomeEmpresa).
 */
export async function buscarNomeEmpresa(): Promise<string | null> {
  for (const path of ENDPOINTS_EMPRESA) {
    try {
      const { data } = await vhsysGet<Record<string, unknown>>(path);
      const nome = extrairNome(data[0]);
      if (nome) return nome;
    } catch {
      // endpoint inexistente/erro → tenta o próximo
    }
  }
  return null;
}

/**
 * Busca o nome da empresa no VHSYS (com as credenciais da conta) e grava em
 * accounts.nome_empresa + nome_sync_em. Retorna o nome ou null.
 */
export async function atualizarNomeEmpresa(conta: {
  id: string;
  tokens: VhsysTokens;
}): Promise<string | null> {
  const nome = await runComTokensVhsys(conta.tokens, () => buscarNomeEmpresa());
  if (!nome) return null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("accounts")
    .update({ nome_empresa: nome, nome_sync_em: new Date().toISOString() })
    .eq("id", conta.id);
  if (error) {
    console.warn(`atualizarNomeEmpresa: ${error.message}`);
  }
  return nome;
}
