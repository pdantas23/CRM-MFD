import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { iniciarRequest, medir, emitirLog } from "@/lib/perf/boot";
import { contasDoUsuario } from "@/lib/accounts/contexto";
import { COOKIE_CONTA, COOKIE_CONTA_OPTS } from "@/lib/accounts/contexto";

/** Volta ao login com um código de erro legível pelo client (?erro=...). */
function erroLogin(request: NextRequest, codigo: string) {
  return NextResponse.redirect(new URL(`/login?erro=${codigo}`, request.url), {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const perfCtx = iniciarRequest("/api/auth/login");

  const formData = await request.formData();
  const nome = (formData.get("nome") as string)?.trim();
  const password = formData.get("password") as string;

  if (!nome || !password) {
    return erroLogin(request, "campos");
  }

  // 1. Busca e-mail pelo nome (service role, ignora RLS)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .ilike("nome", nome)
    .single();

  if (!profile) {
    return erroLogin(request, "nome");
  }

  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email;

  if (!email) {
    return erroLogin(request, "config");
  }

  // 2. Autentica via @supabase/ssr. Os cookies de sessão são acumulados em
  //    setAll() e aplicados no response de REDIRECT. O login é um submit
  //    nativo do <form> (navegação real) — assim o Safari/iCloud Keychain
  //    detecta o envio de credenciais e oferece salvar a senha; nas próximas
  //    visitas o AutoFill passa a aparecer.
  const cookiesParaSetar: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          toSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesParaSetar.push(...toSet);
        },
      },
    }
  );

  const [signInResult, msSignIn] = await medir(() =>
    supabase.auth.signInWithPassword({ email, password })
  );

  if (signInResult.error) {
    emitirLog(perfCtx, { signIn: msSignIn }, { source: "login", result: "erro" });
    return erroLogin(request, "senha");
  }

  emitirLog(perfCtx, { signIn: msSignIn }, { source: "login", result: "ok" });

  // OWNER: acesso de gerenciamento (não operacional) — vai direto à área de
  // contas, sem conta ativa.
  const role = (profile as { role?: string }).role;
  if (role === "owner") {
    const respOwner = NextResponse.redirect(new URL("/gerenciamento", request.url), {
      status: 303,
    });
    cookiesParaSetar.forEach(({ name, value, options }) =>
      respOwner.cookies.set(name, value, options)
    );
    return respOwner;
  }

  // Demais roles: resolve as contas que o usuário pode acessar:
  //  - 1 conta  → seleciona automaticamente (seta cookie) e vai ao dashboard.
  //  - >1 conta → redireciona ao seletor (sem cookie de conta ainda).
  const userId = signInResult.data.user?.id;
  const contas = userId ? await contasDoUsuario(userId) : [];

  const destino = contas.length === 1 ? "/" : "/selecionar-conta";
  const response = NextResponse.redirect(new URL(destino, request.url), {
    status: 303,
  });
  cookiesParaSetar.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
  if (contas.length === 1) {
    response.cookies.set(COOKIE_CONTA, contas[0].slug, COOKIE_CONTA_OPTS);
  }
  return response;
}
