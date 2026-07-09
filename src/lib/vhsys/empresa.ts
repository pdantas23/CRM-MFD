// Busca NOME e ID da empresa diretamente da API VHSYS — SERVER-ONLY.
//
// Endpoint confirmado empiricamente (scripts/vhsys-probe-empresa.ts):
//   GET /empresas → { code:200, status:"success", data:[{ id_empresa,
//   cnpj_empresa, razao_empresa, fantasia_empresa, ... }] }.
// O nome cacheia em accounts.nome_empresa; o id_empresa em accounts.vhsys_empresa_id
// (usado para montar o link público do orçamento — ver orcamento-link.ts).

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

// Campos que podem conter o id da empresa, por prioridade.
const CAMPOS_ID = ["id_empresa", "id"];

function extrairNome(registro: unknown): string | null {
  if (!registro || typeof registro !== "object") return null;
  const obj = registro as Record<string, unknown>;
  for (const campo of CAMPOS_NOME) {
    const v = obj[campo];
    if (typeof v === "string" && v.trim()) return corrigirEncoding(v.trim());
  }
  return null;
}

function extrairIdEmpresa(registro: unknown): number | null {
  if (!registro || typeof registro !== "object") return null;
  const obj = registro as Record<string, unknown>;
  for (const campo of CAMPOS_ID) {
    const v = obj[campo];
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

export interface DadosEmpresa {
  nome: string | null;
  idEmpresa: number | null;
}

/**
 * Obtém nome + id da empresa da conta VHSYS ativa no contexto.
 * Deve ser chamada DENTRO de runComTokensVhsys (ou via as funções abaixo).
 */
export async function buscarDadosEmpresa(): Promise<DadosEmpresa> {
  for (const path of ENDPOINTS_EMPRESA) {
    try {
      const { data } = await vhsysGet<Record<string, unknown>>(path);
      const nome = extrairNome(data[0]);
      const idEmpresa = extrairIdEmpresa(data[0]);
      if (nome || idEmpresa) return { nome, idEmpresa };
    } catch {
      // endpoint inexistente/erro → tenta o próximo
    }
  }
  return { nome: null, idEmpresa: null };
}

/**
 * Busca nome + id da empresa no VHSYS (com as credenciais da conta) e grava em
 * accounts (nome_empresa + nome_sync_em + vhsys_empresa_id). Retorna o nome.
 */
export async function atualizarNomeEmpresa(conta: {
  id: string;
  tokens: VhsysTokens;
}): Promise<string | null> {
  const { nome, idEmpresa } = await runComTokensVhsys(conta.tokens, () => buscarDadosEmpresa());
  const supabase = createAdminClient();

  if (nome) {
    const { error } = await supabase
      .from("accounts")
      .update({ nome_empresa: nome, nome_sync_em: new Date().toISOString() })
      .eq("id", conta.id);
    if (error) console.warn(`atualizarNomeEmpresa (nome): ${error.message}`);
  }
  // Gravação do id em separado (best-effort): se a migration 0029 ainda não
  // tiver sido aplicada, a coluna não existe e só ESTE update falha — sem
  // impedir a gravação do nome acima.
  if (idEmpresa) {
    const { error } = await supabase
      .from("accounts")
      .update({ vhsys_empresa_id: idEmpresa })
      .eq("id", conta.id);
    if (error) console.warn(`atualizarNomeEmpresa (id_empresa): ${error.message}`);
  }
  return nome;
}

/**
 * Garante o id da empresa VHSYS da conta: lê de accounts.vhsys_empresa_id e, se
 * ausente (conta ainda não sincronizada após a migration), busca via
 * GET /empresas com os tokens da conta e persiste. Retorna null se não resolver.
 */
export async function garantirIdEmpresa(conta: {
  id: string;
  tokens: VhsysTokens;
}): Promise<number | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("accounts")
    .select("vhsys_empresa_id")
    .eq("id", conta.id)
    .maybeSingle();
  const existente = (data as { vhsys_empresa_id: number | null } | null)?.vhsys_empresa_id ?? null;
  if (existente) return existente;

  const { idEmpresa } = await runComTokensVhsys(conta.tokens, () => buscarDadosEmpresa());
  if (idEmpresa) {
    const { error } = await supabase
      .from("accounts")
      .update({ vhsys_empresa_id: idEmpresa })
      .eq("id", conta.id);
    if (error) console.warn(`garantirIdEmpresa: ${error.message}`);
  }
  return idEmpresa;
}
