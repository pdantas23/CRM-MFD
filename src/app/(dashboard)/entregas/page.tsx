import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { aplicarEntregas, metricasEntregas, type Metrica } from "@/lib/crm/metricas";
import { comCache } from "@/lib/crm/cache";
import { EntregasClient } from "@/components/entregas/EntregasClient";
import { DashboardEntregas } from "@/components/dashboard/DashboardEntregas";
import { Suspense } from "react";
import type { Entrega } from "@/lib/types/database";

export const dynamic = "force-dynamic";

// Limite de pedido_ids aplicáveis no filtro "só com saldo".
// Acima de 1000 o predicado é aproximado (documentado em metricas.ts).
const MAX_IDS_IN = 1000;

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// Retorna YYYY-MM-DD no fuso de São Paulo, independente de onde o código
// está rodando (server em UTC ou browser local).
function getTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function EntregasPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const supabase = await createClient();

  const { profile } = await getSessaoComProfile();
  const role = profile?.role;
  const isAdmin = role === "admin";

  const today = getTodayISO();
  const filtros = parseFiltros(searchParams, "entregas");

  // ── Visão de entregas do dia (todos os roles) ────────────────────────────
  // Usa o client de serviço para ignorar o recorte de RLS por vendedor —
  // somente esta leitura; a tabela completa abaixo segue escopada por RLS.
  const admin = createAdminClient();
  const { data: entregasHojeData } = await admin
    .from("entregas")
    .select("*")
    .eq("data", today)
    .order("ordem", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const entregasHoje = (entregasHojeData ?? []) as Entrega[];
  const manha = entregasHoje.filter((e) => e.periodo === "manha");
  const tarde = entregasHoje.filter((e) => e.periodo === "tarde");

  // ── Tabela completa, filtros e métricas (apenas admin) ───────────────────
  let listaAdmin: Entrega[] = [];
  let metricasAdmin: Metrica[] = [];
  let erroLista = false;

  if (isAdmin) {
    // Quando "só com saldo a receber": resolve os pedido_ids com saldo > 0
    // e restringe a query de entregas ao subconjunto vinculado.
    let pedidoIdsComSaldo: string[] | null = null;
    if (filtros.soComSaldoEntrega) {
      const { data: finRows } = await supabase
        .from("vhsys_pedidos_financeiro")
        .select("pedido_id, saldo")
        .gt("saldo", 0)
        .limit(MAX_IDS_IN);
      pedidoIdsComSaldo = (finRows ?? [])
        .map((r: { pedido_id: string | null }) => r.pedido_id)
        .filter((id): id is string => id !== null);
    }

    // Monta query de entregas com todos os filtros.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comFiltros = (query: any): any => {
      let q = aplicarEntregas(query, filtros);
      if (pedidoIdsComSaldo !== null) {
        q = q.in(
          "pedido_id",
          pedidoIdsComSaldo.length > 0 ? pedidoIdsComSaldo : ["__nenhum__"]
        );
      }
      return q;
    };

    const chaveEntregas = `entregas|${role ?? ""}|${JSON.stringify(filtros)}`;

    const [{ data: entregasData, error }, metricas] = await comCache(
      chaveEntregas,
      30_000,
      () =>
        Promise.all([
          comFiltros(
            supabase
              .from("entregas")
              .select("id, data, periodo, status, nome_cliente, cpf_cnpj, numero_orcamento, bairro, endereco, anexo_url, anexo_nome, ordem, pedido_id, orcamento_id, created_at")
              .order("data", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(500) // cap defensivo; tabela tem poucas linhas hoje
          ),
          metricasEntregas(supabase, filtros),
        ])
    );

    erroLista = !!error;
    listaAdmin = (entregasData ?? []) as Entrega[];
    metricasAdmin = metricas;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Entregas de hoje · {formatDate(today)}
        </p>
      </div>

      {/* Visão do dia — exibida a todos os roles */}
      <DashboardEntregas manha={manha} tarde={tarde} isAdmin={isAdmin} />

      {/* Gestão completa (tabela + filtros + métricas) — apenas admin */}
      {isAdmin && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Todas as entregas
          </h2>
          {erroLista ? (
            <p className="text-sm text-red-600">Erro ao carregar entregas.</p>
          ) : (
            <Suspense>
              <EntregasClient
                entregas={listaAdmin}
                filtros={filtros}
                metricas={metricasAdmin}
                podeNovaEntrega={isAdmin}
                isAdmin={isAdmin}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
