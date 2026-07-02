"use client";

import { useState } from "react";
import { PedidosKanban } from "./PedidosKanban";
import { PedidoModal } from "./PedidoModal";
import { PedidosCalendario } from "./PedidosCalendario";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltrosPedido } from "@/components/crm/FiltrosPedido";
import { FiltrosUrlProvider } from "@/components/crm/FiltrosUrlProvider";
import { OverlayCarregando } from "@/components/crm/OverlayCarregando";
import { ViewToggle } from "@/components/crm/ViewToggle";
import { EntityTable, type ColunaTabela } from "@/components/crm/EntityTable";
import { formatBRL, formatarData } from "@/lib/format";
import type { ModeloSituacoes } from "@/lib/vhsys/situacoes-modelo";
import type { Metrica } from "@/lib/crm/metricas";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { PedidoKanban, PedidoRow, SituacaoRow } from "@/lib/types/pedidos";

type ViewAtual = "kanban" | "lista" | "calendario";

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
  /** Modelo de situações da conta (colunas/segmentos/gate data-driven). */
  modelo: ModeloSituacoes;
  /** true (vendedor): não pode mover para pagamento parcial/aprovado. */
  restricaoPagamento?: boolean;
  /** true (admin/superadmin): pode cadastrar entrega a partir do pedido. */
  podeCadastrarEntrega?: boolean;
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
  modelo,
  restricaoPagamento = false,
  podeCadastrarEntrega = false,
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

  // Mapa de situação por id para o badge na visão Lista.
  const situacaoPorId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  // Colunas da visão Lista.
  const colunasLista: ColunaTabela<PedidoKanban>[] = [
    {
      header: "Nº",
      render: (p) => (
        <span className="font-semibold text-gray-900">#{p.numero}</span>
      ),
      tdClassName: "text-gray-900",
    },
    {
      header: "Cliente",
      render: (p) => <span className="text-gray-900">{p.nome_cliente}</span>,
    },
    {
      header: "Vendedor",
      render: (p) => <span className="text-gray-500">{p.vendedor_nome ?? "—"}</span>,
    },
    {
      header: "Data",
      render: (p) => (
        <span className="text-gray-500">
          {p.data_pedido ? formatarData(p.data_pedido) : "—"}
        </span>
      ),
    },
    {
      header: "Valor",
      align: "right",
      render: (p) => (
        <span className="font-medium text-gray-900">{formatBRL(p.valor_total ?? 0)}</span>
      ),
    },
    {
      header: "Situação",
      render: (p) => {
        const situacao = p.situacao_id ? situacaoPorId.get(p.situacao_id) : null;
        return (
          <span className="inline-flex items-center whitespace-nowrap rounded-full border bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border-gray-200">
            {situacao?.nome ?? p.status_base ?? "—"}
          </span>
        );
      },
    },
    {
      header: "Saldo",
      align: "right",
      render: (p) => {
        const fin = p.financeiro;
        const temContas = !!fin && fin.total_contas > 0;
        const saldo = fin?.saldo ?? 0;
        // Valor ainda em aberto: o saldo das contas ou, se nenhuma conta foi
        // lançada, o total do pedido (nada confirmado como recebido no VHSYS).
        const emAberto = temContas ? saldo : (p.valor_total ?? 0);
        // ALERTA (vermelho): pagamento aprovado, mas o VHSYS ainda não confirmou
        // a liquidação — sinaliza ao admin que falta dar baixa no pagamento.
        if (p.situacao_id === modelo.pagamentoAprovadoId && emAberto > 0) {
          return <span className="font-semibold text-red-700">{formatBRL(emAberto)}</span>;
        }
        // Sem contas lançadas e fora do estado aprovado: nada a exibir.
        if (!temContas) return <span className="text-gray-400">—</span>;
        // Saldo a prazo a receber.
        if (saldo > 0) {
          return (
            <span className="font-semibold text-amber-700">{formatBRL(saldo)}</span>
          );
        }
        return <span className="text-green-700 font-medium">Quitado</span>;
      },
    },
  ];

  return (
    <FiltrosUrlProvider>
      <EntityToolbar
        filtros={filtros}
        situacoes={opcoesSituacao}
        vendedores={vendedores}
        mostrarVendedor={mostrarFiltroVendedor}
        filtroEspecifico={<FiltrosPedido />}
        acaoPrimaria={
          <ViewToggle
            opcoes={[
              { valor: "kanban", label: "Kanban" },
              { valor: "lista", label: "Lista" },
              { valor: "calendario", label: "Calendário" },
            ]}
            valor={viewAtual}
            onChange={(v) => setViewAtual(v as ViewAtual)}
          />
        }
      />

      <OverlayCarregando>
        <EntityMetrics metricas={metricas} />

        {viewAtual === "kanban" && (
          <PedidosKanban
            situacoes={situacoes}
            pedidos={pedidos}
            onCardClick={setSelecionado}
            atingiuLimitePorSituacao={atingiuLimitePorSituacao}
            podeEscrever={podeEscrever}
            modelo={modelo}
            restricaoPagamento={restricaoPagamento}
            podeCadastrarEntrega={podeCadastrarEntrega}
          />
        )}

        {viewAtual === "lista" && (
          <EntityTable<PedidoKanban>
            colunas={colunasLista}
            rows={pedidos}
            getRowKey={(p) => p.id}
            onRowClick={(p) => setSelecionado(p)}
            emptyMessage="Nenhum pedido encontrado com estes filtros."
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
      </OverlayCarregando>

      {selecionado && (
        <PedidoModal
          pedido={selecionado}
          situacoes={situacoes}
          onClose={() => setSelecionado(null)}
          podeEscrever={podeEscrever}
          modelo={modelo}
          restricaoPagamento={restricaoPagamento}
          podeCadastrarEntrega={podeCadastrarEntrega}
        />
      )}
    </FiltrosUrlProvider>
  );
}
