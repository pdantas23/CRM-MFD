"use client";
// Dropdown de filtro customizado — substitui <select> nativo.
// Fecha ao clicar fora ou pressionar Escape.

import { useState, useRef, useEffect } from "react";

export interface OpcaoFiltro {
  valor: string;
  label: string;
}

interface DropdownFiltroProps {
  label: string;
  opcoes: OpcaoFiltro[];
  valorAtual: string | undefined;
  /** Chamado quando o usuário seleciona uma opção. undefined = limpar filtro. */
  onChange: (valor: string | undefined) => void;
  placeholder?: string;
}

export function DropdownFiltro({
  label,
  opcoes,
  valorAtual,
  onChange,
  placeholder = "Todos",
}: DropdownFiltroProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [aberto]);

  // Fecha com Escape
  useEffect(() => {
    if (!aberto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [aberto]);

  const labelAtual = valorAtual
    ? (opcoes.find((o) => o.valor === valorAtual)?.label ?? placeholder)
    : placeholder;

  const ativo = Boolean(valorAtual);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          ativo
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="text-xs text-gray-400">{label}:</span>
        <span>{labelAtual}</span>
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
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {/* Opção "Todos" para limpar filtro */}
          <button
            type="button"
            onClick={() => { onChange(undefined); setAberto(false); }}
            className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
              !valorAtual ? "font-semibold text-blue-700" : "text-gray-700"
            }`}
          >
            {placeholder}
          </button>
          {opcoes.map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => { onChange(op.valor); setAberto(false); }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                valorAtual === op.valor ? "font-semibold text-blue-700" : "text-gray-700"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
