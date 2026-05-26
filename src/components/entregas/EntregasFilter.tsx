"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Select } from "@/components/ui/Select";

const periodoOptions = [
  { value: "", label: "Todos os períodos" },
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
];

const statusOptions = [
  { value: "", label: "Todos os status" },
  { value: "entrega_final", label: "Entrega Final" },
  { value: "entrega_parcial", label: "Entrega Parcial" },
];

export function EntregasFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/entregas?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasFilters =
    !!searchParams.get("data") ||
    !!searchParams.get("periodo") ||
    !!searchParams.get("status") ||
    !!searchParams.get("q");

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar cliente, bairro, endereço, orçamento..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => update("q", e.target.value)}
          aria-label="Buscar"
          className="input-base flex-1"
        />
        <button
          type="button"
          onClick={() => router.push("/entregas")}
          disabled={!hasFilters}
          aria-label="Limpar filtros"
          title="Limpar filtros"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="date"
          defaultValue={searchParams.get("data") ?? ""}
          onChange={(e) => update("data", e.target.value)}
          aria-label="Filtrar por data"
          className="input-base"
        />

        <Select
          options={periodoOptions}
          value={searchParams.get("periodo") ?? ""}
          onChange={(v) => update("periodo", v)}
          ariaLabel="Filtrar por período"
        />

        <Select
          options={statusOptions}
          value={searchParams.get("status") ?? ""}
          onChange={(v) => update("status", v)}
          ariaLabel="Filtrar por status"
        />
      </div>
    </div>
  );
}
