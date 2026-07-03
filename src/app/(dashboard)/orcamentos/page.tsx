import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { OrcamentosView } from "@/components/orcamentos/OrcamentosView";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { type Escopo } from "@/lib/crm/metricas";
import { orcamentosOnda, orcamentosKanbanOnda, POR_PAGINA, carregarModeloSituacoes, carregarModeloOrcamento } from "@/lib/crm/carregar";
import { comCache } from "@/lib/crm/cache";
import { ehAdmin } from "@/lib/auth/roles";
import { getContaAtiva } from "@/lib/accounts/contexto";

export const dynamic = "force-dynamic";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const supabase = await createClient();

  const { profile } = await getSessaoComProfile();

  // Admin e vendedor operam; financeiro tem acesso de LEITURA (podeEscrever
  // abaixo o exclui). Entregador não tem acesso.
  if (
    profile &&
    !ehAdmin(profile.role) &&
    profile.role !== "vendedor" &&
    profile.role !== "financeiro"
  ) {
    redirect("/entregas");
  }

  const filtros = parseFiltros(searchParams, "orcamentos");
  const pagina = Math.max(1, Number(paramStr(searchParams?.pagina) ?? "1") || 1);

  const conta = await getContaAtiva();
  // modelo (pedidos) é exigido pelo Escopo compartilhado; modeloOrc é o de orçamentos.
  const [modelo, modeloOrc] = await Promise.all([
    carregarModeloSituacoes(supabase, conta.id),
    carregarModeloOrcamento(supabase, conta.id),
  ]);
  const escopo: Escopo = {
    role: profile?.role ?? "",
    vendedorId: profile?.vendedor_id ?? null,
    contaId: conta.id,
    modelo,
  };

  // Chave de cache inclui rota, conta, filtros, página e escopo (evita vazamento entre usuários/contas).
  const chaveCache = `orcamentos|${conta.slug}|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}|p${pagina}`;
  const chaveCacheKanban = `orcamentos-kanban|${conta.slug}|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}`;

  // Onda lista (count + métricas + situações + vendedores) e onda Kanban em paralelo.
  // Cada uma é cacheada por 30s para navegações rápidas.
  const [resultado, kanban] = await Promise.all([
    comCache(chaveCache, 30_000, () =>
      orcamentosOnda(supabase, filtros, escopo, pagina, ehAdmin(profile?.role), modeloOrc)
    ),
    comCache(chaveCacheKanban, 30_000, () =>
      orcamentosKanbanOnda(supabase, filtros, escopo, modeloOrc)
    ),
  ]);

  const { situacoes, vendedores } = resultado;
  const lista = resultado.orcamentos;
  const totalRegistros = resultado.totalContagem;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA));
  const metricas = resultado.metricas;
  const usarPlanned = resultado.countAproximado;

  const podeEscrever =
    ehAdmin(profile?.role) ||
    profile?.role === "vendedor";

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Perfil não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
      </div>

      <OrcamentosView
        orcamentos={lista}
        pagina={pagina}
        totalPaginas={totalPaginas}
        countAproximado={usarPlanned}
        orcamentosKanban={kanban.orcamentos}
        atingiuLimitePorSituacao={kanban.atingiuLimitePorSituacao}
        situacoes={situacoes}
        vendedores={vendedores}
        profile={profile}
        filtros={filtros}
        metricas={metricas}
        podeEscrever={podeEscrever}
        modeloOrc={modeloOrc}
      />
    </div>
  );
}
