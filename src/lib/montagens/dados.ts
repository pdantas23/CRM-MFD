// Leitura da aba Montagens — SERVER-ONLY (service role; as tabelas não têm
// policies). O recorte por papel é feito aqui: o montador recebe só os
// próprios serviços e sem o valor cobrado do cliente.

import { createAdminClient } from "@/lib/supabase/admin";
import { listarContasAtivas } from "@/lib/accounts/repo";
import { ehMontador } from "@/lib/auth/roles";
import type { Profile } from "@/lib/types/database";
import type { PagamentoMontagem, ServicoMontagem } from "./status";

export interface MontadorOpcao {
  id: string;
  nome: string;
}

interface ServicoRow {
  id: string;
  conta_id: string | null;
  pedido_id: string | null;
  pedido_numero: number | null;
  cliente_nome: string | null;
  montador_id: string | null;
  montador_nome: string | null;
  descricao: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  valor_cobrado: number | null;
  valor_empresa: number | null;
  valor_montador: number | null;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  obs: string | null;
}

interface PagamentoRow {
  id: string;
  servico_id: string;
  data: string;
  valor: number;
  obs: string | null;
  anexo_path: string | null;
  anexo_nome: string | null;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function listarMontadores(): Promise<MontadorOpcao[]> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, nome")
    .eq("role", "montador")
    .order("nome");
  return ((data ?? []) as { id: string; nome: string }[]).map((p) => ({ id: p.id, nome: p.nome }));
}

export async function carregarMontagens(profile: Profile): Promise<{
  servicos: ServicoMontagem[];
  montadores: MontadorOpcao[];
}> {
  const admin = createAdminClient();
  const montador = ehMontador(profile.role);

  let consulta = admin.from("montagem_servicos").select("*").order("inicio_previsto", { ascending: true });
  if (montador) consulta = consulta.eq("montador_id", profile.id);

  const [{ data: servData, error }, montadores, contas] = await Promise.all([
    consulta,
    listarMontadores(),
    listarContasAtivas(),
  ]);
  if (error) throw new Error(`montagem_servicos: ${error.message}`);
  const servicos = (servData ?? []) as ServicoRow[];

  const ids = servicos.map((s) => s.id);
  const { data: pagData } = ids.length
    ? await admin
        .from("montagem_pagamentos")
        .select("id, servico_id, data, valor, obs, anexo_path, anexo_nome")
        .in("servico_id", ids)
        .order("data", { ascending: true })
    : { data: [] };

  const pagamentosPor = new Map<string, PagamentoMontagem[]>();
  for (const p of (pagData ?? []) as PagamentoRow[]) {
    const lista = pagamentosPor.get(p.servico_id) ?? [];
    lista.push({
      id: p.id,
      data: p.data,
      valor: Number(p.valor),
      obs: p.obs,
      anexoNome: p.anexo_nome,
      temAnexo: Boolean(p.anexo_path),
    });
    pagamentosPor.set(p.servico_id, lista);
  }
  const nomeMontador = new Map(montadores.map((m) => [m.id, m.nome]));
  const slugConta = new Map(contas.map((c) => [c.id, c.slug]));

  return {
    servicos: servicos.map((s) => ({
      id: s.id,
      contaId: s.conta_id,
      contaSlug: s.conta_id ? slugConta.get(s.conta_id) ?? null : null,
      pedidoId: s.pedido_id,
      pedidoNumero: num(s.pedido_numero),
      clienteNome: s.cliente_nome,
      montadorId: s.montador_id,
      // Vinculado a um usuário → nome do usuário; senão, o nome digitado.
      montadorNome: (s.montador_id ? nomeMontador.get(s.montador_id) : null) ?? s.montador_nome ?? null,
      descricao: s.descricao,
      endereco: s.endereco,
      cidade: s.cidade,
      uf: s.uf,
      valorCobrado: montador ? null : num(s.valor_cobrado),
      valorEmpresa: montador ? null : num(s.valor_empresa),
      valorMontador: num(s.valor_montador),
      inicioPrevisto: s.inicio_previsto,
      fimPrevisto: s.fim_previsto,
      inicioReal: s.inicio_real,
      fimReal: s.fim_real,
      obs: s.obs,
      pagamentos: pagamentosPor.get(s.id) ?? [],
    })),
    // O montador não precisa (nem deve ver) a lista dos outros montadores.
    montadores: montador ? [] : montadores,
  };
}
