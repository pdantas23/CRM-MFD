// GET /api/buscar-clientes?q=TEXTO
// Autocomplete de clientes via espelho Supabase (vhsys_clientes).
// Autenticado — redireciona para login se sem sessão (middleware garante).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Validação: query máx. 100 chars
  if (q.length > 100) {
    return NextResponse.json({ erro: "Parâmetro q excede 100 caracteres." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const term = q.trim();

  let queryBuilder = supabase
    .from("vhsys_clientes")
    .select("id_vhsys, razao, fantasia, cnpj_cpf, endereco, numero, bairro")
    .eq("lixeira", false)
    .order("razao")
    .limit(20);

  if (term.length > 0) {
    queryBuilder = queryBuilder.ilike("razao", `%${term}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ erro: "Erro ao buscar clientes." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
