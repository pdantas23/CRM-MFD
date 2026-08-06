"use client";
// Aba Calculadora, dividida em duas: Quantidade de produtos (planejamento de
// materiais por metragem) e Preço de venda (precificação por lucro).

import { useState } from "react";
import { CalculadoraPrecoVenda } from "./CalculadoraPrecoVenda";
import { CalculadoraQuantidade } from "./CalculadoraQuantidade";

const ABAS = [
  { id: "quantidade", label: "Quantidade de produtos" },
  { id: "preco", label: "Preço de venda" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

export function CalculadoraView() {
  const [aba, setAba] = useState<AbaId>("quantidade");

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

      {aba === "quantidade" && <CalculadoraQuantidade />}
    </div>
  );
}
