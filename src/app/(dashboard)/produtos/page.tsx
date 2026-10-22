import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { listarContasAtivas } from "@/lib/accounts/repo";
import { carregarProdutos } from "@/lib/produtos/dados";
import { ProdutosView } from "@/components/produtos/ProdutosView";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const { profile } = await getSessaoComProfile();
  // Custos e margens: só admin (inclui superadmin via ehAdmin).
  if (!profile || !ehAdmin(profile.role)) {
    redirect("/entregas");
  }

  // Todas as contas ativas numa tabela só, independente da conta logada.
  const contas = await listarContasAtivas();
  const { linhas, configs, fornecedores } = await carregarProdutos(contas);

  return (
    <div className="p-8">
      <ProdutosView
        linhas={linhas}
        configs={configs}
        contas={contas.map((c) => ({ id: c.id, slug: c.slug }))}
        fornecedores={fornecedores}
      />
    </div>
  );
}
