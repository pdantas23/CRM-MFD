"use client";

import { StatusVendaBadge } from "@/components/ui/Badge";
import { formatBRL, formatarData } from "@/lib/vendas/format";
import type { Venda } from "@/lib/types/vendas";

interface VendaCardProps {
  venda: Venda;
  onClick: (venda: Venda) => void;
  onCadastrarEntrega: (venda: Venda) => void;
}

export function VendaCard({
  venda,
  onClick,
  onCadastrarEntrega,
}: VendaCardProps) {
  const pagamentoCompleto = venda.status === "pagamento_completo";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", venda.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onClick(venda)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{venda.nome_cliente}</p>
        <StatusVendaBadge status={venda.status} />
      </div>

      <p className="text-xs text-gray-500">{venda.numero_orcamento}</p>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm font-bold text-gray-900">
          {formatBRL(venda.valor_total)}
        </span>
        <span className="text-xs text-gray-500">
          Pago: {formatBRL(venda.valor_pago)}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Venda em {formatarData(venda.data_venda)}
      </p>

      {/* Ação de entrega: visível apenas na coluna Pagamento Completo */}
      {venda.entrega_registrada ? (
        <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Entrega registrada
        </span>
      ) : pagamentoCompleto ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCadastrarEntrega(venda);
          }}
          className="mt-3 w-full rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
        >
          Cadastrar Entrega
        </button>
      ) : null}
    </div>
  );
}
