"use server";
// Server Actions de CADASTRO/GESTÃO de contas VHSYS — restritas à role OWNER.
// Espelha o que scripts/seed-accounts.ts faz, porém a partir do CRM.
// NUNCA retorna tokens em claro; cifra na escrita e busca o nome no VHSYS.

import { revalidatePath } from "next/cache";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehOwner } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "./cripto";
import { atualizarNomeEmpresa } from "@/lib/vhsys/empresa";
import { aplicarSufixoLogin } from "./login-nome";
import { sincronizarEspelho, type ContaSync } from "@/lib/vhsys/sync";
import type { Account } from "./repo";

const API_BASE_DEFAULT = "https://api.vhsys.com/v2";

/** Resolve id+slug+tokens (decifrados) de uma conta para o sync. SERVER-ONLY. */
async function contaSyncPorId(id: string): Promise<ContaSync | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("accounts")
    .select("id, slug, api_base, access_token_enc, secret_token_enc")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    id: string;
    slug: string;
    api_base: string;
    access_token_enc: string;
    secret_token_enc: string;
  };
  return {
    id: row.id,
    slug: row.slug,
    tokens: {
      accessToken: decrypt(row.access_token_enc),
      secretToken: decrypt(row.secret_token_enc),
      apiBase: row.api_base,
    },
  };
}

async function exigirOwner(): Promise<{ ok: true } | { ok: false; erro: string }> {
  const { profile } = await getSessaoComProfile();
  if (!profile || !ehOwner(profile.role)) {
    return { ok: false, erro: "Sem permissão (apenas owner)." };
  }
  return { ok: true };
}

interface AccountRowPub {
  id: string;
  slug: string;
  nome_empresa: string | null;
  theme_color: string;
  api_base: string;
  ativo: boolean;
  nome_sync_em: string | null;
}

function mapRow(r: AccountRowPub): Account {
  return {
    id: r.id,
    slug: r.slug,
    nomeEmpresa: r.nome_empresa,
    themeColor: r.theme_color,
    apiBase: r.api_base,
    ativo: r.ativo,
    nomeSyncEm: r.nome_sync_em,
  };
}

export type ResultadoContas =
  | { ok: true; contas: Account[] }
  | { ok: false; erro: string };

/** Lista TODAS as contas (ativas e inativas) para a tela de gestão. */
export async function listarContasAdmin(): Promise<ResultadoContas> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, slug, nome_empresa, theme_color, api_base, ativo, nome_sync_em")
    .order("slug");
  if (error) return { ok: false, erro: error.message };
  return { ok: true, contas: (data ?? []).map((r) => mapRow(r as AccountRowPub)) };
}

export interface NovaContaInput {
  slug: string;
  accessToken: string;
  secretToken: string;
  apiBase?: string;
  themeColor?: string;
}

export type ResultadoCadastro =
  | { ok: true; nomeEmpresa: string | null; sincronizada: boolean; erroSync?: string }
  | { ok: false; erro: string };

/** Cadastra uma nova conta VHSYS (tokens cifrados) e busca o nome no VHSYS. */
export async function criarConta(input: NovaContaInput): Promise<ResultadoCadastro> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const slug = input.slug.trim().toLowerCase();
  const accessToken = input.accessToken.trim();
  const secretToken = input.secretToken.trim();
  const apiBase = (input.apiBase || "").trim() || API_BASE_DEFAULT;
  const themeColor = (input.themeColor || "").trim() || "#1a73e8";

  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(slug)) {
    return { ok: false, erro: "Slug inválido (use letras minúsculas, números e hífen)." };
  }
  if (!accessToken || !secretToken) {
    return { ok: false, erro: "Informe access token e secret token." };
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
    return { ok: false, erro: "Cor inválida. Use #RRGGBB." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      slug,
      api_base: apiBase,
      theme_color: themeColor,
      access_token_enc: encrypt(accessToken),
      secret_token_enc: encrypt(secretToken),
      ativo: true,
    })
    .select("id")
    .single();

  if (error) {
    const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
    return { ok: false, erro: dup ? `Já existe uma conta com o slug "${slug}".` : error.message };
  }

  // Busca/cacheia o nome da empresa direto do VHSYS (best-effort).
  const id = (data as { id: string }).id;
  let nomeEmpresa: string | null = null;
  try {
    nomeEmpresa = await atualizarNomeEmpresa({
      id,
      tokens: { accessToken, secretToken, apiBase },
    });
  } catch {
    // credenciais inválidas / VHSYS indisponível → segue sem nome
  }

  // Pull inicial COMPLETO da conta recém-criada (popula o espelho com conta_id).
  // Em try/catch: se falhar, a conta já existe e o sync pode ser refeito pelo
  // botão "Sincronizar" ou pelo cron (que itera as contas ativas).
  let sincronizada = false;
  let erroSync: string | undefined;
  try {
    const resultados = await sincronizarEspelho("completo", {
      id,
      slug,
      tokens: { accessToken, secretToken, apiBase },
    });
    const comErro = resultados.find((r) => r.erro);
    if (comErro) erroSync = `${comErro.entidade}: ${comErro.erro}`;
    else sincronizada = true;
  } catch (err) {
    erroSync = err instanceof Error ? err.message : String(err);
  }

  revalidatePath("/gerenciamento");
  revalidatePath("/", "layout");
  return { ok: true, nomeEmpresa, sincronizada, erroSync };
}

