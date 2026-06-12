import { createClient } from "@/lib/supabase/server";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { aplicarEntregas, metricasEntregas } from "@/lib/crm/metricas";
import { comCache } from "@/lib/crm/cache";
import { EntregasClient } from "@/components/entregas/EntregasClient";
import { Suspense } from "react";
import type { Entrega, Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

// Limite de pedido_ids aplicáveis no filtro "só com saldo".
// Acima de 1000 o predicado é aproximado (documentado em metricas.ts).
const MAX_IDS_IN = 1000;

export default async function EntregasPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileData } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const role = (profileData as Pick<Profile, "role"> | null)?.role;
  const podeNovaEntrega = role === "admin" || role === "vendedor";
  const isAdmin = role === "admin";

  const filtros = parseFiltros(searchParams, "entregas");

  // Quando "só com saldo a receber": resolve os pedido_ids com saldo > 0
  // e restringe a query de entregas ao subconjunto vinculado.
  let pedidoIdsComSaldo: string[] | null = null;
  if (filtros.soComSaldoEntrega) {
    // Busca todos os pedido_ids com saldo positivo (até MAX_IDS_IN).
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
  function comFiltros(query: any): any {
    let q = aplicarEntregas(query, filtros);
    if (pedidoIdsComSaldo !== null) {
      q = q.in(
        "pedido_id",
        pedidoIdsComSaldo.length > 0 ? pedidoIdsComSaldo : ["__nenhum__"]
      );
    }
    return q;
  }

  // Chave de cache inclui rota, filtros e escopo do usuário (role define o que o
  // RLS deixa passar — não há vendedor_id em entregas, mas role ainda importa).
  const chaveEntregas = `entregas|${role ?? ""}|${JSON.stringify(filtros)}`;

  const [{ data: entregasData, error }, metricas] = await comCache(
    chaveEntregas,
    30_000,
    () =>
      Promise.all([
        comFiltros(
          supabase
            .from("entregas")
            // Colunas do tipo Entrega usadas pela UI. Inclui anexo_url/anexo_nome
            // (a interface Entrega os exige — o cast abaixo deve refletir o shape real).
            // Exclui apenas created_by: só usado em INSERT (EntregaForm), nunca lido.
            .select("id, data, periodo, status, nome_cliente, cpf_cnpj, numero_orcamento, bairro, endereco, anexo_url, anexo_nome, ordem, pedido_id, created_at")
            .order("data", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(500) // cap defensivo; tabela tem poucas linhas hoje
        ),
        // Métricas calculam sobre o conjunto filtrado (sem recorte de saldo;
        // o recorte de saldo nas métricas é feito internamente via pedido_id).
        metricasEntregas(supabase, filtros),
      ])
  );

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Erro ao carregar entregas.</p>
      </div>
    );
  }

  const entregas = (entregasData ?? []) as Entrega[];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie todas as entregas cadastradas</p>
      </div>

      <Suspense>
        <EntregasClient
          entregas={entregas}
          filtros={filtros}
          metricas={metricas}
          podeNovaEntrega={podeNovaEntrega}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
}
