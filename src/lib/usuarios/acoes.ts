"use server";
// Server Actions de gestão de USUÁRIOS — exclusivas de superadmin.
// Tudo aqui usa o service-role client (createAdminClient) para falar com a
// Auth Admin API e contornar a RLS em profiles/vhsys_vendedores. A checagem
// de permissão na borda (exigirSuperadmin) é obrigatória: Server Actions são
// endpoints HTTP invocáveis diretamente — a proteção da página não basta.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehSuperadmin } from "@/lib/auth/roles";
import { aplicarSufixoLogin } from "@/lib/accounts/login-nome";

// ── Tipos públicos ───────────────────────────────────────────────────────────

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  role: string;
  vendedorId: number | null;
  vendedorNome: string | null;
}

export interface VendedorVhsys {
  id_vhsys: number;
  nome: string;
}

type Resultado<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; erro: string };

const ROLES_VALIDOS = ["owner", "superadmin", "admin", "vendedor", "entregador"] as const;
type RoleValido = (typeof ROLES_VALIDOS)[number];

function roleValido(r: string): r is RoleValido {
  return (ROLES_VALIDOS as readonly string[]).includes(r);
}

// ── Helper de permissão ────────────────────────────────────────────────────

interface GuardSuperadmin {
  userId: string | null;
  /** Conta do superadmin chamador (null = global/legado). */
  contaId: string | null;
  /** Slug da conta do chamador (para o sufixo de login). */
  contaSlug: string | null;
  erro: string | null;
}

async function exigirSuperadmin(): Promise<GuardSuperadmin> {
  const base: GuardSuperadmin = { userId: null, contaId: null, contaSlug: null, erro: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...base, erro: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, conta_id")
    .eq("id", user.id)
    .single();
  const p = profile as { role: string; conta_id: string | null } | null;

  if (!ehSuperadmin(p?.role)) {
    return { ...base, erro: "Permissão negada: somente superadmin." };
  }

  // Resolve o slug da conta do chamador (accounts só é legível via service role).
  let contaSlug: string | null = null;
  if (p?.conta_id) {
    const admin = createAdminClient();
    const { data: conta } = await admin
      .from("accounts")
      .select("slug")
      .eq("id", p.conta_id)
      .maybeSingle();
    contaSlug = (conta as { slug: string } | null)?.slug ?? null;
  }

  return { userId: user.id, contaId: p?.conta_id ?? null, contaSlug, erro: null };
}

// ── Listagens ──────────────────────────────────────────────────────────────

export async function listarUsuarios(): Promise<Resultado<{ usuarios: UsuarioRow[] }>> {
  const { erro, contaId } = await exigirSuperadmin();
  if (erro) return { ok: false, erro };

  const admin = createAdminClient();

  // Emails vêm do Auth (paginado; uma página de 1000 cobre a base atual).
  const { data: authData, error: authErro } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authErro) return { ok: false, erro: authErro.message };
  const emailPorId = new Map<string, string>();
  for (const u of authData.users) {
    if (u.email) emailPorId.set(u.id, u.email);
  }

  // Escopo por conta: superadmin de uma conta vê só os usuários daquela conta.
  // (contaId null = superadmin global/legado → vê todos.)
  let query = admin.from("profiles").select("id, nome, role, vendedor_id").order("nome");
  if (contaId) query = query.eq("conta_id", contaId);
  const { data: profilesData, error: profErro } = await query;
  if (profErro) return { ok: false, erro: profErro.message };

  const { data: vendedoresData } = await admin
    .from("vhsys_vendedores")
    .select("id_vhsys, nome");
  const nomePorVendedor = new Map<number, string>();
  for (const v of (vendedoresData ?? []) as VendedorVhsys[]) {
    nomePorVendedor.set(v.id_vhsys, v.nome);
  }

  const profiles = (profilesData ?? []) as {
    id: string;
    nome: string;
    role: string;
    vendedor_id: number | null;
  }[];

  const usuarios: UsuarioRow[] = profiles.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: emailPorId.get(p.id) ?? "",
    role: p.role,
    vendedorId: p.vendedor_id,
    vendedorNome: p.vendedor_id != null ? (nomePorVendedor.get(p.vendedor_id) ?? null) : null,
  }));

  return { ok: true, usuarios };
}

export async function listarVendedoresVhsys(): Promise<Resultado<{ vendedores: VendedorVhsys[] }>> {
  const { erro } = await exigirSuperadmin();
  if (erro) return { ok: false, erro };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vhsys_vendedores")
    .select("id_vhsys, nome")
    .order("nome");
  if (error) return { ok: false, erro: error.message };

  return { ok: true, vendedores: (data ?? []) as VendedorVhsys[] };
}

