"use client";

import { PedidoCard } from "./PedidoCard";
import { formatBRL } from "@/lib/format";
import { COLUNAS_KANBAN, SEGMENTO_PAGAMENTO } from "@/lib/vhsys/fluxo";
import type { PedidoKanban, SituacaoRow } from "@/lib/types/pedidos";

interface PedidosKanbanProps {
  situacoes: SituacaoRow[];
  pedidos: PedidoKanban[];
  onCardClick: (pedido: PedidoKanban) => void;
}

// Colunas dinâmicas: nomes/ordem vêm do espelho de situações da conta
// (GET /situacoes); o fluxo (quais entram e em que sequência) vem de
// COLUNAS_KANBAN. 778 (Cancelado) fica fora do quadro.
export function PedidosKanban({ situacoes, pedidos, onCardClick }: PedidosKanbanProps) {
  const porId = new Map(situacoes.map((s) => [s.id_vhsys, s]));
  const colunas = COLUNAS_KANBAN.filter((id) => porId.has(id));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {colunas.map((idSituacao) => {
          const situacao = porId.get(idSituacao)!;
          const ehPagamento = SEGMENTO_PAGAMENTO.has(idSituacao);
          const daColuna = pedidos.filter((p) => p.situacao_id === idSituacao);
          const total = daColuna.reduce((acc, p) => acc + (p.valor_total ?? 0), 0);

          return (
            <div
              key={idSituacao}
              className="flex min-h-[200px] w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-100/60"
            >
              <div
                className={`border-b-2 px-4 py-3 ${
                  ehPagamento ? "border-amber-300" : "border-blue-300"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {ehPagamento ? "Pagamento" : "Entrega"}
                </p>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{situacao.nome}</h2>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-600 shadow-sm">
                    {daColuna.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatBRL(total)}</p>
              </div>

              <div className="flex-1 space-y-3 p-3">
                {daColuna.map((pedido) => (
                  <PedidoCard key={pedido.id} pedido={pedido} onClick={onCardClick} />
                ))}
                {daColuna.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-gray-400">
                    Nenhum pedido nesta situação
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
