"use client";
// Card compacto de entrega para a grade da tabela semanal.

import { StatusBadge, ehAtrasada } from "@/components/ui/Badge";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
import type { Entrega } from "@/lib/types/database";

interface Props {
  entrega: Entrega;
  arrastavel?: boolean;
  onClick?: () => void;
}

export function EntregaCard({ entrega, onClick }: Props) {
  const entregue = Boolean(entrega.entregue_em);
  const atrasada = ehAtrasada(entrega, hojeISOSaoPaulo());

  // Realce de borda: entregue (verde) tem prioridade sobre atrasada (vermelho).
  const borda = entregue
    ? "border-emerald-300"
    : atrasada
      ? "border-red-300"
      : "border-gray-200";

  return (
    <div
      onClick={onClick}
      className={`rounded-md border bg-white p-2.5 shadow-sm transition-colors hover:border-gray-300 ${borda}${
        onClick ? " cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="truncate text-sm font-semibold text-gray-900">
          {entrega.nome_cliente}
        </p>
        {entregue ? (
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Entregue">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : atrasada ? (
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Atrasada">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        ) : null}
      </div>
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
