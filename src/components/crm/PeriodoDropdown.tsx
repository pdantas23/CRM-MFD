"use client";
// Dropdown de período: presets + range custom num popover.
// Fecha ao clicar fora ou Escape. Mesmo padrão visual do DropdownFiltro.

import { useState, useRef, useEffect } from "react";
import type { PeriodoPreset } from "@/lib/crm/filtros";

interface PeriodoDropdownProps {
  /** Preset ativo (null quando há range custom). */
  preset: PeriodoPreset | null;
  /** Datas custom resolvidas (para exibir e preencher os inputs). */
  dataDe: string | null;
  dataAte: string | null;
  /** Aplica um preset (limpa data_de/data_ate). */
  onPreset: (preset: PeriodoPreset) => void;
  /** Aplica um range custom (limpa periodo). */
  onCustom: (de: string, ate: string) => void;
  /** Prefixo do rótulo do trigger. Default: "Período". */
  rotuloPrefixo?: string;
  /** Rótulo quando nada selecionado. Default: igual a rotuloPrefixo. */
  rotuloVazio?: string;
  /** Se informado, exibe opção "Limpar" no popover (volta a "qualquer data"). */
  onLimpar?: () => void;
}

const PRESETS: { valor: PeriodoPreset; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "7d", label: "7 dias" },
  { valor: "30d", label: "30 dias" },
  { valor: "90d", label: "90 dias" },
  { valor: "ano", label: "Este ano" },
  { valor: "tudo", label: "Tudo" },
];

function rotuloPreset(p: PeriodoPreset): string {
  return PRESETS.find((x) => x.valor === p)?.label ?? "Período";
}

export function PeriodoDropdown({
  preset,
  dataDe,
  dataAte,
  onPreset,
  onCustom,
  rotuloPrefixo = "Período",
  rotuloVazio,
  onLimpar,
}: PeriodoDropdownProps) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(dataDe ?? "");
  const [ate, setAte] = useState(dataAte ?? "");
  const ref = useRef<HTMLDivElement>(null);

  // Sincroniza inputs locais quando as datas externas mudam.
  useEffect(() => setDe(dataDe ?? ""), [dataDe]);
  useEffect(() => setAte(dataAte ?? ""), [dataAte]);

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

  const vazio = !preset && !dataDe && !dataAte;
  const rotulo = preset
    ? rotuloPreset(preset)
    : dataDe || dataAte
      ? `${dataDe ?? "…"} – ${dataAte ?? "…"}`
      : (rotuloVazio ?? rotuloPrefixo);

  function aplicarCustom() {
    if (!de && !ate) return;
    onCustom(de, ate || de);
    setAberto(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
          vazio && onLimpar
            ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "border-primary-600 bg-primary-50 text-primary-700 hover:bg-primary-100"
        }`}
      >
        <span className={`text-xs ${vazio && onLimpar ? "text-gray-400" : "text-primary-400"}`}>
          {rotuloPrefixo}:
        </span>
        <span>{rotulo}</span>
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
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => {
                  onPreset(p.valor);
                  setAberto(false);
                }}
                className={`rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                  preset === p.valor ? "font-semibold text-primary-700" : "text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Personalizado</p>
            <div className="flex flex-col gap-1.5">
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
              />
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={aplicarCustom}
                className="btn-primary !h-8 text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>

          {onLimpar && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => {
                  onLimpar();
                  setAberto(false);
                }}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                Qualquer data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
