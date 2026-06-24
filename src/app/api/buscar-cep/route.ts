// GET /api/buscar-cep?cep=00000000
// Consulta endereço por CEP via ViaCEP. Autenticado.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const cep = (req.nextUrl.searchParams.get("cep") ?? "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return NextResponse.json({ erro: "CEP deve ter 8 dígitos." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const base = process.env.CEP_API_BASE ?? "https://viacep.com.br/ws/";
    const res = await fetch(`${base}${cep}/json/`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ erro: "CEP não encontrado." }, { status: 404 });
    }
    const d = await res.json();
    // ViaCEP retorna { erro: true } para CEP inexistente
    if (d.erro) {
      return NextResponse.json({ erro: "CEP não encontrado." }, { status: 404 });
    }
    return NextResponse.json({
      endereco: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      cidade: d.localidade ?? "",
      uf: d.uf ?? "",
      complemento: d.complemento ?? "",
    });
  } catch {
    return NextResponse.json({ erro: "Erro ao consultar CEP." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
