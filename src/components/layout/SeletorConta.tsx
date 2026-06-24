"use client";

import { useState } from "react";
import { selecionarConta } from "@/lib/accounts/acoes";

export interface ContaOpcao {
  id: string;
  slug: string;
  nomeEmpresa: string | null;
  themeColor: string;
}

interface SeletorContaProps {
  contas: ContaOpcao[];
  slugAtivo: string;
}

/**
 * Dropdown de troca de conta ativa (sidebar). Só aparece quando o usuário tem
 * acesso a mais de uma conta. Cada item submete a Server Action que troca o
 * cookie e recarrega.
 */
export function SeletorConta({ contas, slugAtivo }: SeletorContaProps) {
  const [aberto, setAberto] = useState(false);
  if (contas.length <= 1) return null;

  const ativa = contas.find((c) => c.slug === slugAtivo);

  return (
    <div className="relative mb-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary-100 transition-colors hover:bg-primary-800"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-white/30"
          style={{ backgroundColor: ativa?.themeColor }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {ativa?.nomeEmpresa ?? ativa?.slug ?? "Conta"}
          {ativa?.nomeEmpresa && (
            <span className="ml-1 font-mono text-xs uppercase text-primary-300">({ativa.slug})</span>
          )}
        </span>
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {contas.map((conta) => (
            <form key={conta.id} action={selecionarConta.bind(null, conta.slug)}>
              <button
                type="submit"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                  conta.slug === slugAtivo ? "font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: conta.themeColor }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  {conta.nomeEmpresa ?? conta.slug}
                </span>
                <span className="shrink-0 font-mono text-xs uppercase text-gray-400">{conta.slug}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
