import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { getContaAtiva } from "@/lib/accounts/contexto";
import { ProdutosFornecedorList, type ProdutoRow } from "@/components/fornecedores/ProdutosFornecedorList";

export const dynamic = "force-dynamic";

export default async function FornecedorDetailPage({
  params,
}: {
  params: Promise<{ fornecedorId: string }>;
}) {
  const { fornecedorId } = await params;
  const idNum = Number(fornecedorId);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  const { profile } = await getSessaoComProfile();
  if (!ehAdmin(profile?.role)) {
    redirect("/entregas");
  }

  const supabase = await createClient();
  const conta = await getContaAtiva();

  const { data } = await supabase
    .from("vhsys_produtos")
    .select("id, id_vhsys, codigo, descricao, marca, unidade, valor, valor_custo, status, fornecedor_produto, fornecedor_produto_id, dados")
    .eq("conta_id", conta.id)
    .eq("fornecedor_produto_id", idNum)
    .eq("lixeira", false)
    .order("descricao");

  const produtos = (data ?? []) as ProdutoRow[];
  const nomeFornecedor = produtos[0]?.fornecedor_produto ?? `Fornecedor #${idNum}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/fornecedores"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Fornecedores
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{nomeFornecedor}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {produtos.length} {produtos.length === 1 ? "material fornecido" : "materiais fornecidos"}
        </p>
      </div>

      <ProdutosFornecedorList produtos={produtos} />
    </div>
  );
}
