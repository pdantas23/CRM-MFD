"use server";
// Comprovantes de entrega do pedido (canhoto, foto, PDF). Service role (tabela
// sem policies), com o papel checado aqui: admin/superadmin/financeiro em
// qualquer pedido das contas do usuário (o mural de entregas mistura contas);
// vendedor só nos pedidos dele. Arquivo no
// bucket PRIVADO "comprovantes-entrega": o navegador comprime e sobe por URL de
// upload assinada; a visualização é por URL assinada de curta duração.

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { contasDoUsuario } from "@/lib/accounts/contexto";

const BUCKET = "comprovantes-entrega";
const PAPEIS = new Set(["admin", "superadmin", "financeiro", "vendedor"]);
const TAMANHO_MAX = 5 * 1024 * 1024; // depois da compressão (PDF sobe como está)

type Resultado<T = Record<never, never>> = ({ ok: true } & T) | { ok: false; erro: string };

export interface ComprovanteEntrega {
  id: string;
  nome: string | null;
  tamanho: number | null;
  criadoEm: string;
  ehPdf: boolean;
}

/** Confere o papel e que o pedido é de uma conta do usuário (vendedor: só os dele). */
async function autorizarPedido(pedidoId: string) {
  const { user, profile } = await getSessaoComProfile();
  if (!user || !profile || !PAPEIS.has(profile.role)) return null;
  const { data } = await createAdminClient()
    .from("vhsys_pedidos")
    .select("id, conta_id, numero, vendedor_id_vhsys")
    .eq("id", pedidoId)
    .maybeSingle();
  const pedido = data as { id: string; conta_id: string; numero: number | null; vendedor_id_vhsys: number | null } | null;
  if (!pedido) return null;
  const contas = await contasDoUsuario(user.id);
  if (!contas.some((c) => c.id === pedido.conta_id)) return null;
  if (profile.role === "vendedor" && pedido.vendedor_id_vhsys !== profile.vendedor_id) return null;
  return { userId: user.id, contaId: pedido.conta_id, pedido };
}

export async function listarComprovantesEntrega(pedidoId: string): Promise<ComprovanteEntrega[]> {
  const auth = await autorizarPedido(pedidoId);
  if (!auth) return [];
  const { data } = await createAdminClient()
    .from("pedido_comprovantes")
    .select("id, nome, tamanho, criado_em, path")
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: true });
  return ((data ?? []) as { id: string; nome: string | null; tamanho: number | null; criado_em: string; path: string }[]).map(
    (c) => ({
      id: c.id,
      nome: c.nome,
      tamanho: c.tamanho,
      criadoEm: c.criado_em,
      ehPdf: /\.pdf$/i.test(c.path),
    })
  );
}

/** URL de upload assinada (o arquivo já chega comprimido pelo navegador). */
export async function prepararUploadComprovanteEntrega(
  pedidoId: string,
  ext: "jpg" | "pdf",
  tamanho: number
): Promise<Resultado<{ path: string; token: string }>> {
  const auth = await autorizarPedido(pedidoId);
  if (!auth) return { ok: false, erro: "Permissão negada." };
  if (ext !== "jpg" && ext !== "pdf") return { ok: false, erro: "Tipo de arquivo não aceito." };
  if (!Number.isFinite(tamanho) || tamanho <= 0 || tamanho > TAMANHO_MAX) {
    return { ok: false, erro: "Arquivo maior que 5 MB." };
  }
  const path = `${auth.contaId}/${pedidoId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: error?.message ?? "Falha ao preparar o envio." };
  return { ok: true, path: data.path, token: data.token };
}

export async function registrarComprovanteEntrega(
  pedidoId: string,
  path: string,
  nome: string,
  tamanho: number
): Promise<Resultado<{ id: string }>> {
  const auth = await autorizarPedido(pedidoId);
  if (!auth) return { ok: false, erro: "Permissão negada." };
  if (!path.startsWith(`${auth.contaId}/${pedidoId}/`)) return { ok: false, erro: "Arquivo inválido." };
  const { data, error } = await createAdminClient()
    .from("pedido_comprovantes")
    .insert({
      conta_id: auth.contaId,
      pedido_id: pedidoId,
      pedido_numero: auth.pedido.numero,
      path,
      nome: nome.trim().slice(0, 200) || null,
      tamanho: Math.round(tamanho),
      criado_por: auth.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

async function comprovanteDoPedido(id: string) {
  const { data } = await createAdminClient()
    .from("pedido_comprovantes")
    .select("id, pedido_id, path")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; pedido_id: string | null; path: string } | null;
}

export async function linkComprovanteEntrega(id: string): Promise<Resultado<{ url: string }>> {
  const c = await comprovanteDoPedido(id);
  if (!c?.pedido_id || !(await autorizarPedido(c.pedido_id))) return { ok: false, erro: "Permissão negada." };
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrl(c.path, 120);
  if (error || !data) return { ok: false, erro: error?.message ?? "Falha ao abrir o arquivo." };
  return { ok: true, url: data.signedUrl };
}

/** Excluir: só admin/superadmin. */
export async function excluirComprovanteEntrega(id: string): Promise<Resultado> {
  const { profile } = await getSessaoComProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) return { ok: false, erro: "Permissão negada." };
  const c = await comprovanteDoPedido(id);
  if (!c?.pedido_id || !(await autorizarPedido(c.pedido_id))) return { ok: false, erro: "Permissão negada." };
  const admin = createAdminClient();
  const { error } = await admin.from("pedido_comprovantes").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  await admin.storage.from(BUCKET).remove([c.path]);
  return { ok: true };
}
