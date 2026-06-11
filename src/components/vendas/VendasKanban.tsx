"use client";

import { useState } from "react";
import { VendaCard } from "./VendaCard";
import { formatBRL } from "@/lib/vendas/format";
import type { StatusVenda, Venda } from "@/lib/types/vendas";

interface VendasKanbanProps {
  vendas: Venda[];
  onCardClick: (venda: Venda) => void;
  onStatusChange: (id: string, status: StatusVenda) => void;
  onCadastrarEntrega: (venda: Venda) => void;
}

const colunas: { status: StatusVenda; titulo: string; headerClass: string }[] = [
  { status: "aguardando_pagamento", titulo: "Aguardando Pagamento", headerClass: "border-amber-300" },
  { status: "pagamento_parcial", titulo: "Pagamento Parcial", headerClass: "border-blue-300" },
  { status: "pagamento_completo", titulo: "Pagamento Completo", headerClass: "border-green-300" },
];

export function VendasKanban({
  vendas,
  onCardClick,
  onStatusChange,
  onCadastrarEntrega,
}: VendasKanbanProps) {
  const [dragOver, setDragOver] = useState<StatusVenda | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {colunas.map((coluna) => {
        const daColuna = vendas.filter((v) => v.status === coluna.status);
        const total = daColuna.reduce((acc, v) => acc + v.valor_total, 0);

        return (
          <div
            key={coluna.status}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOver(coluna.status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOver(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) onStatusChange(id, coluna.status);
            }}
            className={`flex min-h-[200px] flex-col rounded-lg border bg-gray-100/60 transition-colors ${
              dragOver === coluna.status
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200"
            }`}
          >
            <div className={`border-b-2 px-4 py-3 ${coluna.headerClass}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {coluna.titulo}
                </h2>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-600 shadow-sm">
                  {daColuna.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{formatBRL(total)}</p>
            </div>

            <div className="flex-1 space-y-3 p-3">
              {daColuna.map((venda) => (
                <VendaCard
                  key={venda.id}
                  venda={venda}
                  onClick={onCardClick}
                  onCadastrarEntrega={onCadastrarEntrega}
                />
              ))}
              {daColuna.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-gray-400">
                  Nenhuma venda neste status
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
