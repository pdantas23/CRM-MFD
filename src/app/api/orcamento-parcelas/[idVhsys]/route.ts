// GET /api/orcamento-parcelas/[idVhsys]
// Retorna parcelas de um orçamento via GET /orcamentos/{id}/parcelas no VHSYS.
// O jsonb dados do espelho não contém parcelas, então sempre cai no fallback.
//
// RLS: antes do fallback verifica via createClient() (com RLS) que o orçamento
// é visível ao usuário logado. Sem acesso → 403 (não 404, para não vazar info).
// Segue o mesmo padrão de /api/orcamento-itens/[idVhsys]/route.ts.

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

  // Consulta com RLS ativo — a sessão do usuário determina o que pode ver
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  // Verifica visibilidade via RLS (mesmo padrão de orcamento-itens)
  const { data: espelho, error: espelhoError } = await supabase
    .from("vhsys_orcamentos")
    .select("id_vhsys")
    .eq("id_vhsys", idVhsys)
    .single();

  if (espelhoError || !espelho) {
    return NextResponse.json({ erro: "Acesso negado ou orçamento não encontrado." }, { status: 403 });
  }

  // Busca parcelas direto no VHSYS — o espelho não as armazena
  try {
    const { data: parcelas } = await vhsysGet(`/orcamentos/${idVhsys}/parcelas`);
    return NextResponse.json(parcelas);
  } catch {
    return NextResponse.json([]);
  }
}
