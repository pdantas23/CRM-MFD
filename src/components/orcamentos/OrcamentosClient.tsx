"use client";
// Gerencia a tabela de orçamentos + modais de criação e detalhes.

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";
import { NovoOrcamentoModal } from "./NovoOrcamentoModal";
import { OrcamentoModal } from "./OrcamentoModal";
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
  totalAproximado: number;
  pagina: number;
  totalPaginas: number;
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
  totalAproximado,
  pagina,
  totalPaginas,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orcamentoAberto, setOrcamentoAberto] = useState<OrcamentoRow | null>(null);
  const [mostrarNovoModal, setMostrarNovoModal] = useState(false);

  const situacaoPorId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  // Constrói URL com parâmetro alterado
  function hrefCom(mudancas: Record<string, string | undefined>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === undefined || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    // Resetar página ao mudar filtros
    if (!("pagina" in mudancas)) params.delete("pagina");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navegarCom(mudancas: Record<string, string | undefined>) {
    router.push(hrefCom(mudancas));
  }

  const filtroSituacao = searchParams.get("situacao") ?? undefined;
  const filtroVendedor = searchParams.get("vendedor") ?? undefined;
  const filtroPedidoEmitido = searchParams.get("pedido_emitido") ?? undefined;
  const dataInicio = searchParams.get("data_de") ?? "";
  const dataFim = searchParams.get("data_ate") ?? "";
  const busca = searchParams.get("q") ?? "";

  const opcoesSituacao: OpcaoFiltro[] = situacoes.map((s) => ({
    valor: String(s.id_vhsys),
    label: s.nome,
  }));

  const opcoesVendedor: OpcaoFiltro[] = vendedores.map((v) => ({
    valor: String(v.id_vhsys),
    label: v.nome,
  }));

  const opcoesPedidoEmitido: OpcaoFiltro[] = [
    { valor: "true", label: "Emitido" },
    { valor: "false", label: "Não emitido" },
  ];

  // Somente admin e vendedor veem botão Novo Orçamento
  const podeNovo = profile.role === "admin" || profile.role === "vendedor";

  return (
    <>
      {/* Barra de busca */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            navegarCom({ q: fd.get("q")?.toString() ?? "" });
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            name="q"
            defaultValue={busca}
            placeholder="Buscar cliente, nº, vendedor..."
            maxLength={100}
            className="input-base !w-64"
          />
          <button type="submit" className="btn-secondary !px-3 !py-2 text-sm">
            Buscar
          </button>
          {busca && (
            <button
              type="button"
              onClick={() => navegarCom({ q: "" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar
            </button>
          )}
        </form>

        {podeNovo && (
          <button
            type="button"
            onClick={() => setMostrarNovoModal(true)}
            className="btn-primary ml-auto"
          >
            + Novo Orçamento
          </button>
        )}
      </div>

      {/* Linha de dropdowns de filtro */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DropdownFiltro
          label="Situação"
          opcoes={opcoesSituacao}
          valorAtual={filtroSituacao}
          onChange={(v) => navegarCom({ situacao: v })}
        />

        {/* Período */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
          <span className="text-xs text-gray-400">De:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => navegarCom({ data_de: e.target.value || undefined })}
            className="border-none bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-gray-400">Até:</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => navegarCom({ data_ate: e.target.value || undefined })}
            className="border-none bg-transparent text-sm outline-none"
          />
        </div>

        {profile.role === "admin" && (
          <DropdownFiltro
            label="Vendedor"
            opcoes={opcoesVendedor}
            valorAtual={filtroVendedor}
            onChange={(v) => navegarCom({ vendedor: v })}
          />
        )}

        <DropdownFiltro
          label="Pedido"
          opcoes={opcoesPedidoEmitido}
          valorAtual={filtroPedidoEmitido}
          onChange={(v) => navegarCom({ pedido_emitido: v })}
          placeholder="Qualquer"
        />
      </div>

      {/* Contador */}
      <p className="mb-2 text-xs text-gray-400">
        ~{totalAproximado} orçamentos
      </p>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Validade</th>
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
                  <td className="px-4 py-3 text-gray-500">
                    {o.validade ? formatarData(o.validade) : "—"}
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
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum orçamento encontrado com estes filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Página {pagina} de {totalPaginas}</span>
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
