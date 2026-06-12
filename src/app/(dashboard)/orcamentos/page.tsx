import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { OrcamentosClient } from "@/components/orcamentos/OrcamentosClient";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { type Escopo } from "@/lib/crm/metricas";
import { orcamentosOnda, POR_PAGINA } from "@/lib/crm/carregar";
import { comCache } from "@/lib/crm/cache";
import { traced, mark } from "@/lib/perf/trace";

export const dynamic = "force-dynamic";

// ── Observabilidade ─────────────────────────────────────────────────────────
// Um Server Component do App Router não consegue escrever o header Server-Timing
// (a página já está sendo renderizada/streamed quando os dados chegam) e o
// middleware roda ANTES da página, sem conhecer as durações. A observabilidade
// por-passo vem dos logs `[perf-trace /orcamentos]` no terminal do servidor
// (ver src/lib/perf/trace.ts). Caminho limpo futuro: um route handler dedicado.

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const traceTag = "/orcamentos";
  mark(traceTag, "rsc-entry");

  const supabase = await createClient();

  const { profile } = await traced(traceTag, "auth:getSessaoComProfile", () =>
    getSessaoComProfile()
  );

  // Filtros unificados (mesmo predicado para lista, contagem e métricas).
  const filtros = parseFiltros(searchParams, "orcamentos");
  const pagina = Math.max(1, Number(paramStr(searchParams?.pagina) ?? "1") || 1);

  const escopo: Escopo = {
    role: profile?.role ?? "",
    vendedorId: profile?.vendedor_id ?? null,
  };

  // Chave de cache inclui rota, filtros, página e escopo do usuário (obrigatório
  // para não vazar dados entre usuários em instâncias quentes).
  const chaveCache = `orcamentos|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}|p${pagina}`;

  // Onda única (núcleo cru extraído em carregar.ts): lista + count + métricas +
  // situações + vendedores em paralelo. Cacheada por 30s para navegações rápidas.
  const resultado = await comCache(chaveCache, 30_000, () =>
    orcamentosOnda(supabase, filtros, escopo, pagina, profile?.role === "admin", traceTag)
  );

  const { situacoes, vendedores } = resultado;
  const lista = resultado.orcamentos;
  const totalRegistros = resultado.totalContagem;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA));
  const metricas = resultado.metricas;
  const usarPlanned = resultado.countAproximado;

  // Instante em que TODOS os dados estão prontos (antes do render/serialização).
  mark(traceTag, "data-ready (antes do return)");

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Perfil não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <p className="mt-1 text-sm text-gray-500">Espelho VHSYS</p>
      </div>

      <OrcamentosClient
        orcamentos={lista}
        situacoes={situacoes}
        vendedores={vendedores}
        profile={profile}
        filtros={filtros}
        metricas={metricas}
        pagina={pagina}
        totalPaginas={totalPaginas}
        countAproximado={usarPlanned}
      />
    </div>
  );
}
