"use client";

import { useRouter } from "next/navigation";
import { PedidoCard } from "./PedidoCard";
import { COLUNAS_KANBAN, SEGMENTO_PAGAMENTO, SITUACAO } from "@/lib/vhsys/fluxo";
import { buscarMaisPedidos } from "@/lib/vhsys/acoes-pedidos";
import { moverSituacaoPedido } from "@/lib/vhsys/acoes";
import { KanbanBoard, type KanbanColuna } from "@/components/crm/KanbanBoard";
import type { PedidoKanban, SituacaoRow } from "@/lib/types/pedidos";

interface PedidosKanbanProps {
  situacoes: SituacaoRow[];
  pedidos: PedidoKanban[];
  onCardClick: (pedido: PedidoKanban) => void;
  /** Indica quais colunas atingiram o limite de 50 itens */
  atingiuLimitePorSituacao?: Record<number, boolean>;
  /** Habilita drag-and-drop para mover situação */
  podeEscrever?: boolean;
}

// Colunas dinâmicas: nomes/ordem vêm do espelho de situações da conta
// (GET /situacoes); o fluxo (quais entram e em que sequência) vem de
// COLUNAS_KANBAN. 778 (Cancelado) fica fora do quadro.
export function PedidosKanban({
  situacoes,
  pedidos,
  onCardClick,
  atingiuLimitePorSituacao = {},
  podeEscrever,
}: PedidosKanbanProps) {
  const router = useRouter();
  const porId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  const colunas: KanbanColuna[] = COLUNAS_KANBAN.filter((id) => porId.has(id)).map((id) => {
    const situacao = porId.get(id)!;
    const ehPagamento = SEGMENTO_PAGAMENTO.has(id);
    return {
      id,
      nome: situacao.nome,
      segmentoLabel: ehPagamento ? "Pagamento" : "Entrega",
      segmentoCor: ehPagamento ? "border-amber-300" : "border-blue-300",
    };
  });

  async function handleCarregarMais(
    situacaoId: number,
    offset: number
  ): Promise<{ itens: PedidoKanban[]; erro?: boolean }> {
    const resultado = await buscarMaisPedidos(situacaoId, offset);
    if (resultado.erro) return { itens: [], erro: true };
    const itens: PedidoKanban[] = resultado.pedidos.map((p) => ({
      ...p,
      financeiro: null,
      cliente: null,
      entregaRegistrada: false,
      cobrancaNaEntrega: false,
      parcelas: [],
    }));
    return { itens };
  }

  return (
    <KanbanBoard<PedidoKanban>
      colunas={colunas}
      itens={pedidos}
      getColunaId={(p) => p.situacao_id}
      getId={(p) => p.id}
      getValor={(p) => p.valor_total ?? 0}
      renderCard={(p) => <PedidoCard pedido={p} onClick={onCardClick} />}
      atingiuLimitePorColuna={atingiuLimitePorSituacao}
      carregarMais={handleCarregarMais}
      mensagemVazio="Nenhum pedido nesta situação"
      // Pedido entregue é situação final — não pode ser arrastado para outra coluna.
      podeMoverItem={(p) => p.situacao_id !== SITUACAO.ENTREGUE}
      onMoverCard={
        podeEscrever
          ? async (pedido, novaSituacaoId) => {
              const res = await moverSituacaoPedido(pedido.id_vhsys, novaSituacaoId);
              if (res.ok) router.refresh();
              return res;
            }
          : undefined
      }
    />
  );
}
