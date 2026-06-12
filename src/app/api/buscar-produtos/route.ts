// GET /api/buscar-produtos?q=TEXTO
// Autocomplete de produtos via espelho Supabase (vhsys_produtos).
// Não expõe coluna dados (jsonb). Autenticado.

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

  // Seleciona apenas campos necessários — NÃO expõe dados (jsonb)
  let queryBuilder = supabase
    .from("vhsys_produtos")
    .select("id_vhsys, descricao, codigo, unidade, valor")
    .eq("lixeira", false)
    .eq("status", "Ativo")
    .order("descricao")
    .limit(20);

  if (term.length > 0) {
    queryBuilder = queryBuilder.ilike("descricao", `%${term}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ erro: "Erro ao buscar produtos." }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
