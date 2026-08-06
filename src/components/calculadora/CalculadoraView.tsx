"use client";
// Aba Calculadora, dividida em duas: Preço de venda (precificação por lucro) e
// Quantidade por obra (planejamento por metragem — a implementar depois).

import { useState } from "react";
import { CalculadoraPrecoVenda } from "./CalculadoraPrecoVenda";

const ABAS = [
  { id: "preco", label: "Preço de venda" },
  { id: "quantidade", label: "Quantidade por obra" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

export function CalculadoraView() {
  const [aba, setAba] = useState<AbaId>("preco");

  return (
    <div className="space-y-6">
      <nav className="flex gap-1 border-b border-gray-200">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
              aba === a.id
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {a.label}
          </button>
        ))}
      </nav>

      {aba === "preco" && <CalculadoraPrecoVenda />}

      {aba === "quantidade" && (
        <div className="card px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-700">Quantidade por obra</p>
          <p className="mt-1 text-sm text-gray-400">
            Cálculo de materiais por metragem — em desenvolvimento.
          </p>
        </div>
      )}
    </div>
  );
}
