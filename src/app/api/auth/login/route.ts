import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const nome = (formData.get("nome") as string)?.trim();
  const password = formData.get("password") as string;

  if (!nome || !password) {
    return NextResponse.json({ error: "Preencha nome e senha." }, { status: 400 });
  }

  // 1. Busca e-mail pelo nome (service role, ignora RLS)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("nome", nome)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Nome não encontrado. Verifique e tente novamente." },
      { status: 400 }
    );
  }

  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  const email = userData?.user?.email;

  if (!email) {
    return NextResponse.json(
      { error: "Usuário sem e-mail configurado." },
      { status: 400 }
    );
  }

  // 2. Autentica via @supabase/ssr: ao disparar SIGNED_IN, o cliente persiste
  //    os cookies no response via setAll() — formato exato esperado pelo
  //    middleware e Server Components.
  const response = NextResponse.json({ success: true });

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: "Senha incorreta. Tente novamente." },
      { status: 401 }
    );
  }

  return response;
}
