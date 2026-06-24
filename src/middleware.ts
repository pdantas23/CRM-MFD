import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { iniciarRequest, medir, emitirLog } from "@/lib/perf/boot";

export async function middleware(request: NextRequest) {
  const perfCtx = iniciarRequest(request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida o token no servidor de Auth (em vez de confiar no
  // cookie) e limpa cookies órfãos quando o refresh token é inválido.
  const [{ data: { user } }, msGetUser] = await medir(() =>
    supabase.auth.getUser()
  );

  emitirLog(perfCtx, { getUser: msGetUser }, { source: "middleware" });

  const { pathname } = request.nextUrl;

  // Redirect que PRESERVA os cookies de sessão escritos por getUser (refresh/
  // normalização). Sem isso, um redirect logo após o login descarta a sessão
  // recém-estabelecida e o próximo request volta ao /login (bug "loga e volta").
  function redirecionar(para: string): NextResponse {
    const url = request.nextUrl.clone();
    url.pathname = para;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  // /api/cron/* tem autenticação própria (Bearer CRON_SECRET), sem sessão
  if (pathname.startsWith("/api/cron/")) {
    return supabaseResponse;
  }

  if (!user && pathname !== "/login" && !pathname.startsWith("/api/auth/")) {
    return redirecionar("/login");
  }

  // Usuário autenticado mas sem CONTA ATIVA selecionada → força a seleção.
  // (cookie "conta_ativa" — nome literal para não arrastar libs server-only ao
  // bundle do middleware/edge.) Não aplica a /api/*, à seleção/login nem à área
  // de gerenciamento (owner não opera contas, não tem conta ativa).
  if (
    user &&
    pathname !== "/selecionar-conta" &&
    pathname !== "/login" &&
    pathname !== "/gerenciamento" &&
    !pathname.startsWith("/api/") &&
    !request.cookies.get("conta_ativa")
  ) {
    return redirecionar("/selecionar-conta");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
