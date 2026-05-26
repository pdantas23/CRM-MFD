import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PeriodoBadge, StatusBadge } from "@/components/ui/Badge";
import { EntregasFilter } from "@/components/entregas/EntregasFilter";
import type { Entrega, Profile } from "@/lib/types/database";
import { Suspense } from "react";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

interface SearchParams {
  data?: string;
  periodo?: string;
  status?: string;
  q?: string;
}

async function EntregasTable({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = (profile as Profile | null)?.role === "admin";

  let query = supabase
    .from("entregas")
    .select("*")
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (searchParams.data) query = query.eq("data", searchParams.data);
  if (searchParams.periodo) query = query.eq("periodo", searchParams.periodo);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.q) {
    query = query.or(
      `nome_cliente.ilike.%${searchParams.q}%,bairro.ilike.%${searchParams.q}%,endereco.ilike.%${searchParams.q}%,numero_orcamento.ilike.%${searchParams.q}%`
    );
  }

  const { data: entregas, error } = await query;

  if (error) {
    return (
      <div className="px-6 py-10 text-center text-sm text-red-600">
        Erro ao carregar entregas.
      </div>
    );
  }

  if (!entregas || entregas.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm font-medium text-gray-500">Nenhuma entrega encontrada</p>
        <p className="mt-1 text-sm text-gray-400">Tente ajustar os filtros ou crie uma nova entrega.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Orçamento</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bairro</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Período</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(entregas as Entrega[]).map((entrega) => (
              <tr key={entrega.id} className="transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {formatDate(entrega.data)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{entrega.nome_cliente}</p>
                  <p className="text-xs text-gray-500">{entrega.cpf_cnpj}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {entrega.numero_orcamento}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{entrega.bairro}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <PeriodoBadge periodo={entrega.periodo} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={entrega.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/entregas/${entrega.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver
                    </Link>
                    {isAdmin && (
                      <Link
                        href={`/entregas/${entrega.id}/editar`}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Editar
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-6 py-3 text-right text-sm text-gray-500">
        {entregas.length} {entregas.length === 1 ? "entrega" : "entregas"} encontradas
      </div>
    </>
  );
}

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie todas as entregas cadastradas</p>
        </div>
        <Link href="/entregas/nova" className="btn-primary w-full sm:w-auto">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Entrega
        </Link>
      </div>

      <div className="mb-5">
        <Suspense>
          <EntregasFilter />
        </Suspense>
      </div>

      <div className="card overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          }
        >
          <EntregasTable searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
