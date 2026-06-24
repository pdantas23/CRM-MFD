"use client";
// Filtros específicos de Pedidos: dois toggles estilizados —
// "Contas sem dar baixa" (default OFF) e "Ocultar legado" (default ON) —
// mais o seletor "Atualizadas em" (intervalo sobre a data da última mudança
// de situação, params sit_de/sit_ate). Tudo otimista via useFiltrosUrl.

import { useFiltrosUrl } from "./FiltrosUrlProvider";
import { PeriodoDropdown } from "./PeriodoDropdown";
import { resolverPreset, type PeriodoPreset } from "@/lib/crm/filtros";

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
          ? "border-primary-600 bg-primary-50 text-primary-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          ligado ? "bg-primary-600" : "bg-gray-300"
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

  // "Atualizadas em": intervalo sobre data_situacao (sit_de/sit_ate). Sempre
  // gravamos datas concretas (preset null no dropdown) — o rótulo mostra o
  // intervalo; vazio = qualquer data.
  const sitDe = getParam("sit_de") ?? null;
  const sitAte = getParam("sit_ate") ?? null;

  function aplicarPreset(preset: PeriodoPreset) {
    const r = resolverPreset(preset);
    aplicar({ sit_de: r.de ?? undefined, sit_ate: r.ate ?? undefined });
  }
  function aplicarCustom(de: string, ate: string) {
    aplicar({ sit_de: de || undefined, sit_ate: ate || undefined });
  }
  function limparAtualizadas() {
    aplicar({ sit_de: undefined, sit_ate: undefined });
  }

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
      <PeriodoDropdown
        preset={null}
        dataDe={sitDe}
        dataAte={sitAte}
        onPreset={aplicarPreset}
        onCustom={aplicarCustom}
        rotuloPrefixo="Atualizadas em"
        rotuloVazio="Qualquer data"
        onLimpar={limparAtualizadas}
      />
    </>
  );
}
