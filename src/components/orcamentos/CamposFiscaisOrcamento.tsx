"use client";
// Seção fiscal colapsável do orçamento: ICMS, ST, IPI, pesos.
// Collapsed por padrão para não poluir o form.

import { useState } from "react";

export interface CamposFiscaisValue {
  baseICMS: string;
  valorICMS: string;
  baseST: string;
  valorST: string;
  valorIPI: string;
  pesoTotal: string;
  pesoTotalLiq: string;
}

interface Props {
  value: CamposFiscaisValue;
  onChange: (v: CamposFiscaisValue) => void;
}

export function CamposFiscaisOrcamento({ value, onChange }: Props) {
  const [aberto, setAberto] = useState(false);

  function set<K extends keyof CamposFiscaisValue>(k: K, v: CamposFiscaisValue[K]) {
    onChange({ ...value, [k]: v });
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>Dados fiscais (opcional)</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {aberto && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Base ICMS (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.baseICMS}
                onChange={(e) => set("baseICMS", e.target.value)}
                placeholder="0.00"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Valor ICMS (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.valorICMS}
                onChange={(e) => set("valorICMS", e.target.value)}
                placeholder="0.00"
                className="input-base w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Base ST (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.baseST}
                onChange={(e) => set("baseST", e.target.value)}
                placeholder="0.00"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Valor ST (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.valorST}
                onChange={(e) => set("valorST", e.target.value)}
                placeholder="0.00"
                className="input-base w-full"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Valor IPI (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.valorIPI}
              onChange={(e) => set("valorIPI", e.target.value)}
              placeholder="0.00"
              className="input-base w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Peso bruto (kg)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={value.pesoTotal}
                onChange={(e) => set("pesoTotal", e.target.value)}
                placeholder="0.000"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Peso líquido (kg)</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={value.pesoTotalLiq}
                onChange={(e) => set("pesoTotalLiq", e.target.value)}
                placeholder="0.000"
                className="input-base w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
