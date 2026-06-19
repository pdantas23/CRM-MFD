"use client";
// Filtros específicos de Pedidos: dois toggles estilizados —
// "Contas sem dar baixa" (default OFF) e "Ocultar legado" (default ON).

import { useFiltrosUrl } from "./FiltrosUrlProvider";

function Toggle({
  ligado,
  onToggle,
  children,
}: {
  ligado: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      onClick={onToggle}
      className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
        ligado
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          ligado ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            ligado ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {children}
    </button>
  );
}

export function FiltrosPedido() {
  const { aplicar, getParam } = useFiltrosUrl();

  const semBaixa = getParam("saldo") === "sem_baixa"; // "sem_baixa" | null
  // Ocultar legado é default ON: ligado a menos que legado=false na URL.
  const ocultarLegado = getParam("legado") !== "false";

  return (
    <>
      <Toggle
        ligado={semBaixa}
        onToggle={() => aplicar({ saldo: semBaixa ? undefined : "sem_baixa" })}
      >
        Contas sem dar baixa
      </Toggle>
      <Toggle
        ligado={ocultarLegado}
        onToggle={() => aplicar({ legado: ocultarLegado ? "false" : undefined })}
      >
        Ocultar legado
      </Toggle>
    </>
  );
}
