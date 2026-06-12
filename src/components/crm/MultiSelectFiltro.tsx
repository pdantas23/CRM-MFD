"use client";
// Multi-select com checkboxes num popover. Fecha ao clicar fora ou Escape.
// Mesmo padrão visual do DropdownFiltro.

import { useState, useRef, useEffect } from "react";

export interface OpcaoMulti {
  valor: string;
  label: string;
}

interface MultiSelectFiltroProps {
  label: string;
  opcoes: OpcaoMulti[];
  /** Valores selecionados. */
  selecionados: string[];
  /** Chamado com a nova lista de selecionados. */
  onChange: (valores: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFiltro({
  label,
  opcoes,
  selecionados,
  onChange,
  placeholder = "Todas",
}: MultiSelectFiltroProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [aberto]);

  const ativo = selecionados.length > 0;
  const resumo = ativo
    ? selecionados.length === 1
      ? (opcoes.find((o) => o.valor === selecionados[0])?.label ?? placeholder)
      : `${selecionados.length} selecionadas`
    : placeholder;

  const listboxId = `multi-${label.replace(/\s+/g, "-").toLowerCase()}`;

  function alternar(valor: string) {
    if (selecionados.includes(valor)) {
      onChange(selecionados.filter((v) => v !== valor));
    } else {
      onChange([...selecionados, valor]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listboxId}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
          ativo
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="text-xs text-gray-400">{label}:</span>
        <span>{resumo}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {aberto && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-1 max-h-80 min-w-[200px] overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {ativo && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-b border-gray-100 px-4 py-2 text-left text-xs font-medium text-blue-700 hover:bg-gray-50"
            >
              Limpar seleção
            </button>
          )}
          {opcoes.map((op) => {
            const marcado = selecionados.includes(op.valor);
            return (
              <label
                key={op.valor}
                role="option"
                aria-selected={marcado}
                className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(op.valor)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{op.label}</span>
              </label>
            );
          })}
          {opcoes.length === 0 && (
            <p className="px-4 py-2 text-sm text-gray-400">Sem opções</p>
          )}
        </div>
      )}
    </div>
  );
}
