"use client";

import { formatBRL, formatarData } from "@/lib/format";
import { SITUACAO_APROVADO } from "@/lib/vhsys/fluxo-orcamentos";
import type { OrcamentoRow } from "@/lib/types/pedidos";

interface OrcamentoCardProps {
  orcamento: OrcamentoRow;
  onClick: (orcamento: OrcamentoRow) => void;
  /** Abre o formulário de emissão de pedido (orçamentos aprovados, não emitidos). */
  onEmitir?: (orcamento: OrcamentoRow) => void;
}

export function OrcamentoCard({ orcamento, onClick, onEmitir }: OrcamentoCardProps) {
  const podeEmitir =
    orcamento.situacao_id === SITUACAO_APROVADO &&
    !orcamento.pedido_emitido &&
    !!onEmitir;

  return (
    <div
      onClick={() => onClick(orcamento)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{orcamento.nome_cliente}</p>
        <span className="shrink-0 text-xs font-semibold text-gray-500">
          #{orcamento.numero}
        </span>
      </div>

      {/* sempre reserva a linha do vendedor (invisível quando ausente) para
          manter todos os cards com a mesma altura */}
      <p className={`text-xs text-gray-500 ${orcamento.vendedor_nome ? "" : "invisible"}`}>
        {orcamento.vendedor_nome || "—"}
      </p>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm font-bold text-gray-900">
          {formatBRL(orcamento.valor_total ?? 0)}
        </span>
        {orcamento.data_orcamento && (
          <span className="text-xs text-gray-500">
            {formatarData(orcamento.data_orcamento)}
          </span>
        )}
      </div>

      {/* o selo é sempre renderizado e reserva espaço (invisível quando o
          pedido não foi emitido) — assim os cards de todas as colunas têm a
          mesma altura, igual ao maior (com selo) */}
      <span
        aria-hidden={!orcamento.pedido_emitido}
        className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${
          orcamento.pedido_emitido
            ? "border-green-200 bg-green-50 text-green-700"
            : "invisible border-transparent"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Pedido emitido
      </span>

      {/* Botão de emissão direta no card (orçamentos aprovados não emitidos).
          stopPropagation evita disparar o onClick do card (abre o detalhe). */}
      {podeEmitir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEmitir!(orcamento);
          }}
          className="mt-2 w-full rounded-md bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-800"
        >
          Emitir Pedido
        </button>
      )}
    </div>
  );
}
