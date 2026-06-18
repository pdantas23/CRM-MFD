"use client";
// Card compacto de entrega para a grade da tabela semanal.

import { StatusBadge } from "@/components/ui/Badge";
import type { Entrega } from "@/lib/types/database";

interface Props {
  entrega: Entrega;
  arrastavel?: boolean;
  onClick?: () => void;
}

export function EntregaCard({ entrega, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-md border border-gray-200 bg-white p-2.5 shadow-sm transition-colors hover:border-gray-300${
        onClick ? " cursor-pointer" : ""
      }`}
    >
      <p className="truncate text-sm font-semibold text-gray-900">
        {entrega.nome_cliente}
      </p>
      {entrega.bairro && (
        <p className="mt-0.5 truncate text-xs text-gray-500">{entrega.bairro}</p>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <StatusBadge status={entrega.status} curto />
        {entrega.numero_orcamento && (
          <span className="shrink-0 text-[11px] text-gray-400">
            #{entrega.numero_orcamento}
          </span>
        )}
      </div>
    </div>
  );
}
