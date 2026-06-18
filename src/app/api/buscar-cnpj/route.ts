// GET /api/buscar-cnpj?cnpj=00000000000000
// Consulta dados cadastrais de CNPJ via BrasilAPI. Autenticado.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const cnpj = (req.nextUrl.searchParams.get("cnpj") ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return NextResponse.json({ erro: "CNPJ deve ter 14 dígitos." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ erro: "CNPJ não encontrado." }, { status: 404 });
    }
    const d = await res.json();
    return NextResponse.json({
      razao: d.razao_social ?? "",
      fantasia: d.nome_fantasia ?? "",
      cep: d.cep ?? "",
      endereco: d.logradouro ?? "",
      numero: d.numero ?? "",
      bairro: d.bairro ?? "",
      cidade: d.municipio ?? "",
      uf: d.uf ?? "",
      telefone: d.ddd_telefone_1 ?? "",
      email: d.email ?? "",
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao consultar CNPJ." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
