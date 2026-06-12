// GET /api/orcamento-itens/[idVhsys]
// Retorna itens de um orçamento: primeiro tenta o jsonb dados do espelho,
// com fallback para GET /orcamentos/{id}/produtos na API VHSYS.
//
// A1: antes do fallback verifica via createClient() (com RLS) que o orçamento
// é visível ao usuário logado. Sem acesso → 403 (não 404, para não vazar info).

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

  // Tenta extrair itens do jsonb dados no espelho (RLS garante visibilidade)
  const { data: espelho, error: espelhoError } = await supabase
    .from("vhsys_orcamentos")
    .select("dados")
    .eq("id_vhsys", idVhsys)
    .single();

  // A1: se RLS bloqueou ou não existe, retornar 403 — não cair no fallback VHSYS
  if (espelhoError || !espelho) {
    return NextResponse.json({ erro: "Acesso negado ou orçamento não encontrado." }, { status: 403 });
  }

  if (espelho.dados) {
    const dados = espelho.dados as Record<string, unknown>;
    if (Array.isArray(dados.produtos) && dados.produtos.length > 0) {
      return NextResponse.json(dados.produtos);
    }
  }

  // Fallback: buscar direto na API VHSYS (server-side).
  // Só chega aqui se o usuário já passou no RLS acima.
  try {
    const { data: itens } = await vhsysGet(`/orcamentos/${idVhsys}/produtos`);
    return NextResponse.json(itens);
  } catch {
    return NextResponse.json([]);
  }
}
