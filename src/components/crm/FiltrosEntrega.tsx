"use client";
// Filtros específicos de Entregas:
// - Dropdown de período do dia (Manhã/Tarde/Noite)
// - Toggle "Só com saldo a receber" (pedido vinculado com saldo > 0)

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";

const OPCOES_PERIODO: OpcaoFiltro[] = [
  { valor: "manha", label: "Manhã" },
  { valor: "tarde", label: "Tarde" },
  { valor: "noite", label: "Noite" },
];

export function FiltrosEntrega() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodoAtual = searchParams.get("periodo_entrega") ?? undefined;
  const comSaldo = searchParams.get("com_saldo") === "true";

  function aplicar(mudancas: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <DropdownFiltro
        label="Período"
        opcoes={OPCOES_PERIODO}
        valorAtual={periodoAtual}
        onChange={(v) => aplicar({ periodo_entrega: v })}
        placeholder="Manhã e Tarde"
      />

      <button
        type="button"
        role="switch"
        aria-checked={comSaldo}
        onClick={() => aplicar({ com_saldo: comSaldo ? undefined : "true" })}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
          comSaldo
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span
          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            comSaldo ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              comSaldo ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </span>
        Só com saldo a receber
      </button>
    </>
  );
}
