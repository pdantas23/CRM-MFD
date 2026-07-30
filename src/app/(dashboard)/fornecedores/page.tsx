import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { FornecedoresView } from "@/components/fornecedores/FornecedoresView";
import type { FornecedorComMateriais } from "@/components/fornecedores/ListaFornecedores";
import type { ProdutoRow } from "@/components/fornecedores/ProdutosFornecedorList";
import { CHAVES_SECAO } from "@/lib/fornecedores/secoes";

export const dynamic = "force-dynamic";

// Colunas completas do produto — necessárias para o ProdutoDetalheModal aberto
// ao clicar num material que apareceu na busca.
const COLUNAS_PRODUTO =
  "id, id_vhsys, codigo, descricao, marca, unidade, valor, valor_custo, status, fornecedor_produto, fornecedor_produto_id, dados";

// Remove os wildcards do LIKE (%, _) e os separadores da sintaxe .or() do
// PostgREST (vírgula, parênteses, aspas, contrabarra) para o termo entrar
// literal e não quebrar a query.
function sanitizarBusca(raw: string): string {
  return raw
    .trim()
    .slice(0, 80)
    .replace(/[%_,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await getSessaoComProfile();
  if (!ehAdmin(profile?.role)) {
    redirect("/entregas");
  }

  const { q: qRaw } = await searchParams;
  const q = sanitizarBusca(qRaw ?? "");
  const buscando = q.length > 0;

  const supabase = await createClient();
  const conta = await getContaAtiva();

  // Sem busca só precisamos das colunas do fornecedor (payload menor no caso
  // comum); com busca trazemos o produto completo para casar e abrir o modal.
  let query = supabase
    .from("vhsys_produtos")
    .select(buscando ? COLUNAS_PRODUTO : "fornecedor_produto, fornecedor_produto_id")
    .eq("conta_id", conta.id)
    .eq("lixeira", false)
    .not("fornecedor_produto_id", "is", null);

  if (buscando) {
    // Casa nome do fornecedor OU descrição/código do material.
    query = query.or(
      `descricao.ilike.%${q}%,codigo.ilike.%${q}%,fornecedor_produto.ilike.%${q}%`
    );
  }

  const { data } = await query;
  // O `select` dinâmico impede a inferência de tipo do supabase-js; o cast via
  // unknown é seguro — as colunas completas existem em runtime quando buscando.
  const linhas = (data ?? []) as unknown as ProdutoRow[];

  // Seções por fornecedor (associação configurável — tabela fornecedor_secoes).
  const { data: secoesData } = await supabase
    .from("fornecedor_secoes")
    .select("fornecedor_id, secoes")
    .eq("conta_id", conta.id);
  const secoesPorForn = new Map<number, string[]>();
  for (const r of (secoesData ?? []) as { fornecedor_id: number; secoes: string[] | null }[]) {
    secoesPorForn.set(
      r.fornecedor_id,
      (r.secoes ?? []).filter((s) => CHAVES_SECAO.includes(s))
    );
  }

  // Distingue "casou pelo material" (mostra e permite clicar) de "casou só pelo
  // nome do fornecedor" (mostra só o nome). ilike não considera acento — a
  // comparação aqui espelha isso (case-insensitive simples).
  const qLower = q.toLowerCase();
  const casaMaterial = (p: ProdutoRow) =>
    p.descricao.toLowerCase().includes(qLower) ||
    (p.codigo?.toLowerCase().includes(qLower) ?? false);

  const grupos = new Map<number, FornecedorComMateriais>();
  for (const p of linhas) {
    const id = p.fornecedor_produto_id;
    if (!id) continue; // 0/null tratado como "sem fornecedor"
    let g = grupos.get(id);
    if (!g) {
      g = {
        id,
        nome: p.fornecedor_produto || `Fornecedor #${id}`,
        total: 0,
        materiais: [],
        secoes: secoesPorForn.get(id) ?? [],
      };
      grupos.set(id, g);
    }
    g.total += 1;
    if (buscando && casaMaterial(p) && g.materiais.length < 5) {
      g.materiais.push(p);
    }
  }

  const fornecedores = Array.from(grupos.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fornecedores identificados nos produtos sincronizados com o VHSYS
        </p>
      </div>

      <FornecedoresView fornecedores={fornecedores} qInicial={qRaw ?? ""} />
    </div>
  );
}
