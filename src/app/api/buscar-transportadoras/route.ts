// GET /api/buscar-transportadoras?q=TEXTO
// Autocomplete de transportadoras via VHSYS direto (sem espelho local).
// Autenticado — retorna apenas id_vhsys e nome para o autocomplete.
//
// ATENÇÃO: nomes dos campos (razao_transportadora) inferidos — confirmar
// contra a resposta real da API /transportadoras do VHSYS.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buscarTransportadoras } from "@/lib/vhsys/catalogos";
import type { VhsysTransportadora } from "@/lib/vhsys/types";

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

  try {
    const transportadoras: VhsysTransportadora[] = await buscarTransportadoras(q.trim(), 20);

    // Retorna apenas campos mínimos para autocomplete
    const resultado = transportadoras.map((t) => ({
      id_vhsys: t.id_transportadora,
      // ATENÇÃO: campo inferido — confirmar nome real contra a API
      nome: t.razao_transportadora ?? t.fantasia_transportadora ?? String(t.id_transportadora),
    }));

    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ erro: "Erro ao buscar transportadoras." }, { status: 500 });
  }
}
