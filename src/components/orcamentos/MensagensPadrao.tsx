"use client";

import { useRef, useState } from "react";
import { MENSAGENS_PADRAO } from "@/lib/orcamentos/mensagens-padrao";

interface Props {
  onSelecionar: (texto: string) => void;
}

export function MensagensPadrao({ onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleSelecionar(texto: string) {
    onSelecionar(texto);
    setAberto(false);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        ref={btnRef}
        onClick={() => setAberto((prev) => !prev)}
        className="mt-1 text-xs text-primary-600 hover:text-primary-800 underline underline-offset-2"
      >
        Mensagens padrões
      </button>

      {aberto && (
        <>
          {/* Overlay invisível para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setAberto(false)}
          />

          <ul
            role="listbox"
            className="absolute left-0 z-20 mt-1 w-80 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {MENSAGENS_PADRAO.map((msg, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelecionar(msg)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800"
                >
                  {msg}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
