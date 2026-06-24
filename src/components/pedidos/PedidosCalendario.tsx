"use client";
// Calendário mensal de pedidos — adaptado do VendasCalendario (commit 9908c03).
// Ao mudar de mês, busca os pedidos via Server Action buscarPedidosDoMes
// em vez de reusar a lista do Kanban (que é limitada a 50/coluna).

import { useMemo, useState, useTransition, useCallback, useEffect } from "react";
import { buscarPedidosDoMes } from "@/lib/vhsys/acoes-pedidos";
import { formatBRL } from "@/lib/format";
import type { PedidoKanban, PedidoRow, SituacaoRow } from "@/lib/types/pedidos";

interface PedidosCalendarioProps {
  /** Pedidos iniciais já carregados pelo server component (mês atual) */
  pedidosIniciais: PedidoRow[];
  anoInicial: number;
  mesInicial: number; // 1–12
  /** Situações do kanban — reservado para uso futuro (badge de situação) */
  situacoes?: SituacaoRow[];
  onPedidoClick: (pedido: PedidoKanban) => void;
}

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const mesesAno = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function isoDe(ano: number, mes1: number, dia: number): string {
  return `${ano}-${String(mes1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function PedidoChip({
  pedido,
  onClick,
}: {
  pedido: PedidoRow;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${pedido.nome_cliente} — #${pedido.numero} — ${formatBRL(pedido.valor_total ?? 0)}`}
      className="block w-full truncate rounded border border-primary-200 bg-primary-50 px-1.5 py-0.5 text-left text-xs font-medium text-primary-800 transition-opacity hover:opacity-75"
    >
      {pedido.nome_cliente} #{pedido.numero}
    </button>
  );
}

export function PedidosCalendario({
  pedidosIniciais,
  anoInicial,
  mesInicial,
  onPedidoClick,
}: PedidosCalendarioProps) {
  const hoje = new Date();
  // mes é 1-based internamente (1=Janeiro) para bater com buscarPedidosDoMes
  const [ano, setAno] = useState(anoInicial);
  const [mes, setMes] = useState(mesInicial);
  const [pedidos, setPedidos] = useState<PedidoRow[]>(pedidosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const hojeISO = isoDe(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());

  const pedidosPorDia = useMemo(() => {
    const mapa = new Map<string, PedidoRow[]>();
    for (const p of pedidos) {
      if (!p.data_pedido) continue;
      const lista = mapa.get(p.data_pedido) ?? [];
      lista.push(p);
      mapa.set(p.data_pedido, lista);
    }
    return mapa;
  }, [pedidos]);

  const diasDoMes = new Date(ano, mes, 0).getDate(); // mes-1+1 = mes (Date usa 0-based)
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();

  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasDoMes }, (_, i) => i + 1),
  ];

  const carregarMes = useCallback((novoAno: number, novoMes: number) => {
    setCarregando(true);
    setErro(null);
    startTransition(async () => {
      const resultado = await buscarPedidosDoMes(novoAno, novoMes);
      setCarregando(false);
      if (resultado.erro) {
        setErro(resultado.erro);
      } else {
        setPedidos(resultado.pedidos);
      }
    });
  }, [startTransition]);

  // M2: ao montar o componente, busca os dados reais do mês atual
  // (os pedidosIniciais são o slice de 50/coluna do Kanban, incompleto).
  useEffect(() => {
    carregarMes(anoInicial, mesInicial);
    // Apenas no mount — não reagir a mudanças de prop após renderização inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mesAnterior() {
    const novoMes = mes === 1 ? 12 : mes - 1;
    const novoAno = mes === 1 ? ano - 1 : ano;
    setMes(novoMes);
    setAno(novoAno);
    carregarMes(novoAno, novoMes);
  }

  function proximoMes() {
    const novoMes = mes === 12 ? 1 : mes + 1;
    const novoAno = mes === 12 ? ano + 1 : ano;
    setMes(novoMes);
    setAno(novoAno);
    carregarMes(novoAno, novoMes);
  }

  const diasComPedidos = Array.from({ length: diasDoMes }, (_, i) => i + 1)
    .map((dia) => ({ dia, lista: pedidosPorDia.get(isoDe(ano, mes, dia)) ?? [] }))
    .filter(({ lista }) => lista.length > 0);

  // Converte PedidoRow para PedidoKanban (sem financeiro/cliente/entregaRegistrada)
  function toKanban(p: PedidoRow): PedidoKanban {
    return {
      ...p,
      financeiro: null,
      cliente: null,
      entregaRegistrada: false,
      cobrancaNaEntrega: false,
      parcelas: [],
    };
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Cabeçalho de navegação */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={mesAnterior}
          disabled={carregando}
          aria-label="Mês anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-900">
          {carregando ? "Carregando…" : `${mesesAno[mes - 1]} ${ano}`}
        </h2>
        <button
          type="button"
          onClick={proximoMes}
          disabled={carregando}
          aria-label="Próximo mês"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {erro && (
        <p className="px-4 py-2 text-sm text-red-600">{erro}</p>
      )}

      {/* Grade mensal (telas md+) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {diasSemana.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celulas.map((dia, idx) => {
            const ehHoje = dia !== null && isoDe(ano, mes, dia) === hojeISO;
            const doDia = dia !== null ? pedidosPorDia.get(isoDe(ano, mes, dia)) ?? [] : [];
            return (
              <div
                key={idx}
                className={`min-h-24 border-b border-r border-gray-100 p-1.5 ${
                  dia === null ? "bg-gray-50" : ""
                } ${ehHoje ? "bg-primary-50" : ""}`}
              >
                {dia !== null && (
                  <>
                    <span
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        ehHoje ? "bg-primary-700 text-white" : "text-gray-700"
                      }`}
                    >
                      {dia}
                    </span>
                    <div className="space-y-1">
                      {doDia.map((p) => (
                        <PedidoChip
                          key={p.id}
                          pedido={p}
                          onClick={() => onPedidoClick(toKanban(p))}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista agrupada por dia (mobile) */}
      <div className="divide-y divide-gray-100 md:hidden">
        {diasComPedidos.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            Nenhum pedido neste mês
          </p>
        )}
        {diasComPedidos.map(({ dia, lista }) => {
          const ehHoje = isoDe(ano, mes, dia) === hojeISO;
          return (
            <div key={dia} className="px-4 py-3">
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${ehHoje ? "text-primary-700" : "text-gray-500"}`}>
                {String(dia).padStart(2, "0")} de {mesesAno[mes - 1]}
                {ehHoje && " — Hoje"}
              </p>
              <div className="space-y-1.5">
                {lista.map((p) => (
                  <PedidoChip
                    key={p.id}
                    pedido={p}
                    onClick={() => onPedidoClick(toKanban(p))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