// ── Mutações ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  role: string;
  vendedorId?: number | null;
}): Promise<Resultado<{ id: string }>> {
  const { erro, contaId, contaSlug } = await exigirSuperadmin();
  if (erro) return { ok: false, erro };

  const email = (dados.email ?? "").trim().toLowerCase();
  const senha = dados.senha ?? "";
  const role = dados.role;
  const vendedorId = dados.vendedorId ?? null;

  // Nome de login = nome digitado + sufixo da conta do superadmin (ex.: joao-sa).
  const nome = aplicarSufixoLogin((dados.nome ?? "").trim(), contaSlug ?? "");

  // Validações
  if (!nome) return { ok: false, erro: "Nome é obrigatório." };
  if (!EMAIL_RE.test(email)) return { ok: false, erro: "Email inválido." };
  if (senha.length < 6) return { ok: false, erro: "A senha deve ter ao menos 6 caracteres." };
  if (!roleValido(role)) return { ok: false, erro: "Role inválido." };
  if (role === "vendedor" && (vendedorId == null || !Number.isInteger(vendedorId))) {
    return { ok: false, erro: "Vendedor VHSYS é obrigatório para o role vendedor." };
  }

  const admin = createAdminClient();

  // Nome único (login é por nome — não pode haver dois iguais)
  const { data: existente } = await admin
    .from("profiles")
    .select("id")
    .ilike("nome", nome)
    .maybeSingle();
  if (existente) return { ok: false, erro: `Já existe um usuário com o nome "${nome}".` };

  // Cria o usuário no Auth — o trigger handle_new_user cria o profile.
  const { data: criado, error: criarErro } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role },
  });
  if (criarErro) {
    const msg = /already|registered|exist/i.test(criarErro.message)
      ? "Já existe um usuário com esse email."
      : criarErro.message;
    return { ok: false, erro: msg };
  }

  const novoId = criado.user?.id;
  if (!novoId) return { ok: false, erro: "Usuário criado mas id não retornado." };

  // Garante nome, role, vínculo de vendedor e CONTA no profile (o trigger só
  // semeia o básico). O usuário criado pertence à conta do superadmin.
  const { error: updErro } = await admin
    .from("profiles")
    .update({
      nome,
      role,
      vendedor_id: role === "vendedor" ? vendedorId : null,
      conta_id: contaId,
    })
    .eq("id", novoId);
  if (updErro) return { ok: false, erro: updErro.message };

  revalidatePath("/configuracoes");
  return { ok: true, id: novoId };
}

export async function atualizarUsuario(
  id: string,
  dados: {
    nome: string;
    email: string;
    senha?: string;
    role: string;
    vendedorId: number | null;
  }
): Promise<Resultado> {
  const { erro, contaSlug } = await exigirSuperadmin();
  if (erro) return { ok: false, erro };

  if (!id) return { ok: false, erro: "Usuário inválido." };

  // Reaplica o sufixo da conta ao nome editado (idempotente).
  const nome = aplicarSufixoLogin((dados.nome ?? "").trim(), contaSlug ?? "");
  const email = (dados.email ?? "").trim().toLowerCase();
  const senha = dados.senha ?? "";
  const role = dados.role;
  const vendedorId = dados.vendedorId ?? null;

  // Validações
  if (!nome) return { ok: false, erro: "Nome é obrigatório." };
  if (!EMAIL_RE.test(email)) return { ok: false, erro: "Email inválido." };
  if (senha && senha.length < 6) return { ok: false, erro: "A senha deve ter ao menos 6 caracteres." };
  if (!roleValido(role)) return { ok: false, erro: "Role inválido." };
  if (role === "vendedor" && (vendedorId == null || !Number.isInteger(vendedorId))) {
    return { ok: false, erro: "Vendedor VHSYS é obrigatório para o role vendedor." };
  }

  const admin = createAdminClient();

  // Nome único — excluindo o próprio usuário.
  const { data: nomeExistente } = await admin
    .from("profiles")
    .select("id")
    .ilike("nome", nome)
    .neq("id", id)
    .maybeSingle();
  if (nomeExistente) return { ok: false, erro: "Já existe um usuário com esse nome." };

  // Guardrail: não rebaixar o ÚLTIMO superadmin.
  if (role !== "superadmin") {
    const { data: atual } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if ((atual as { role: string } | null)?.role === "superadmin") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "superadmin");
      if ((count ?? 0) <= 1) {
        return { ok: false, erro: "Não é possível rebaixar o último superadmin." };
      }
    }
  }

  // Atualiza profile (nome, role, vendedor_id).
  const { error: profErro } = await admin
    .from("profiles")
    .update({ nome, role, vendedor_id: role === "vendedor" ? vendedorId : null })
    .eq("id", id);
  if (profErro) return { ok: false, erro: profErro.message };

  // Atualiza email, senha (opcional) e user_metadata via Auth Admin.
  const authUpdate: {
    email: string;
    email_confirm: boolean;
    user_metadata: { nome: string; role: string };
    password?: string;
  } = {
    email,
    email_confirm: true,
    user_metadata: { nome, role },
  };
  if (senha) authUpdate.password = senha;

  const { error: authErro } = await admin.auth.admin.updateUserById(id, authUpdate);
  if (authErro) {
    const msg = /already|registered|exist/i.test(authErro.message)
      ? "Já existe um usuário com esse email."
      : authErro.message;
    return { ok: false, erro: msg };
  }

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function excluirUsuario(id: string): Promise<Resultado> {
  const { userId, erro } = await exigirSuperadmin();
  if (erro) return { ok: false, erro };

  if (!id) return { ok: false, erro: "Usuário inválido." };
  if (id === userId) return { ok: false, erro: "Você não pode excluir o próprio usuário." };

  const admin = createAdminClient();

  // Guardrail: não excluir o último superadmin.
  const { data: alvo } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  if ((alvo as { role: string } | null)?.role === "superadmin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "superadmin");
    if ((count ?? 0) <= 1) {
      return { ok: false, erro: "Não é possível excluir o último superadmin." };
    }
  }

  // FK on delete cascade remove o profile junto.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { ok: false, erro: error.message };

  revalidatePath("/configuracoes");
  return { ok: true };
}
