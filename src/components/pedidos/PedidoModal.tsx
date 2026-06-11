"use client";

import { useRouter } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import { entregaHabilitada } from "@/lib/vhsys/fluxo";
import { hrefNovaEntrega } from "./PedidoCard";
import type { PedidoKanban, SituacaoRow } from "@/lib/types/pedidos";

interface PedidoModalProps {
  pedido: PedidoKanban;
  situacoes: SituacaoRow[];
  onClose: () => void;
}

export function PedidoModal({ pedido, situacoes, onClose }: PedidoModalProps) {
  const router = useRouter();
  const situacao = situacoes.find((s) => s.id_vhsys === pedido.situacao_id);
  const fin = pedido.financeiro;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pedido #{pedido.numero}</h2>
            <p className="text-sm text-gray-500">{pedido.nome_cliente}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Situação</p>
              <p className="font-medium text-gray-900">
                {situacao?.nome ?? pedido.status_base ?? "—"}
                {pedido.origem_situacao === "legado" && (
                  <span className="ml-1 text-xs text-gray-400">(derivada)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Data</p>
              <p className="font-medium text-gray-900">
                {pedido.data_pedido ? formatarData(pedido.data_pedido) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Vendedor</p>
              <p className="font-medium text-gray-900">{pedido.vendedor_nome ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Referência</p>
              <p className="font-medium text-gray-900">{pedido.referencia || "—"}</p>
            </div>
          </div>

          {/* Financeiro — display-only (Contas a Receber); o gate usa só a situação */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Financeiro
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total do pedido</dt>
                <dd className="font-semibold text-gray-900">
                  {formatBRL(pedido.valor_total ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Recebido</dt>
                <dd className="font-semibold text-green-700">
                  {formatBRL(fin?.recebido ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="font-medium text-gray-700">Saldo</dt>
                <dd
                  className={`font-bold ${
                    (fin?.saldo ?? 0) > 0 ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {formatBRL(fin?.saldo ?? 0)}
                </dd>
              </div>
            </dl>
            {fin?.divergente && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                As contas a receber ({formatBRL(fin.total_contas)}) não batem com o
                total do pedido — confira o lançamento no VHSYS.
              </p>
            )}
            {(!fin || fin.total_contas === 0) && (
              <p className="mt-3 text-xs text-gray-500">
                Nenhuma conta a receber vinculada a este pedido (pagamentos via
                NF-e ainda não são associados — lacuna conhecida).
              </p>
            )}
          </div>

          {pedido.obs && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Observações</p>
              <p className="whitespace-pre-line text-sm text-gray-700">{pedido.obs}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          {pedido.entregaRegistrada ? (
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Entrega registrada
            </span>
          ) : entregaHabilitada(pedido.situacao_id) ? (
            <button
              type="button"
              onClick={() => router.push(hrefNovaEntrega(pedido))}
              className="btn-primary flex-1"
            >
              Cadastrar Entrega
            </button>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Entrega bloqueada — aguardando pagamento
            </span>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
