"use client";
// Mostra um arquivo (imagem ou PDF) num modal, sem abrir outra aba. Usado para
// comprovantes (pagamento ao montador, entrega do pedido). Fecha com Esc ou
// clique fora; o Esc não chega aos modais de baixo (data-submodal).

import { useEffect, useRef, useState } from "react";

export function VisualizadorArquivo({
  url,
  nome,
  pdf,
  onFechar,
}: {
  url: string;
  nome: string | null;
  /** Força PDF; sem isso, deduz pelo nome/URL. */
  pdf?: boolean;
  onFechar: () => void;
}) {
  const ehPdf = pdf ?? (/\.pdf$/i.test(nome ?? "") || /\.pdf(\?|$)/i.test(url));
  const [falhou, setFalhou] = useState(false);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        fechar.current();
      }
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, []);

  return (
    <div
      data-submodal
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{nome ?? "Arquivo"}</h3>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary-700 hover:underline">
            Abrir em nova aba
          </a>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-100">
          {ehPdf ? (
            <iframe src={url} title={nome ?? "Arquivo"} className="h-full w-full" />
          ) : falhou ? (
            <p className="px-4 text-center text-sm text-gray-600">
              Não foi possível exibir este arquivo aqui (o formato HEIC, do iPhone, não abre em todos os navegadores). Use
              “Abrir em nova aba”.
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária, fora do otimizador do Next
            <img src={url} alt={nome ?? "Arquivo"} onError={() => setFalhou(true)} className="max-h-full max-w-full object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}
