"use client";
// Autocomplete genérico para busca de entidades VHSYS via API local.
// Encapsula debounce configurável, fetch com spinner, dropdown e seleção.
// Reaproveita o visual já existente nos modais de orçamento.

import { useCallback, useEffect, useRef, useState } from "react";

export interface AutocompleteVhsysProps<T> {
  /** Rota da API local, ex.: "/api/buscar-clientes" */
  endpoint: string;
  placeholder?: string;
  /** Número mínimo de chars para disparar a busca (padrão: 1). Use 0 para buscar ao focar. */
  minChars?: number;
  /** Debounce em ms (padrão: 150) */
  debounceMs?: number;
  /** Renderiza o conteúdo de cada opção no dropdown */
  renderOpcao: (opcao: T) => React.ReactNode;
  /** Chamado ao selecionar uma opção */
  onSelecionar: (opcao: T) => void;
  /** Valor exibido no input (controlled pelo pai) */
  value: string;
  /** Chamado sempre que o usuário digita; permite o pai limpar a seleção */
  onChange: (texto: string) => void;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteVhsys<T>({
  endpoint,
  placeholder,
  minChars = 1,
  debounceMs = 150,
  renderOpcao,
  onSelecionar,
  value,
  onChange,
  className,
  disabled,
}: AutocompleteVhsysProps<T>) {
  const [opcoes, setOpcoes] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora do componente.
  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpcoes([]);
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const buscar = useCallback(
    (q: string) => {
      if (disabled) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (q.trim().length < minChars) {
          setOpcoes([]);
          return;
        }
        setCarregando(true);
        try {
          const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`);
          if (res.ok) setOpcoes(await res.json());
        } catch {
          setOpcoes([]);
        } finally {
          setCarregando(false);
        }
      }, debounceMs);
    },
    [endpoint, minChars, debounceMs, disabled]
  );

  function selecionar(opcao: T) {
    onSelecionar(opcao);
    setOpcoes([]);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          buscar(e.target.value);
        }}
        onFocus={() => {
          if (minChars === 0) buscar(value);
        }}
        placeholder={placeholder}
        className="input-base w-full pr-8"
        autoComplete="off"
      />
      {carregando && !disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
        >
          <svg
            className="h-4 w-4 animate-spin text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      )}
      {opcoes.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {opcoes.map((opcao, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => selecionar(opcao)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                {renderOpcao(opcao)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
