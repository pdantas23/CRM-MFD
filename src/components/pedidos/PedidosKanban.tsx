"use client";

import { useRouter } from "next/navigation";
import { PedidoCard } from "./PedidoCard";
import { ehSegmentoPagamento, type ModeloSituacoes } from "@/lib/vhsys/situacoes-modelo";
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
  /** Modelo de situações da conta (colunas/segmentos data-driven). */
  modelo: ModeloSituacoes;
  /** true (vendedor): não pode soltar em pagamento parcial/aprovado. */
  restricaoPagamento?: boolean;
  /** true (admin/superadmin): mostra o bloco de entrega nos cards. */
  podeCadastrarEntrega?: boolean;
}

// Colunas dinâmicas: nomes/ordem/IDs vêm das situações sincronizadas da conta
// (modelo). A "Cancelado" fica fora do quadro.
export function PedidosKanban({
  situacoes,
  pedidos,
  onCardClick,
  atingiuLimitePorSituacao = {},
  podeEscrever,
  modelo,
  restricaoPagamento = false,
  podeCadastrarEntrega = false,
}: PedidosKanbanProps) {
  const router = useRouter();
  const porId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  const colunas: KanbanColuna[] = modelo.colunas.filter((id) => porId.has(id)).map((id) => {
    const situacao = porId.get(id)!;
    const ehPagamento = ehSegmentoPagamento(modelo, id);
    return {
      id,
      nome: situacao.nome,
      segmentoLabel: ehPagamento ? "Pagamento" : "Entrega",
      segmentoCor: ehPagamento ? "border-amber-300" : "border-primary-300",
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
      renderCard={(p) => <PedidoCard pedido={p} onClick={onCardClick} modelo={modelo} podeCadastrarEntrega={podeCadastrarEntrega} />}
      atingiuLimitePorColuna={atingiuLimitePorSituacao}
      carregarMais={handleCarregarMais}
      mensagemVazio="Nenhum pedido nesta situação"
      // Entregue é final; e um pedido em "aguardando pagamento" só o financeiro
      // (ou superadmin) move — admin/vendedor não podem arrastá-lo.
      podeMoverItem={(p) =>
        p.situacao_id !== modelo.entregueId &&
        !(restricaoPagamento && p.situacao_id === modelo.aguardandoPagamentoId)
      }
      onMoverCard={
        podeEscrever
          ? async (pedido, novaSituacaoId) => {
              // Vendedor não aprova pagamento — rejeita o drop antes do servidor.
              if (
                restricaoPagamento &&
                (novaSituacaoId === modelo.pagamentoAprovadoId ||
                  novaSituacaoId === modelo.pagamentoParcialId)
              ) {
                return {
                  ok: false,
                  erro: "Aprovação de pagamento é responsabilidade do financeiro.",
                };
              }
              const res = await moverSituacaoPedido(pedido.id_vhsys, novaSituacaoId);
              if (res.ok) router.refresh();
              return res;
            }
          : undefined
      }
    />
  );
}
