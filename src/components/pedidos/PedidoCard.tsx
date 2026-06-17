"use client";

import { useRouter } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import { entregaHabilitada, SEGMENTO_ENTREGA } from "@/lib/vhsys/fluxo";
import type { PedidoKanban } from "@/lib/types/pedidos";

interface PedidoCardProps {
  pedido: PedidoKanban;
  onClick: (pedido: PedidoKanban) => void;
}

export function hrefNovaEntrega(pedido: PedidoKanban): string {
  const params = new URLSearchParams({
    nome_cliente: pedido.nome_cliente,
    numero_orcamento: String(pedido.numero),
    pedido_id: pedido.id,
  });
  if (pedido.cliente?.cnpj_cpf) params.set("cpf_cnpj", pedido.cliente.cnpj_cpf);
  if (pedido.cliente?.bairro) params.set("bairro", pedido.cliente.bairro);
  if (pedido.cliente?.endereco) {
    const numero = pedido.cliente.numero ? `, ${pedido.cliente.numero}` : "";
    params.set("endereco", `${pedido.cliente.endereco}${numero}`);
  }
  return `/entregas/nova?${params.toString()}`;
}

export function PedidoCard({ pedido, onClick }: PedidoCardProps) {
  const router = useRouter();
  const saldo = pedido.financeiro?.saldo ?? 0;
  const emEntrega =
    pedido.situacao_id !== null && SEGMENTO_ENTREGA.has(pedido.situacao_id);
  // Só é cobrança na entrega quando está em entrega E o saldo é à vista.
  // Vendas a prazo (boleto/faturado) em entrega são apenas saldo a prazo.
  const cobrarNaEntrega = emEntrega && pedido.cobrancaNaEntrega;

  return (
    <div
      onClick={() => onClick(pedido)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{pedido.nome_cliente}</p>
        <span className="shrink-0 text-xs font-semibold text-gray-500">
          #{pedido.numero}
        </span>
      </div>

      {pedido.vendedor_nome && (
        <p className="text-xs text-gray-500">{pedido.vendedor_nome}</p>
      )}

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-sm font-bold text-gray-900">
          {formatBRL(pedido.valor_total ?? 0)}
        </span>
        {pedido.data_pedido && (
          <span className="text-xs text-gray-500">
            {formatarData(pedido.data_pedido)}
          </span>
        )}
      </div>

      {/* Saldo em TODAS as colunas; >0 destacado.
          Alerta forte (vermelho) só quando é cobrança à vista na entrega;
          a prazo (boleto/faturado) fica em âmbar, sem implicar pagar na entrega. */}
      {saldo > 0 ? (
        <p
          className={`mt-2 rounded-md px-2 py-1 text-xs font-semibold ${
            cobrarNaEntrega
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {cobrarNaEntrega
            ? "Saldo a receber na entrega: "
            : emEntrega
              ? "Saldo (a prazo): "
              : "Saldo: "}
          {formatBRL(saldo)}
        </p>
      ) : (
        pedido.financeiro &&
        pedido.financeiro.recebido > 0 && (
          <p className="mt-2 text-xs font-medium text-green-700">
            Recebido integralmente
          </p>
        )
      )}

      {pedido.origem_situacao === "legado" && (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
          situação derivada (legado)
        </p>
      )}

      {pedido.entregaRegistrada ? (
        <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Entrega registrada
        </span>
      ) : entregaHabilitada(pedido.situacao_id) ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(hrefNovaEntrega(pedido));
          }}
          className="mt-3 w-full rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800"
        >
          Cadastrar Entrega
        </button>
      ) : null}
    </div>
  );
}
