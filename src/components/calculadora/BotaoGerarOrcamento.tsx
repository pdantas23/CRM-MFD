"use client";
// Botão "Gerar orçamento": leva os itens calculados (nome genérico + quantidade)
// para o form de Novo Orçamento, onde o usuário escolhe o produto real de cada.

import { useRouter } from "next/navigation";
import { prepararItensOrcamento, type ItemOrcamentoCalc } from "@/lib/calculadora/gerarOrcamento";

export function BotaoGerarOrcamento({ itens }: { itens: ItemOrcamentoCalc[] }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        const url = prepararItensOrcamento(itens);
        if (url) router.push(url);
      }}
      className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Gerar orçamento
    </button>
  );
}
