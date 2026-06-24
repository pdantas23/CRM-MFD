"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarCorConta } from "@/lib/accounts/acoes";
import { deriveScale } from "@/lib/theme/cor";

interface Props {
  /** Cor primária atual da conta ativa (hex). */
  corAtual: string;
  /** Nome da conta ativa (exibido no preview). */
  nomeEmpresa: string;
}

// Classes LITERAIS (Tailwind não detecta `bg-primary-${t}` dinâmico — purge).
const SWATCHES = [
  { tom: "50", cls: "bg-primary-50" },
  { tom: "100", cls: "bg-primary-100" },
  { tom: "200", cls: "bg-primary-200" },
  { tom: "300", cls: "bg-primary-300" },
  { tom: "400", cls: "bg-primary-400" },
  { tom: "500", cls: "bg-primary-500" },
  { tom: "600", cls: "bg-primary-600" },
  { tom: "700", cls: "bg-primary-700" },
  { tom: "800", cls: "bg-primary-800" },
  { tom: "900", cls: "bg-primary-900" },
] as const;

export function CoresClient({ corAtual, nomeEmpresa }: Props) {
  const router = useRouter();
  const [cor, setCor] = useState(corAtual);
  const [salvando, startSalvar] = useTransition();
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  const hexValido = /^#[0-9a-fA-F]{6}$/.test(cor);
  const alterada = cor.toLowerCase() !== corAtual.toLowerCase();

  // CSS vars derivadas para o preview ao vivo (escopadas ao wrapper).
  const previewVars = hexValido ? (deriveScale(cor) as React.CSSProperties) : undefined;

  function normalizarHex(v: string): string {
    let h = v.trim();
    if (h && !h.startsWith("#")) h = "#" + h;
    return h;
  }

  function salvar() {
    if (!hexValido || !alterada) return;
    setFeedback(null);
    startSalvar(async () => {
      const res = await atualizarCorConta(cor);
      if (res.ok) {
        setFeedback({ tipo: "ok", msg: "Cor atualizada." });
        router.refresh();
      } else {
        setFeedback({ tipo: "erro", msg: res.erro });
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Cor do sistema</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define a cor primária aplicada na navbar, botões e destaques desta conta
          ({nomeEmpresa}). Facilita distinguir visualmente em qual conta você opera.
        </p>
      </div>

      {/* Seletor */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Cor primária</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={hexValido ? cor : "#1a73e8"}
              onChange={(e) => setCor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
              aria-label="Seletor de cor"
            />
            <input
              type="text"
              value={cor}
              onChange={(e) => setCor(normalizarHex(e.target.value))}
              placeholder="#1a73e8"
              spellCheck={false}
              className="input-base w-32 font-mono"
            />
          </div>
          {!hexValido && (
            <p className="mt-1 text-xs text-red-600">Formato inválido — use #RRGGBB.</p>
          )}
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={!hexValido || !alterada || salvando}
          className="btn-primary"
        >
          {salvando ? "Salvando..." : "Salvar cor"}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.tipo === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Preview ao vivo */}
      <div style={previewVars} className="space-y-4 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Pré-visualização</p>

        {/* Escala de tons */}
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          {SWATCHES.map((s) => (
            <div key={s.tom} className={`h-10 flex-1 ${s.cls}`} title={`primary-${s.tom}`} />
          ))}
        </div>

        {/* Amostra navbar + botões */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 bg-primary-900 px-4 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600">
              <span className="text-xs font-bold text-white">
                {nomeEmpresa.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="truncate text-sm font-semibold text-white">{nomeEmpresa}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
            <span className="inline-flex h-9 items-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white">
              Botão primário
            </span>
            <span className="text-sm font-medium text-primary-600">Link em destaque</span>
            <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800">
              Badge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
