"use server";
// Server Actions de ESCRITA de clientes no VHSYS — SERVER-ONLY.
// Tokens NUNCA chegam ao browser. Valida admin ou vendedor antes de agir.
// Fluxo: POST /clientes → upsert imediato no espelho vhsys_clientes.

import { createAdminClient } from "@/lib/supabase/admin";
import { vhsysPost, runComTokensVhsys } from "./client";
import { exigirAdminOuVendedor } from "./acoes";
import { getContaAtiva } from "@/lib/accounts/contexto";
import type { PayloadCriarCliente, VhsysCliente } from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────
// Replicados INLINE (não importados) para evitar dependência circular — mesmo
// padrão de acoes.ts. Mantidos fiéis a sync.ts.

// VHSYS usa "0000-00-00 00:00:00" como placeholder de "sem data"
function dataOuNull(s: string | null | undefined): string | null {
  if (!s || s.startsWith("0000-00-00")) return null;
  return s;
}

function paraLinhaCliente(c: VhsysCliente) {
  return {
    id_vhsys: c.id_cliente,
    razao: c.razao_cliente,
    fantasia: c.fantasia_cliente || null,
    tipo_pessoa: c.tipo_pessoa || null,
    cnpj_cpf: c.cnpj_cliente || null,
    endereco: c.endereco_cliente || null,
    numero: c.numero_cliente || null,
    bairro: c.bairro_cliente || null,
    complemento: c.complemento_cliente || null,
    cep: c.cep_cliente || null,
    cidade: c.cidade_cliente || null,
    uf: c.uf_cliente || null,
    fone: c.fone_cliente || null,
    celular: c.celular_cliente || null,
    email: c.email_cliente || null,
    situacao: c.situacao_cliente || null,
    vendedor_id_vhsys: c.vendedor_cliente_id || null,
    lixeira: c.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(c.data_cad_cliente),
    data_mod_vhsys: dataOuNull(c.data_mod_cliente),
    dados: c,
    sincronizado_em: new Date().toISOString(),
  };
}

// ── Validação de campos de entrada ─────────────────────────────────────────

function validarPayloadCliente(p: PayloadCriarCliente): void {
  if (!p.razao_cliente || !p.razao_cliente.trim()) {
    throw new Error("Razão social é obrigatória.");
  }
  if (p.razao_cliente.length > 255) {
    throw new Error("razao_cliente excede 255 caracteres.");
  }
  if (p.tipo_pessoa !== undefined && !["PJ", "PF"].includes(p.tipo_pessoa)) {
    throw new Error("tipo_pessoa deve ser 'PJ' ou 'PF'.");
  }
  if (
    p.tipo_cadastro !== undefined &&
    !["Cliente", "Fornecedor", "Ambos"].includes(p.tipo_cadastro)
  ) {
    throw new Error("tipo_cadastro deve ser 'Cliente', 'Fornecedor' ou 'Ambos'.");
  }
  // Limites de tamanho por campo (validados quando presentes)
  const limites: Array<[keyof PayloadCriarCliente, number]> = [
    ["cnpj_cliente", 18],
    ["insc_estadual_cliente", 45],
    ["fantasia_cliente", 255],
    ["celular_cliente", 20],
    ["fone_cliente", 20],
    ["email_cliente", 255],
    ["cep_cliente", 10],
    ["endereco_cliente", 255],
    ["numero_cliente", 7],
    ["bairro_cliente", 45],
    ["cidade_cliente", 255],
    ["uf_cliente", 2],
    ["complemento_cliente", 45],
  ];
  for (const [campo, max] of limites) {
    const v = p[campo];
    if (typeof v === "string" && v.length > max) {
      throw new Error(`${campo} excede ${max} caracteres.`);
    }
  }
  if (p.data_nasc_cliente && !/^\d{4}-\d{2}-\d{2}$/.test(p.data_nasc_cliente)) {
    throw new Error("data_nasc_cliente inválida. Use YYYY-MM-DD.");
  }
}

export interface ResultadoCriarCliente {
  ok: boolean;
  cliente?: { id_vhsys: number; razao: string };
  erro?: string;
}

// ── Ação: criar cliente ──────────────────────────────────────────────────────

/**
 * Cria cliente no VHSYS e faz upsert imediato no espelho vhsys_clientes.
 * Exige admin ou vendedor. Envia apenas os campos preenchidos.
 */
export async function criarCliente(
  payload: PayloadCriarCliente
): Promise<ResultadoCriarCliente> {
  try {
    await exigirAdminOuVendedor();
    const conta = await getContaAtiva();
    validarPayloadCliente(payload);

    // Monta payload com defaults; ignora campos vazios para não enviar lixo.
    const payloadFinal: PayloadCriarCliente = {
      razao_cliente: payload.razao_cliente.trim(),
      tipo_pessoa: payload.tipo_pessoa ?? "PJ",
      tipo_cadastro: payload.tipo_cadastro ?? "Cliente",
      ...(payload.cnpj_cliente?.trim() ? { cnpj_cliente: payload.cnpj_cliente.trim() } : {}),
      ...(payload.insc_estadual_cliente?.trim() ? { insc_estadual_cliente: payload.insc_estadual_cliente.trim() } : {}),
      ...(payload.fantasia_cliente?.trim() ? { fantasia_cliente: payload.fantasia_cliente.trim() } : {}),
      ...(payload.data_nasc_cliente?.trim() ? { data_nasc_cliente: payload.data_nasc_cliente.trim() } : {}),
      ...(payload.celular_cliente?.trim() ? { celular_cliente: payload.celular_cliente.trim() } : {}),
      ...(payload.fone_cliente?.trim() ? { fone_cliente: payload.fone_cliente.trim() } : {}),
      ...(payload.email_cliente?.trim() ? { email_cliente: payload.email_cliente.trim() } : {}),
      ...(payload.cep_cliente?.trim() ? { cep_cliente: payload.cep_cliente.trim() } : {}),
      ...(payload.endereco_cliente?.trim() ? { endereco_cliente: payload.endereco_cliente.trim() } : {}),
      ...(payload.numero_cliente?.trim() ? { numero_cliente: payload.numero_cliente.trim() } : {}),
      ...(payload.bairro_cliente?.trim() ? { bairro_cliente: payload.bairro_cliente.trim() } : {}),
      ...(payload.cidade_cliente?.trim() ? { cidade_cliente: payload.cidade_cliente.trim() } : {}),
      ...(payload.uf_cliente?.trim() ? { uf_cliente: payload.uf_cliente.trim() } : {}),
      ...(payload.complemento_cliente?.trim() ? { complemento_cliente: payload.complemento_cliente.trim() } : {}),
    };

    const novo = await runComTokensVhsys(
      { ...conta.tokens, apiBase: conta.apiBase },
      () => vhsysPost<VhsysCliente>("/clientes", payloadFinal)
    );
    const idVhsys = novo.id_cliente;
    if (!idVhsys) throw new Error("VHSYS não retornou id_cliente.");

    // Upsert no espelho (com conta_id; chave composta).
    const admin = createAdminClient();
    const { error } = await admin
      .from("vhsys_clientes")
      .upsert({ ...paraLinhaCliente(novo), conta_id: conta.id }, { onConflict: "conta_id,id_vhsys" });
    if (error) throw new Error(`upsert cliente no espelho: ${error.message}`);

    return { ok: true, cliente: { id_vhsys: idVhsys, razao: novo.razao_cliente } };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}
