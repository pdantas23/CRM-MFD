"use client";

import { useState, useTransition } from "react";
import { PedidoCard } from "./PedidoCard";
import { formatBRL } from "@/lib/format";
import { COLUNAS_KANBAN, SEGMENTO_PAGAMENTO } from "@/lib/vhsys/fluxo";
import { buscarMaisPedidos } from "@/lib/vhsys/acoes-pedidos";
import type { PedidoKanban, PedidoRow, SituacaoRow } from "@/lib/types/pedidos";

interface PedidosKanbanProps {
  situacoes: SituacaoRow[];
  pedidos: PedidoKanban[];
  onCardClick: (pedido: PedidoKanban) => void;
  /** Indica quais colunas atingiram o limite de 50 itens */
  atingiuLimitePorSituacao?: Record<number, boolean>;
}

// Colunas dinâmicas: nomes/ordem vêm do espelho de situações da conta
// (GET /situacoes); o fluxo (quais entram e em que sequência) vem de
// COLUNAS_KANBAN. 778 (Cancelado) fica fora do quadro.
export function PedidosKanban({
  situacoes,
  pedidos,
  onCardClick,
  atingiuLimitePorSituacao = {},
}: PedidosKanbanProps) {
  const porId = new Map(situacoes.map((s) => [s.id_vhsys, s]));
  const colunas = COLUNAS_KANBAN.filter((id) => porId.has(id));

  // Extras carregados pelo botão "Carregar mais" — chaveados por situacao_id
  const [extras, setExtras] = useState<Record<number, PedidoRow[]>>({});
  const [carregandoCol, setCarregandoCol] = useState<Record<number, boolean>>({});
  // M1: rastreia tamanho do último lote por coluna; < 50 = sem mais dados
  const [ultimoLote, setUltimoLote] = useState<Record<number, number>>({});
  const [, startTransition] = useTransition();

  function handleCarregarMais(situacaoId: number, offsetAtual: number) {
    setCarregandoCol((prev) => ({ ...prev, [situacaoId]: true }));
    startTransition(async () => {
      const resultado = await buscarMaisPedidos(situacaoId, offsetAtual);
      setCarregandoCol((prev) => ({ ...prev, [situacaoId]: false }));
      if (!resultado.erro) {
        setExtras((prev) => ({
          ...prev,
          [situacaoId]: [...(prev[situacaoId] ?? []), ...resultado.pedidos],
        }));
        // Registra tamanho do lote para esconder o botão quando < 50
        setUltimoLote((prev) => ({ ...prev, [situacaoId]: resultado.pedidos.length }));
      }
    });
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {colunas.map((idSituacao) => {
          const situacao = porId.get(idSituacao)!;
          const ehPagamento = SEGMENTO_PAGAMENTO.has(idSituacao);
          const daColuna = pedidos.filter((p) => p.situacao_id === idSituacao);

          // Extras carregados via "Carregar mais"
          const extrasColuna = (extras[idSituacao] ?? []).filter(
            (extra) => !daColuna.some((p) => p.id === extra.id)
          );
          const extrasKanban: PedidoKanban[] = extrasColuna.map((p) => ({
            ...p,
            financeiro: null,
            cliente: null,
            entregaRegistrada: false,
          }));
          const todos = [...daColuna, ...extrasKanban];

          const total = todos.reduce((acc, p) => acc + (p.valor_total ?? 0), 0);
          const offsetParaProxima = daColuna.length + (extras[idSituacao]?.length ?? 0);
          // M1: mostrar botão somente se:
          //   - ainda não clicou (atingiu limite) OU último lote retornou exatamente 50
          //   - nunca mostrar se último lote < 50 (sem mais dados no servidor)
          const jaCarregouExtras = idSituacao in ultimoLote;
          const podeCarregarMais = jaCarregouExtras
            ? ultimoLote[idSituacao] >= 50
            : Boolean(atingiuLimitePorSituacao[idSituacao]);

          return (
            <div
              key={idSituacao}
              className="flex min-h-[200px] w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-100/60"
            >
              <div
                className={`border-b-2 px-4 py-3 ${
                  ehPagamento ? "border-amber-300" : "border-blue-300"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {ehPagamento ? "Pagamento" : "Entrega"}
                </p>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{situacao.nome}</h2>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-600 shadow-sm">
                    {todos.length}
                    {atingiuLimitePorSituacao[idSituacao] && (
                      <span className="ml-0.5 text-gray-400">+</span>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatBRL(total)}</p>
              </div>

              <div className="flex-1 space-y-3 p-3">
                {todos.map((pedido) => (
                  <PedidoCard key={pedido.id} pedido={pedido} onClick={onCardClick} />
                ))}
                {todos.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-gray-400">
                    Nenhum pedido nesta situação
                  </p>
                )}
              </div>

              {/* Botão "Carregar mais" quando há mais itens além do limite */}
              {podeCarregarMais && (
                <div className="border-t border-gray-200 p-3">
                  <button
                    type="button"
                    disabled={carregandoCol[idSituacao]}
                    onClick={() => handleCarregarMais(idSituacao, offsetParaProxima)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {carregandoCol[idSituacao] ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
