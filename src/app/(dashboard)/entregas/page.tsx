import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { aplicarEntregas, metricasEntregas, type Metrica } from "@/lib/crm/metricas";
import { comCache } from "@/lib/crm/cache";
import { DashboardEntregas } from "@/components/dashboard/DashboardEntregas";
import { TabelaSemanalEntregas } from "@/components/entregas/TabelaSemanalEntregas";
import { EntregasAdminView } from "@/components/entregas/EntregasAdminView";
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

// Soma `dias` a uma data civil YYYY-MM-DD em UTC — sem deslocar o dia pelo fuso.
function somarDiasCivil(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

// Segunda-feira (civil) da semana de uma data YYYY-MM-DD. getUTCDay(): 0=dom..6=sáb;
// converte para offset com segunda=0 e subtrai. Cálculo em UTC para não deslocar.
function segundaDaSemana(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = dt.getUTCDay(); // 0=dom
  const offset = (diaSemana + 6) % 7; // dias desde a segunda
  return somarDiasCivil(iso, -offset);
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

  // Role decide a visão: entregador vê só HOJE (turnos); vendedor/admin veem a
  // TABELA SEMANAL. Carrega-se apenas o que cada visão precisa.
  const isEntregador = role === "entregador";

  // Client de serviço: ignora o recorte de RLS por vendedor para a visão de
  // hoje e a semana (mostra TODAS as entregas). A tabela completa do admin,
  // mais abaixo, segue escopada por RLS via `supabase`.
  const admin = createAdminClient();

  // ── Visão de entregas do dia (apenas entregador) ─────────────────────────
  let manha: Entrega[] = [];
  let tarde: Entrega[] = [];
  let noite: Entrega[] = [];
  if (isEntregador) {
    const { data: entregasHojeData } = await admin
      .from("entregas")
      .select("*")
      .eq("data", today)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    const entregasHoje = (entregasHojeData ?? []) as Entrega[];
    manha = entregasHoje.filter((e) => e.periodo === "manha");
    tarde = entregasHoje.filter((e) => e.periodo === "tarde");
    noite = entregasHoje.filter((e) => e.periodo === "noite");
  }

  // ── Tabela semanal (vendedor e admin) ────────────────────────────────────
  // Segunda da semana: usa o param `inicio` (YYYY-MM-DD válido) ou a segunda da
  // semana corrente no fuso de São Paulo. Sábado = segunda + 5 (civil, UTC).
  const inicioParam =
    typeof searchParams?.inicio === "string" ? searchParams.inicio : undefined;
  const inicioSemana =
    inicioParam && /^\d{4}-\d{2}-\d{2}$/.test(inicioParam)
      ? inicioParam
      : segundaDaSemana(today);
  const sabadoSemana = somarDiasCivil(inicioSemana, 5);

  let entregasSemana: Entrega[] = [];
  if (!isEntregador) {
    const { data: semanaData } = await admin
      .from("entregas")
      .select("*")
      .gte("data", inicioSemana)
      .lte("data", sabadoSemana)
      .order("data", { ascending: true })
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    entregasSemana = (semanaData ?? []) as Entrega[];
  }

  // ── Tabela completa, filtros e métricas (apenas admin) ───────────────────
  let listaAdmin: Entrega[] = [];
  let metricasAdmin: Metrica[] = [];

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

    const [{ data: entregasData }, metricas] = await comCache(
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

    listaAdmin = (entregasData ?? []) as Entrega[];
    metricasAdmin = metricas;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEntregador
            ? `Entregas de hoje · ${formatDate(today)}`
            : "Programação semanal"}
        </p>
      </div>

      {/* Roteamento por papel:
          - entregador → visão do dia (turnos);
          - admin → mini-navbar para alternar calendário semanal / lista completa;
          - vendedor → calendário semanal (só leitura). */}
      {isEntregador ? (
        <DashboardEntregas manha={manha} tarde={tarde} noite={noite} isAdmin={isAdmin} />
      ) : isAdmin ? (
        <Suspense>
          <EntregasAdminView
            semana={entregasSemana}
            inicioSemana={inicioSemana}
            lista={listaAdmin}
            filtros={filtros}
            metricas={metricasAdmin}
            podeNovaEntrega={isAdmin}
          />
        </Suspense>
      ) : (
        <TabelaSemanalEntregas
          entregas={entregasSemana}
          inicioSemana={inicioSemana}
          isAdmin={false}
        />
      )}
    </div>
  );
}
