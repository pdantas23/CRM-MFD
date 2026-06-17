"use client";
// Gerencia a tabela de entregas com toolbar e métricas padronizados.
// Recebe dados já buscados pelo server component.

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { BotaoNavegacao } from "@/components/ui/BotaoNavegacao";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltrosEntrega } from "@/components/crm/FiltrosEntrega";
import { PeriodoBadge, StatusBadge, statusRowClass } from "@/components/ui/Badge";
import { EntregaModal } from "@/components/entregas/EntregaModal";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { Metrica } from "@/lib/crm/metricas";
import type { Entrega } from "@/lib/types/database";

interface EntregasClientProps {
  entregas: Entrega[];
  filtros: FiltrosCrm;
  metricas: Metrica[];
  podeNovaEntrega: boolean;
  isAdmin: boolean;
}

const STATUS_OPCOES = [
  { id: "entrega_final", nome: "Entrega Final" },
  { id: "entrega_parcial", nome: "Entrega Parcial" },
];

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function TabelaInterna({
  entregas,
  isAdmin,
}: {
  entregas: Entrega[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);

  if (entregas.length === 0) {
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
          {entregas.map((entrega) => (
            <tr
              key={entrega.id}
              onClick={() => setModalEntrega(entrega)}
              className={`cursor-pointer transition-colors ${statusRowClass[entrega.status]}`}
            >
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
                  {isAdmin && (
                    <Link
                      href={`/entregas/${entrega.id}/editar`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
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

      {modalEntrega && (
        <EntregaModal
          entrega={modalEntrega}
          isAdmin={isAdmin}
          onClose={() => setModalEntrega(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

export function EntregasClient({
  entregas,
  filtros,
  metricas,
  podeNovaEntrega,
  isAdmin,
}: EntregasClientProps) {
  return (
    <>
      <EntityToolbar
        filtros={filtros}
        situacoes={STATUS_OPCOES}
        situacoesSelecionadas={filtros.situacoesStr}
        mostrarVendedor={false}
        placeholderBusca="Buscar cliente, bairro, endereço, orçamento…"
        acaoPrimaria={
          podeNovaEntrega ? (
            <BotaoNavegacao
              href="/entregas/nova"
              className="btn-primary w-full sm:w-auto"
              labelPending="Abrindo…"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Entrega
            </BotaoNavegacao>
          ) : undefined
        }
        filtroEspecifico={
          <Suspense>
            <FiltrosEntrega />
          </Suspense>
        }
      />

      <EntityMetrics metricas={metricas} />

      <div className="card overflow-hidden">
        <TabelaInterna entregas={entregas} isAdmin={isAdmin} />
      </div>
    </>
  );
}
