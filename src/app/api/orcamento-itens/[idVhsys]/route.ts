// GET /api/orcamento-itens/[idVhsys]
// Retorna itens de um orçamento: primeiro tenta o jsonb dados do espelho,
// com fallback para GET /orcamentos/{id}/produtos na API VHSYS.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vhsysGet } from "@/lib/vhsys/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { idVhsys: string } }
) {
  const idVhsys = parseInt(params.idVhsys, 10);

  if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
    return NextResponse.json({ erro: "idVhsys inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // Tenta extrair itens do jsonb dados no espelho
  const { data: espelho } = await supabase
    .from("vhsys_orcamentos")
    .select("dados")
    .eq("id_vhsys", idVhsys)
    .single();

  if (espelho?.dados) {
    const dados = espelho.dados as Record<string, unknown>;
    if (Array.isArray(dados.produtos) && dados.produtos.length > 0) {
      return NextResponse.json(dados.produtos);
    }
  }

  // Fallback: buscar direto na API VHSYS (server-side)
  try {
    const { data: itens } = await vhsysGet(`/orcamentos/${idVhsys}/produtos`);
    return NextResponse.json(itens);
  } catch {
    return NextResponse.json([]);
  }
}
