"use client";

import { useState } from "react";
import { PedidosKanban } from "./PedidosKanban";
import { PedidoModal } from "./PedidoModal";
import { PedidosCalendario } from "./PedidosCalendario";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltrosPedido } from "@/components/crm/FiltrosPedido";
import type { Metrica } from "@/lib/crm/metricas";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { PedidoKanban, PedidoRow, SituacaoRow } from "@/lib/types/pedidos";

type ViewAtual = "kanban" | "calendario";

interface PedidosViewProps {
  situacoes: SituacaoRow[];
  pedidos: PedidoKanban[];
  /** true = admin ou vendedor — pode ver controles de mover situação */
  podeEscrever?: boolean;
  /** Por situacao_id, indica se atingiu o limite de 50 itens */
  atingiuLimitePorSituacao?: Record<number, boolean>;
  /** Lista de vendedores para o filtro de busca */
  vendedores?: { id_vhsys: number; nome: string }[];
  /** Exibir dropdown de vendedor (false para role=vendedor) */
  mostrarFiltroVendedor?: boolean;
  /** Filtros parseados pelo server (fonte de verdade da toolbar). */
  filtros: FiltrosCrm;
  /** Métricas agregadas do conjunto filtrado. */
  metricas: Metrica[];
}

export function PedidosView({
  situacoes,
  pedidos,
  podeEscrever,
  atingiuLimitePorSituacao = {},
  vendedores = [],
  mostrarFiltroVendedor = false,
  filtros,
  metricas,
}: PedidosViewProps) {
  const [selecionado, setSelecionado] = useState<PedidoKanban | null>(null);
  const [viewAtual, setViewAtual] = useState<ViewAtual>("kanban");

  // Mês/ano atual para o calendário
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1-based

  // Pedidos sem financeiro para o calendário (Server Action busca os do mês)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pedidosBase: PedidoRow[] = pedidos.map(({ financeiro: _f, cliente: _c, entregaRegistrada: _e, ...p }) => p);

  // Situações reais da entidade para o multi-select da toolbar.
  const opcoesSituacao = situacoes.map((s) => ({ id: s.id_vhsys, nome: s.nome }));

  return (
    <>
      <EntityToolbar
        filtros={filtros}
        situacoes={opcoesSituacao}
        vendedores={vendedores}
        mostrarVendedor={mostrarFiltroVendedor}
        filtroEspecifico={<FiltrosPedido />}
        acaoPrimaria={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewAtual("kanban")}
              className={viewAtual === "kanban" ? "btn-primary" : "btn-secondary"}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewAtual("calendario")}
              className={viewAtual === "calendario" ? "btn-primary" : "btn-secondary"}
            >
              Calendário
            </button>
          </div>
        }
      />

      <EntityMetrics metricas={metricas} />

      {viewAtual === "kanban" && (
        <PedidosKanban
          situacoes={situacoes}
          pedidos={pedidos}
          onCardClick={setSelecionado}
          atingiuLimitePorSituacao={atingiuLimitePorSituacao}
        />
      )}

      {viewAtual === "calendario" && (
        <PedidosCalendario
          pedidosIniciais={pedidosBase}
          anoInicial={anoAtual}
          mesInicial={mesAtual}
          situacoes={situacoes}
          onPedidoClick={setSelecionado}
        />
      )}

      {selecionado && (
        <PedidoModal
          pedido={selecionado}
          situacoes={situacoes}
          onClose={() => setSelecionado(null)}
          podeEscrever={podeEscrever}
        />
      )}
    </>
  );
}
