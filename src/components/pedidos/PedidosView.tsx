"use client";

import { useState } from "react";
import { PedidosKanban } from "./PedidosKanban";
import { PedidoModal } from "./PedidoModal";
import type { PedidoKanban, SituacaoRow } from "@/lib/types/pedidos";

interface PedidosViewProps {
  situacoes: SituacaoRow[];
  pedidos: PedidoKanban[];
}

export function PedidosView({ situacoes, pedidos }: PedidosViewProps) {
  const [selecionado, setSelecionado] = useState<PedidoKanban | null>(null);

  return (
    <>
      <PedidosKanban
        situacoes={situacoes}
        pedidos={pedidos}
        onCardClick={setSelecionado}
      />
      {selecionado && (
        <PedidoModal
          pedido={selecionado}
          situacoes={situacoes}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  );
}
