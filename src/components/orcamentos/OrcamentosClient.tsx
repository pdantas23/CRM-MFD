"use client";
// Gerencia a tabela de orçamentos + modais de criação e detalhes.

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltroConvertido } from "@/components/crm/FiltroConvertido";
import { NovoOrcamentoModal } from "./NovoOrcamentoModal";
import { OrcamentoModal } from "./OrcamentoModal";
import type { Metrica } from "@/lib/crm/metricas";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";

interface VendedorOpcao {
  id_vhsys: number;
  nome: string;
}

interface Props {
  orcamentos: OrcamentoRow[];
  situacoes: SituacaoRow[];
  vendedores: VendedorOpcao[];
  profile: Profile;
  filtros: FiltrosCrm;
  metricas: Metrica[];
  pagina: number;
  totalPaginas: number;
  /** Quando true, o total de páginas é estimativa do planner (count: "planned"). */
  countAproximado?: boolean;
}

// Cores por situação (ids da conta — 860, 768, 769)
const corSituacao: Record<number, string> = {
  860: "bg-amber-100 text-amber-800 border-amber-200",
  768: "bg-green-100 text-green-800 border-green-200",
  769: "bg-red-100 text-red-800 border-red-200",
};

export function OrcamentosClient({
  orcamentos,
  situacoes,
  vendedores,
  profile,
  filtros,
  metricas,
  pagina,
  totalPaginas,
  countAproximado = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orcamentoAberto, setOrcamentoAberto] = useState<OrcamentoRow | null>(null);
  const [mostrarNovoModal, setMostrarNovoModal] = useState(false);

  const situacaoPorId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  function navegarCom(mudancas: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Somente admin e vendedor veem botão Novo Orçamento
  const podeNovo = profile.role === "admin" || profile.role === "vendedor";

  const opcoesSituacao = situacoes.map((s) => ({ id: s.id_vhsys, nome: s.nome }));

  return (
    <>
      <EntityToolbar
        filtros={filtros}
        situacoes={opcoesSituacao}
        vendedores={vendedores}
        mostrarVendedor={profile.role === "admin"}
        acaoPrimaria={
          podeNovo ? (
            <button
              type="button"
              onClick={() => setMostrarNovoModal(true)}
              className="btn-primary w-full sm:w-auto"
            >
              + Novo Orçamento
            </button>
          ) : undefined
        }
        filtroEspecifico={<FiltroConvertido />}
      />

      <EntityMetrics metricas={metricas} />

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orcamentos.map((o) => {
              const situacao = o.situacao_id ? situacaoPorId.get(o.situacao_id) : null;
              return (
                <tr
                  key={o.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setOrcamentoAberto(o)}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">#{o.numero}</td>
                  <td className="px-4 py-3 text-gray-900">{o.nome_cliente}</td>
                  <td className="px-4 py-3 text-gray-500">{o.vendedor_nome ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.data_orcamento ? formatarData(o.data_orcamento) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatBRL(o.valor_total ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        (o.situacao_id && corSituacao[o.situacao_id]) ||
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {situacao?.nome ?? o.status_base ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {o.pedido_emitido ? (
                      <span className="font-medium text-green-700">Emitido</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {orcamentos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum orçamento encontrado com estes filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação (total de páginas estimado quando count: "planned" — sinalizado com ≈) */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Página {pagina} de {countAproximado ? "≈ " : ""}{totalPaginas}</span>
        <div className="flex gap-2">
          {pagina > 1 && (
            <button
              type="button"
              onClick={() => navegarCom({ pagina: String(pagina - 1) })}
              className="btn-secondary !px-3 !py-1.5 text-sm"
            >
              Anterior
            </button>
          )}
          {pagina < totalPaginas && (
            <button
              type="button"
              onClick={() => navegarCom({ pagina: String(pagina + 1) })}
              className="btn-secondary !px-3 !py-1.5 text-sm"
            >
              Próxima
            </button>
          )}
        </div>
      </div>

      {/* Modais */}
      {mostrarNovoModal && (
        <NovoOrcamentoModal
          profile={profile}
          vendedores={vendedores}
          onClose={() => setMostrarNovoModal(false)}
        />
      )}

      {orcamentoAberto && (
        <OrcamentoModal
          orcamento={orcamentoAberto}
          situacaoNome={
            orcamentoAberto.situacao_id
              ? (situacaoPorId.get(orcamentoAberto.situacao_id)?.nome ?? null)
              : null
          }
          profile={profile}
          onClose={() => setOrcamentoAberto(null)}
        />
      )}
    </>
  );
}
