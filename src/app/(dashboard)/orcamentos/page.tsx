import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { OrcamentosView } from "@/components/orcamentos/OrcamentosView";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { type Escopo } from "@/lib/crm/metricas";
import { orcamentosOnda, orcamentosKanbanOnda, POR_PAGINA } from "@/lib/crm/carregar";
import { comCache } from "@/lib/crm/cache";
import { ehAdmin } from "@/lib/auth/roles";

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

  // Entregador não tem acesso a orçamentos; apenas admin e vendedor.
  if (profile && !ehAdmin(profile.role) && profile.role !== "vendedor") {
    redirect("/entregas");
  }

  const filtros = parseFiltros(searchParams, "orcamentos");
  const pagina = Math.max(1, Number(paramStr(searchParams?.pagina) ?? "1") || 1);

  const escopo: Escopo = {
    role: profile?.role ?? "",
    vendedorId: profile?.vendedor_id ?? null,
  };

  // Chave de cache inclui rota, filtros, página e escopo (evita vazamento entre usuários).
  const chaveCache = `orcamentos|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}|p${pagina}`;
  const chaveCacheKanban = `orcamentos-kanban|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}`;

  // Onda lista (count + métricas + situações + vendedores) e onda Kanban em paralelo.
  // Cada uma é cacheada por 30s para navegações rápidas.
  const [resultado, kanban] = await Promise.all([
    comCache(chaveCache, 30_000, () =>
      orcamentosOnda(supabase, filtros, escopo, pagina, ehAdmin(profile?.role))
    ),
    comCache(chaveCacheKanban, 30_000, () =>
      orcamentosKanbanOnda(supabase, filtros, escopo)
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
        <p className="mt-1 text-sm text-gray-500">Espelho VHSYS</p>
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
      />
    </div>
  );
}
