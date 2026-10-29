"use server";
// Server Actions da aba Montagens. Service role (tabelas sem policies), com o
// papel checado aqui:
//   admin/superadmin → tudo (serviços e pagamentos)
//   financeiro       → lê tudo; lança e exclui pagamentos
//   montador         → só lê os próprios serviços (e abre os anexos deles)
// Anexos de pagamento ficam no bucket PRIVADO "anexos-montagem": o navegador
// sobe o arquivo por URL de upload assinada (sem o limite de 1 MB das actions)
// e abre por URL assinada de curta duração.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin, ehFinanceiro, ehMontador } from "@/lib/auth/roles";
import { listarContasAtivas } from "@/lib/accounts/repo";

const BUCKET = "anexos-montagem";
const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ")
);

type Resultado<T = Record<never, never>> = ({ ok: true } & T) | { ok: false; erro: string };

async function sessao() {
  const { user, profile } = await getSessaoComProfile();
  if (!user || !profile) return null;
  return {
    userId: user.id,
    role: profile.role,
    podeEditar: ehAdmin(profile.role),
    podePagar: ehAdmin(profile.role) || ehFinanceiro(profile.role),
    montador: ehMontador(profile.role),
  };
}

const ehData = (v: string | null) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v);
const ehValor = (v: number | null) => v === null || (Number.isFinite(v) && v >= 0 && v < 1e9);
const texto = (v: string | null | undefined, max: number) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

// ── Serviços ───────────────────────────────────────────────────────────────

export interface EntradaServico {
  id: string | null;
  pedidoId: string | null;
  /** Usuário montador escolhido na lista (dá acesso a ele); null = só o nome. */
  montadorId: string | null;
  /** Nome digitado (usado quando não há montadorId). */
  montadorNome: string | null;
  clienteNome: string | null;
  descricao: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  /** Valor do serviço (total). */
  valorServico: number | null;
  /** Valor do montador; o restante (serviço − montador) é da empresa. */
  valorMontador: number | null;
  inicioPrevisto: string | null;
  fimPrevisto: string | null;
  obs: string | null;
}

