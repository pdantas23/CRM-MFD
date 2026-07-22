// GET /api/buscar-produtos?q=TEXTO
// Autocomplete de produtos via espelho Supabase (vhsys_produtos).
// Não expõe coluna dados (jsonb). Autenticado.
//
// Ordenação por RELEVÂNCIA (não alfabética): quem começa com o termo vem antes
// de quem só o contém no meio — buscar "placa" traz "PLACA ..." antes de
// "SUPORTE PARA PLACA ...". Duas consultas (prefixo + contém) garantem que os
// prefixos entrem no resultado mesmo quando há muitos itens com o termo.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContaAtiva } from "@/lib/accounts/contexto";

export const dynamic = "force-dynamic";

const LIMITE = 20;

interface ProdutoOpcao {
  id_vhsys: number;
  descricao: string;
  codigo: string | null;
  unidade: string | null;
  valor: number | null;
}

/**
 * Ordena por proximidade ao termo:
 *  0 = igual, 1 = começa com, 2 = começa uma palavra, 3 = contém no meio.
 * Empates: posição do match → descrição mais curta (mais específica) → alfabética.
 */
function ordenarPorRelevancia(itens: ProdutoOpcao[], termo: string): ProdutoOpcao[] {
  const t = termo.toLowerCase();

  function grupo(d: string, pos: number): number {
    if (d === t) return 0;
    if (pos === 0) return 1;
    if (pos > 0 && /[\s\-/(,.]/.test(d[pos - 1])) return 2;
    if (pos > 0) return 3;
    return 4; // não casou na descrição (veio por outro campo)
  }

  return [...itens].sort((a, b) => {
    const da = (a.descricao ?? "").toLowerCase();
    const db = (b.descricao ?? "").toLowerCase();
    const pa = da.indexOf(t);
    const pb = db.indexOf(t);

    const ga = grupo(da, pa);
    const gb = grupo(db, pb);
    if (ga !== gb) return ga - gb;

    const posA = pa < 0 ? Number.MAX_SAFE_INTEGER : pa;
    const posB = pb < 0 ? Number.MAX_SAFE_INTEGER : pb;
    if (posA !== posB) return posA - posB;

    if (da.length !== db.length) return da.length - db.length;
    return da.localeCompare(db, "pt-BR");
  });
}

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
  const conta = await getContaAtiva();

  // Seleciona apenas campos necessários — NÃO expõe dados (jsonb)
  const base = () =>
    supabase
      .from("vhsys_produtos")
      .select("id_vhsys, descricao, codigo, unidade, valor")
      .eq("conta_id", conta.id)
      .eq("lixeira", false)
      .eq("status", "Ativo");

  // Sem termo: lista inicial alfabética.
  if (term.length === 0) {
    const { data, error } = await base().order("descricao").limit(LIMITE);
    if (error) {
      return NextResponse.json({ erro: "Erro ao buscar produtos." }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Com termo: prefixo (mais relevantes) + contém (para completar a lista).
  const [prefixo, contem] = await Promise.all([
    base().ilike("descricao", `${term}%`).order("descricao").limit(LIMITE),
    base().ilike("descricao", `%${term}%`).order("descricao").limit(LIMITE * 3),
  ]);

  if (prefixo.error && contem.error) {
    return NextResponse.json({ erro: "Erro ao buscar produtos." }, { status: 500 });
  }

  // Dedup preservando os do prefixo, depois reordena por relevância.
  const vistos = new Set<number>();
  const combinados: ProdutoOpcao[] = [];
  for (const p of [
    ...((prefixo.data ?? []) as ProdutoOpcao[]),
    ...((contem.data ?? []) as ProdutoOpcao[]),
  ]) {
    if (vistos.has(p.id_vhsys)) continue;
    vistos.add(p.id_vhsys);
    combinados.push(p);
  }

  return NextResponse.json(ordenarPorRelevancia(combinados, term).slice(0, LIMITE));
}
