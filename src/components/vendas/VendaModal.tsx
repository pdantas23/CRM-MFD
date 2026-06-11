"use client";

import { useEffect } from "react";
import { StatusVendaBadge } from "@/components/ui/Badge";
import { formatBRL, formatarData } from "@/lib/vendas/format";
import type { Venda } from "@/lib/types/vendas";

interface VendaModalProps {
  venda: Venda;
  onClose: () => void;
  onCadastrarEntrega: (venda: Venda) => void;
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{valor}</p>
    </div>
  );
}

export function VendaModal({ venda, onClose, onCadastrarEntrega }: VendaModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pagamentoCompleto = venda.status === "pagamento_completo";
  const saldo = venda.valor_total - venda.valor_pago;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes da venda ${venda.numero_orcamento}`}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{venda.nome_cliente}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {venda.numero_orcamento} · Venda em {formatarData(venda.data_venda)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusVendaBadge status={venda.status} />
            {venda.entrega_registrada && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Entrega registrada
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="CPF / CNPJ" valor={venda.cpf_cnpj} />
            <Campo label="Contato" valor={venda.contato} />
            <Campo label="Vendedor" valor={venda.vendedor} />
            <Campo
              label="Previsão de Entrega"
              valor={venda.previsao_entrega ? formatarData(venda.previsao_entrega) : "Não definida"}
            />
            <Campo label="Bairro" valor={venda.bairro} />
            <Campo label="Endereço" valor={venda.endereco} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Itens</p>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Descrição</th>
                    <th className="px-4 py-2 text-right font-medium">Qtd</th>
                    <th className="px-4 py-2 text-right font-medium">Valor Unit.</th>
                    <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {venda.itens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-gray-900">{item.descricao}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{item.quantidade}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{formatBRL(item.valor_unitario)}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {formatBRL(item.quantidade * item.valor_unitario)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Valor total</span>
              <span className="font-bold text-gray-900">{formatBRL(venda.valor_total)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-gray-600">Valor pago</span>
              <span className="font-medium text-green-700">{formatBRL(venda.valor_pago)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-gray-600">Saldo</span>
              <span className={`font-medium ${saldo > 0 ? "text-amber-700" : "text-gray-900"}`}>
                {formatBRL(saldo)}
              </span>
            </div>
          </div>

          {venda.observacoes && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Observações</p>
              <p className="text-sm text-gray-700">{venda.observacoes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          {!venda.entrega_registrada && (
            <button
              type="button"
              disabled={!pagamentoCompleto}
              title={pagamentoCompleto ? undefined : "Disponível após pagamento completo"}
              onClick={() => onCadastrarEntrega(venda)}
              className={
                pagamentoCompleto
                  ? "btn-primary"
                  : "inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
              }
            >
              Cadastrar Entrega
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