export async function salvarServico(e: EntradaServico): Promise<Resultado<{ id: string }>> {
  const s = await sessao();
  if (!s?.podeEditar) return { ok: false, erro: "Permissão negada." };

  if (![e.inicioPrevisto, e.fimPrevisto].every(ehData)) return { ok: false, erro: "Data inválida." };
  if (e.inicioPrevisto && e.fimPrevisto && e.fimPrevisto < e.inicioPrevisto) {
    return { ok: false, erro: "O fim da obra é antes do início." };
  }
  if (!ehValor(e.valorServico) || !ehValor(e.valorMontador)) return { ok: false, erro: "Valor inválido." };
  if (e.valorServico !== null && e.valorMontador !== null && e.valorMontador > e.valorServico) {
    return { ok: false, erro: "O valor do montador é maior que o valor do serviço." };
  }
  // Valor da empresa = serviço − montador (só com os dois preenchidos).
  const valorEmpresa =
    e.valorServico === null || e.valorMontador === null
      ? null
      : Math.round((e.valorServico - e.valorMontador) * 100) / 100;
  const uf = texto(e.uf, 2)?.toUpperCase() ?? null;
  if (uf && !UFS.has(uf)) return { ok: false, erro: "UF inválida." };
  const admin = createAdminClient();
  if (e.montadorId) {
    const { data: montador } = await admin
      .from("profiles")
      .select("id")
      .eq("id", e.montadorId)
      .eq("role", "montador")
      .maybeSingle();
    if (!montador) return { ok: false, erro: "Montador não encontrado." };
  }

  // Pedido: confere e copia nº, cliente e conta (cópias sobrevivem a exclusões).
  type PedidoRow = { conta_id: string; numero: number | null; nome_cliente: string | null };
  let pedido: PedidoRow | null = null;
  if (e.pedidoId) {
    const { data } = await admin
      .from("vhsys_pedidos")
      .select("conta_id, numero, nome_cliente")
      .eq("id", e.pedidoId)
      .maybeSingle();
    if (!data) return { ok: false, erro: "Pedido não encontrado." };
    pedido = data as PedidoRow;
  }

  const campos = {
    pedido_id: e.pedidoId,
    pedido_numero: pedido?.numero ?? null,
    conta_id: pedido?.conta_id ?? null,
    cliente_nome: texto(e.clienteNome, 255) ?? pedido?.nome_cliente ?? null,
    montador_id: e.montadorId,
    montador_nome: e.montadorId ? null : texto(e.montadorNome, 120),
    descricao: texto(e.descricao, 500),
    endereco: texto(e.endereco, 255),
    cidade: texto(e.cidade, 100),
    uf,
    valor_cobrado: e.valorServico,
    valor_empresa: valorEmpresa,
    valor_montador: e.valorMontador,
    inicio_previsto: e.inicioPrevisto,
    fim_previsto: e.fimPrevisto,
    obs: texto(e.obs, 2000),
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = e.id
    ? await admin.from("montagem_servicos").update(campos).eq("id", e.id).select("id").maybeSingle()
    : await admin
        .from("montagem_servicos")
        .insert({ ...campos, criado_por: s.userId })
        .select("id")
        .single();
  if (error) return { ok: false, erro: error.message };
  if (!data) return { ok: false, erro: "Serviço não encontrado." };
  revalidatePath("/montagens");
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Execução da obra: marca (ou desfaz) o início/fim REAL. A data pode ser
 * retroativa, mas não futura; o fim exige o início e não pode ser antes dele.
 */
export async function marcarExecucao(
  id: string,
  acao: "iniciar" | "finalizar" | "desfazer_inicio" | "desfazer_fim",
  dataReal: string | null,
  hoje: string
): Promise<Resultado> {
  const s = await sessao();
  if (!s?.podeEditar) return { ok: false, erro: "Permissão negada." };
  const admin = createAdminClient();
  const { data } = await admin.from("montagem_servicos").select("inicio_real, fim_real").eq("id", id).maybeSingle();
  const atual = data as { inicio_real: string | null; fim_real: string | null } | null;
  if (!atual) return { ok: false, erro: "Serviço não encontrado." };

  let campos: { inicio_real?: string | null; fim_real?: string | null };
  if (acao === "iniciar" || acao === "finalizar") {
    if (!dataReal || !ehData(dataReal)) return { ok: false, erro: "Data inválida." };
    // `hoje` vem do client; tolera 1 dia de fuso entre servidor e navegador.
    const limite = new Date(Date.parse(`${hoje}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    if (dataReal > limite) return { ok: false, erro: "A data não pode ser futura." };
    if (acao === "iniciar") {
      if (atual.fim_real && dataReal > atual.fim_real) return { ok: false, erro: "O início é depois do fim." };
      campos = { inicio_real: dataReal };
    } else {
      if (!atual.inicio_real) return { ok: false, erro: "Inicie a obra antes de finalizar." };
      if (dataReal < atual.inicio_real) return { ok: false, erro: "O fim é antes do início da obra." };
      campos = { fim_real: dataReal };
    }
  } else if (acao === "desfazer_fim") {
    campos = { fim_real: null };
  } else {
    if (atual.fim_real) return { ok: false, erro: "Desfaça a finalização antes." };
    campos = { inicio_real: null };
  }

  const { error } = await admin
    .from("montagem_servicos")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/montagens");
  return { ok: true };
}

export async function excluirServico(id: string): Promise<Resultado> {
  const s = await sessao();
  if (!s?.podeEditar) return { ok: false, erro: "Permissão negada." };
  const admin = createAdminClient();
  const { data: anexos } = await admin
    .from("montagem_pagamentos")
    .select("anexo_path")
    .eq("servico_id", id)
    .not("anexo_path", "is", null);
  const caminhos = ((anexos ?? []) as { anexo_path: string }[]).map((a) => a.anexo_path);
  const { error } = await admin.from("montagem_servicos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  if (caminhos.length) await admin.storage.from(BUCKET).remove(caminhos);
  revalidatePath("/montagens");
  return { ok: true };
}

// ── Pedido (busca e dados da obra) ─────────────────────────────────────────

export interface PedidoOpcao {
  id: string;
  contaSlug: string;
  numero: number | null;
  cliente: string | null;
  valor: number | null;
  data: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
}

/** Busca pedidos de todas as contas por número ou nome do cliente (até 10). */
export async function buscarPedidos(termo: string): Promise<PedidoOpcao[]> {
  const s = await sessao();
  if (!s?.podeEditar) return [];
  const t = termo.trim().slice(0, 60).replace(/[%_,()"\\]/g, " ").trim();
  if (t.length < 2) return [];

  const admin = createAdminClient();
  const contas = await listarContasAtivas();
  const slug = new Map(contas.map((c) => [c.id, c.slug]));
  let q = admin
    .from("vhsys_pedidos")
    .select("id, conta_id, numero, nome_cliente, cliente_id_vhsys, valor_total, data_pedido")
    .eq("lixeira", false)
    .in("conta_id", contas.map((c) => c.id))
    .order("data_pedido", { ascending: false })
    .limit(10);
  q = /^\d+$/.test(t) ? q.eq("numero", Number(t)) : q.ilike("nome_cliente", `%${t}%`);
  const { data } = await q;
  const pedidos = (data ?? []) as {
    id: string;
    conta_id: string;
    numero: number | null;
    nome_cliente: string | null;
    cliente_id_vhsys: number | null;
    valor_total: number | null;
    data_pedido: string | null;
  }[];

  // Endereço da obra: o do cadastro do cliente (o pedido não guarda endereço).
  const chaves = pedidos.filter((p) => p.cliente_id_vhsys);
  const { data: clientes } = chaves.length
    ? await admin
        .from("vhsys_clientes")
        .select("conta_id, id_vhsys, endereco, numero, bairro, cidade, uf")
        .in("id_vhsys", chaves.map((p) => p.cliente_id_vhsys!))
    : { data: [] };
  const cliPor = new Map(
    ((clientes ?? []) as {
      conta_id: string;
      id_vhsys: number;
      endereco: string | null;
      numero: string | null;
      bairro: string | null;
      cidade: string | null;
      uf: string | null;
    }[]).map((c) => [`${c.conta_id}:${c.id_vhsys}`, c])
  );

  return pedidos.map((p) => {
    const c = cliPor.get(`${p.conta_id}:${p.cliente_id_vhsys}`);
    const endereco = c
      ? [c.endereco, c.numero, c.bairro].filter((x) => x && String(x).trim()).join(", ") || null
      : null;
    return {
      id: p.id,
      contaSlug: slug.get(p.conta_id) ?? "",
      numero: p.numero === null ? null : Number(p.numero),
      cliente: p.nome_cliente,
      valor: p.valor_total === null ? null : Number(p.valor_total),
      data: p.data_pedido,
      endereco,
      cidade: c?.cidade ?? null,
      uf: c?.uf ? c.uf.toUpperCase() : null,
    };
  });
}

// ── Pagamentos ao montador ─────────────────────────────────────────────────

/** URL de upload assinada para o comprovante (o navegador sobe direto). */
export async function prepararUploadComprovante(
  servicoId: string,
  nomeArquivo: string
): Promise<Resultado<{ path: string; token: string }>> {
  const s = await sessao();
  if (!s?.podePagar) return { ok: false, erro: "Permissão negada." };
  const ext = (nomeArquivo.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!["pdf", "jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
    return { ok: false, erro: "Envie PDF ou imagem (JPG, PNG, WEBP, HEIC)." };
  }
  const path = `${servicoId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: error?.message ?? "Falha ao preparar o envio do arquivo." };
  return { ok: true, path: data.path, token: data.token };
}

export interface EntradaPagamento {
  servicoId: string;
  data: string;
  valor: number;
  obs: string | null;
  anexoPath: string | null;
  anexoNome: string | null;
}

export async function adicionarPagamento(e: EntradaPagamento): Promise<Resultado<{ id: string }>> {
  const s = await sessao();
  if (!s?.podePagar) return { ok: false, erro: "Permissão negada." };
  if (!ehData(e.data) || !e.data) return { ok: false, erro: "Data inválida." };
  if (!(Number.isFinite(e.valor) && e.valor > 0 && e.valor < 1e9)) return { ok: false, erro: "Valor inválido." };
  if (e.anexoPath && !e.anexoPath.startsWith(`${e.servicoId}/`)) {
    return { ok: false, erro: "Anexo inválido." };
  }
  const { data, error } = await createAdminClient()
    .from("montagem_pagamentos")
    .insert({
      servico_id: e.servicoId,
      data: e.data,
      valor: Math.round(e.valor * 100) / 100,
      obs: texto(e.obs, 1000),
      anexo_path: e.anexoPath,
      anexo_nome: texto(e.anexoNome, 200),
      criado_por: s.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/montagens");
  return { ok: true, id: (data as { id: string }).id };
}

export async function excluirPagamento(id: string): Promise<Resultado> {
  const s = await sessao();
  if (!s?.podePagar) return { ok: false, erro: "Permissão negada." };
  const admin = createAdminClient();
  const { data } = await admin.from("montagem_pagamentos").select("anexo_path").eq("id", id).maybeSingle();
  const { error } = await admin.from("montagem_pagamentos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  const caminho = (data as { anexo_path: string | null } | null)?.anexo_path;
  if (caminho) await admin.storage.from(BUCKET).remove([caminho]);
  revalidatePath("/montagens");
  return { ok: true };
}

/** Link temporário (2 min) para abrir o comprovante. Montador: só dos próprios serviços. */
export async function linkComprovante(pagamentoId: string): Promise<Resultado<{ url: string }>> {
  const s = await sessao();
  if (!s || !(s.podePagar || s.montador)) return { ok: false, erro: "Permissão negada." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("montagem_pagamentos")
    .select("anexo_path, montagem_servicos!inner(montador_id)")
    .eq("id", pagamentoId)
    .maybeSingle();
  const p = data as { anexo_path: string | null; montagem_servicos: { montador_id: string | null } } | null;
  if (!p?.anexo_path) return { ok: false, erro: "Pagamento sem anexo." };
  if (s.montador && p.montagem_servicos.montador_id !== s.userId) return { ok: false, erro: "Permissão negada." };
  const { data: link, error } = await admin.storage.from(BUCKET).createSignedUrl(p.anexo_path, 120);
  if (error || !link) return { ok: false, erro: error?.message ?? "Falha ao abrir o anexo." };
  return { ok: true, url: link.signedUrl };
}