/** Dispara o sync COMPLETO de uma conta sob demanda (re-sync manual). */
export async function sincronizarContaCompleto(id: string): Promise<ResultadoAcao> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const conta = await contaSyncPorId(id);
  if (!conta) return { ok: false, erro: "Conta não encontrada." };

  try {
    const resultados = await sincronizarEspelho("completo", conta);
    const comErro = resultados.find((r) => r.erro);
    if (comErro) return { ok: false, erro: `${comErro.entidade}: ${comErro.erro}` };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/gerenciamento");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type ResultadoAcao = { ok: true } | { ok: false; erro: string };

/** Ativa/desativa uma conta. Conta inativa some do seletor e do sync. */
export async function alternarAtivoConta(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const supabase = createAdminClient();
  const { error } = await supabase.from("accounts").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };

  revalidatePath("/gerenciamento");
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface EditarContaInput {
  slug?: string;
  themeColor?: string;
  apiBase?: string;
  /** Rotação de credenciais — só aplica se AMBOS forem informados. */
  accessToken?: string;
  secretToken?: string;
}

/** Edita uma conta (slug, cor, base e/ou rotação de tokens). */
export async function atualizarConta(
  id: string,
  input: EditarContaInput
): Promise<ResultadoAcao> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const update: Record<string, unknown> = {};

  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(slug)) {
      return { ok: false, erro: "Slug inválido (letras minúsculas, números e hífen)." };
    }
    update.slug = slug;
  }
  if (input.themeColor !== undefined) {
    const cor = input.themeColor.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(cor)) return { ok: false, erro: "Cor inválida. Use #RRGGBB." };
    update.theme_color = cor;
  }
  if (input.apiBase !== undefined && input.apiBase.trim()) {
    update.api_base = input.apiBase.trim();
  }

  const accessToken = (input.accessToken ?? "").trim();
  const secretToken = (input.secretToken ?? "").trim();
  const rotaciona = accessToken !== "" || secretToken !== "";
  if (rotaciona) {
    if (!accessToken || !secretToken) {
      return { ok: false, erro: "Para rotacionar, informe access E secret token." };
    }
    update.access_token_enc = encrypt(accessToken);
    update.secret_token_enc = encrypt(secretToken);
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = createAdminClient();
  const { error } = await supabase.from("accounts").update(update).eq("id", id);
  if (error) {
    const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
    return { ok: false, erro: dup ? "Já existe uma conta com esse slug." : error.message };
  }

  // Tokens novos → re-busca o nome da empresa (best-effort).
  if (rotaciona) {
    const apiBase = (update.api_base as string) ?? (input.apiBase || API_BASE_DEFAULT);
    try {
      await atualizarNomeEmpresa({ id, tokens: { accessToken, secretToken, apiBase } });
    } catch {
      /* segue */
    }
  }

  revalidatePath("/gerenciamento");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Gera um e-mail interno único a partir do nome (login é por nome). */
function emailDeNome(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "user"}@crm.local`;
}

export interface NovoSuperadminInput {
  contaId: string;
  nome: string;
  senha: string;
  /** Opcional — se vazio, gera a partir do nome. */
  email?: string;
}

/** Cria um superadmin VINCULADO a uma conta (profiles.conta_id = contaId). */
export async function criarSuperadminConta(input: NovoSuperadminInput): Promise<ResultadoAcao> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const senha = input.senha ?? "";

  if (!input.nome.trim()) return { ok: false, erro: "Nome é obrigatório." };
  if (senha.length < 6) return { ok: false, erro: "A senha deve ter ao menos 6 caracteres." };

  const admin = createAdminClient();

  // Valida a conta e pega o slug (sufixo do login).
  const { data: conta } = await admin
    .from("accounts")
    .select("id, slug")
    .eq("id", input.contaId)
    .maybeSingle();
  if (!conta) return { ok: false, erro: "Conta inválida." };

  // Nome de login = nome + sufixo da conta (ex.: sandro-sa).
  const nome = aplicarSufixoLogin(input.nome.trim(), (conta as { slug: string }).slug);
  const email = (input.email || "").trim().toLowerCase() || emailDeNome(nome);

  // Nome único global (login é por nome).
  const { data: existente } = await admin
    .from("profiles")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();
  if (existente) return { ok: false, erro: `Já existe um usuário com o nome "${nome}".` };

  // Cria no Auth — o trigger handle_new_user semeia o profile.
  const { data: criado, error: criarErro } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role: "superadmin" },
  });
  if (criarErro) {
    const dup = /already|registered|exist/i.test(criarErro.message);
    return { ok: false, erro: dup ? "Já existe um usuário com esse e-mail/nome." : criarErro.message };
  }
  const novoId = criado.user?.id;
  if (!novoId) return { ok: false, erro: "Usuário criado mas id não retornado." };

  // Define role superadmin + vínculo de conta no profile.
  const { error: updErro } = await admin
    .from("profiles")
    .update({ role: "superadmin", conta_id: input.contaId, vendedor_id: null })
    .eq("id", novoId);
  if (updErro) return { ok: false, erro: updErro.message };

  revalidatePath("/gerenciamento");
  return { ok: true };
}

/** Superadmins vinculados a uma conta (para listar na gestão). */
export type ResultadoSuperadmins =
  | { ok: true; usuarios: { id: string; nome: string }[] }
  | { ok: false; erro: string };

export async function listarSuperadminsConta(contaId: string): Promise<ResultadoSuperadmins> {
  const guard = await exigirOwner();
  if (!guard.ok) return guard;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome")
    .eq("conta_id", contaId)
    .eq("role", "superadmin")
    .order("nome");
  if (error) return { ok: false, erro: error.message };
  return { ok: true, usuarios: (data ?? []) as { id: string; nome: string }[] };
}
