"use client";
// Botão "Emitir Pedido" para orçamentos aprovados (situacao 768)
// sem pedido_emitido. Exige role='admin' (verificado no Server Component pai
// — este componente só é renderizado quando isAdmin=true).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitirPedidoDeOrcamento } from "@/lib/vhsys/acoes";

interface BotaoEmitirPedidoProps {
  idOrcamentoVhsys: number;
  numeroOrcamento: number;
}

export function BotaoEmitirPedido({ idOrcamentoVhsys, numeroOrcamento }: BotaoEmitirPedidoProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      const resultado = await emitirPedidoDeOrcamento(idOrcamentoVhsys);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Erro ao emitir pedido.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? "Emitindo…" : "Emitir Pedido"}
      </button>
      {erro && (
        <p className="max-w-xs text-xs text-red-600" title={`Orçamento #${numeroOrcamento}: ${erro}`}>
          {erro.length > 80 ? erro.slice(0, 80) + "…" : erro}
        </p>
      )}
    </div>
  );
}
