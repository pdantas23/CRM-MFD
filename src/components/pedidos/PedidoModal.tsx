"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import { entregaHabilitada, COLUNAS_KANBAN, SITUACAO, SEGMENTO_ENTREGA } from "@/lib/vhsys/fluxo";
import { moverSituacaoPedido } from "@/lib/vhsys/acoes";
import { hrefNovaEntrega } from "./PedidoCard";
import type { PedidoKanban, SituacaoRow } from "@/lib/types/pedidos";

interface PedidoModalProps {
  pedido: PedidoKanban;
  situacoes: SituacaoRow[];
  onClose: () => void;
  /** Se true, exibe controles de mover situação (admin ou vendedor). */
  podeEscrever?: boolean;
}

export function PedidoModal({ pedido, situacoes, onClose, podeEscrever }: PedidoModalProps) {
  const router = useRouter();
  const situacao = situacoes.find((s) => s.id_vhsys === pedido.situacao_id);
  const fin = pedido.financeiro;
  // Cor do saldo: a prazo (boleto/faturado) = laranja; vermelho só quando é
  // cobrança à vista pendente na entrega (deveria receber agora e não recebeu).
  // Verde = quitado. (A regra de "não conciliado" depende do Open Finance, ainda
  // não implementado — por ora o proxy é a cobrança à vista pendente.)
  const saldoPedido = fin?.saldo ?? 0;
  const emEntrega =
    pedido.situacao_id !== null && SEGMENTO_ENTREGA.has(pedido.situacao_id);
  const cobrarNaEntrega = emEntrega && pedido.cobrancaNaEntrega;
  const saldoCor =
    saldoPedido <= 0
      ? "text-green-700"
      : cobrarNaEntrega
        ? "text-red-700"
        : "text-amber-700";
  // Entregue é situação final — não pode mais mover.
  const entregue = pedido.situacao_id === SITUACAO.ENTREGUE;

  // Controle de mover situação — só visível para admin
  const [erroMover, setErroMover] = useState<string | null>(null);
  const [situacaoPendente, setSituacaoPendente] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Opções de destino: situações do Kanban excluindo Cancelado e a atual
  const opcoesDestino = situacoes.filter(
    (s) =>
      COLUNAS_KANBAN.includes(s.id_vhsys) &&
      s.id_vhsys !== SITUACAO.CANCELADO &&
      s.id_vhsys !== pedido.situacao_id
  );

  function handleMoverSituacao(novaSituacaoId: number) {
    setErroMover(null);
    setSituacaoPendente(novaSituacaoId);
    startTransition(async () => {
      const resultado = await moverSituacaoPedido(pedido.id_vhsys, novaSituacaoId);
      setSituacaoPendente(null);
      if (!resultado.ok) {
        setErroMover(resultado.erro ?? "Erro ao mover situação.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pedido #{pedido.numero}</h2>
            <p className="text-sm text-gray-500">{pedido.nome_cliente}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Situação</p>
              <p className="font-medium text-gray-900">
                {situacao?.nome ?? pedido.status_base ?? "—"}
                {pedido.origem_situacao === "legado" && (
                  <span className="ml-1 text-xs text-gray-400">(derivada)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Data</p>
              <p className="font-medium text-gray-900">
                {pedido.data_pedido ? formatarData(pedido.data_pedido) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Vendedor</p>
              <p className="font-medium text-gray-900">{pedido.vendedor_nome ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Referência</p>
              <p className="font-medium text-gray-900">{pedido.referencia || "—"}</p>
            </div>
          </div>

          {/* Financeiro — display-only (Contas a Receber); o gate usa só a situação */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Financeiro
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Total do pedido</dt>
                <dd className="font-semibold text-gray-900">
                  {formatBRL(pedido.valor_total ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Recebido</dt>
                <dd className="font-semibold text-green-700">
                  {formatBRL(fin?.recebido ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="font-medium text-gray-700">Saldo</dt>
                <dd className={`font-bold ${saldoCor}`}>
                  {formatBRL(saldoPedido)}
                </dd>
              </div>
            </dl>

            {pedido.parcelas.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Parcelas
                </p>
                <ul className="space-y-1 text-sm">
                  {pedido.parcelas.map((parc, i) => {
                    const pago = parc.valor_pago >= parc.valor - 0.01;
                    return (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="text-gray-600">
                          {parc.vencimento ? formatarData(parc.vencimento) : "sem vencimento"}
                          {parc.forma_pagamento && (
                            <span className="ml-1 text-xs text-gray-400">
                              · {parc.forma_pagamento}
                            </span>
                          )}
                        </span>
                        <span className={`font-medium ${pago ? "text-green-700" : "text-gray-900"}`}>
                          {formatBRL(parc.valor)}
                          {pago && <span className="ml-1 text-xs font-normal">(pago)</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {fin?.divergente && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                As contas a receber ({formatBRL(fin.total_contas)}) não batem com o
                total do pedido — confira o lançamento no VHSYS.
              </p>
            )}
            {(!fin || fin.total_contas === 0) && (
              <p className="mt-3 text-xs text-gray-500">
                Nenhuma conta a receber vinculada a este pedido (pagamentos via
                NF-e ainda não são associados — lacuna conhecida).
              </p>
            )}
          </div>

          {pedido.obs && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Observações</p>
              <p className="whitespace-pre-line text-sm text-gray-700">{pedido.obs}</p>
            </div>
          )}

          {/* Pedido entregue: situação final, sem mover */}
          {podeEscrever && entregue && (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              Pedido entregue — situação final. Não é possível mover.
            </p>
          )}

          {/* Painel de mover situação — admin ou vendedor, sem drag-and-drop */}
          {podeEscrever && !entregue && opcoesDestino.length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                Mover situação
              </p>
              {erroMover && (
                <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {erroMover}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {opcoesDestino.map((s) => {
                  const esteEstaPendente = situacaoPendente === s.id_vhsys;
                  const algumPendente = situacaoPendente !== null;
                  return (
                    <button
                      key={s.id_vhsys}
                      type="button"
                      disabled={algumPendente}
                      onClick={() => handleMoverSituacao(s.id_vhsys)}
                      className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-100 disabled:opacity-50"
                    >
                      {esteEstaPendente ? "Movendo..." : `-> ${s.nome}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          {pedido.entregaRegistrada ? (
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Entrega registrada
            </span>
          ) : entregaHabilitada(pedido.situacao_id) ? (
            <button
              type="button"
              onClick={() => router.push(hrefNovaEntrega(pedido))}
              className="btn-primary flex-1"
            >
              Cadastrar Entrega
            </button>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
              {pedido.situacao_id === SITUACAO.ENTREGUE
                ? "Entrega bloqueada — pedido já entregue"
                : "Entrega disponível apenas em separação ou entrega parcial"}
            </span>
          )}
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
