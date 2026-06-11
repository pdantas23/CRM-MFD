"use client";

import { useMemo, useState } from "react";
import { statusVendaConfig } from "@/components/ui/Badge";
import type { Venda } from "@/lib/types/vendas";

interface VendasCalendarioProps {
  vendas: Venda[];
  onVendaClick: (venda: Venda) => void;
}

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const mesesAno = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function isoDe(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function VendaChip({ venda, onClick }: { venda: Venda; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${venda.nome_cliente} — ${statusVendaConfig[venda.status].label}`}
      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-75 ${statusVendaConfig[venda.status].class}`}
    >
      {venda.nome_cliente}
    </button>
  );
}

export function VendasCalendario({ vendas, onVendaClick }: VendasCalendarioProps) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());

  const hojeISO = isoDe(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const vendasPorDia = useMemo(() => {
    const mapa = new Map<string, Venda[]>();
    for (const venda of vendas) {
      const lista = mapa.get(venda.data_venda) ?? [];
      lista.push(venda);
      mapa.set(venda.data_venda, lista);
    }
    return mapa;
  }, [vendas]);

  const diasDoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  // Células da grade: nulls antes do dia 1 para alinhar com o dia da semana
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasDoMes }, (_, i) => i + 1),
  ];

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function proximoMes() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  const diasComVendas = Array.from({ length: diasDoMes }, (_, i) => i + 1)
    .map((dia) => ({ dia, vendas: vendasPorDia.get(isoDe(ano, mes, dia)) ?? [] }))
    .filter(({ vendas: lista }) => lista.length > 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={mesAnterior}
          aria-label="Mês anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-gray-900">
          {mesesAno[mes]} {ano}
        </h2>
        <button
          type="button"
          onClick={proximoMes}
          aria-label="Próximo mês"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grade mensal (telas md+) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {diasSemana.map((dia) => (
            <div key={dia} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celulas.map((dia, idx) => {
            const ehHoje = dia !== null && isoDe(ano, mes, dia) === hojeISO;
            const doDia = dia !== null ? vendasPorDia.get(isoDe(ano, mes, dia)) ?? [] : [];
            return (
              <div
                key={idx}
                className={`min-h-24 border-b border-r border-gray-100 p-1.5 ${
                  dia === null ? "bg-gray-50" : ""
                } ${ehHoje ? "bg-blue-50" : ""}`}
              >
                {dia !== null && (
                  <>
                    <span
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        ehHoje ? "bg-blue-700 text-white" : "text-gray-700"
                      }`}
                    >
                      {dia}
                    </span>
                    <div className="space-y-1">
                      {doDia.map((venda) => (
                        <VendaChip
                          key={venda.id}
                          venda={venda}
                          onClick={() => onVendaClick(venda)}
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

      {/* Lista agrupada por dia (telas pequenas) */}
      <div className="divide-y divide-gray-100 md:hidden">
        {diasComVendas.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            Nenhuma venda neste mês
          </p>
        )}
        {diasComVendas.map(({ dia, vendas: doDia }) => {
          const ehHoje = isoDe(ano, mes, dia) === hojeISO;
          return (
            <div key={dia} className="px-4 py-3">
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${ehHoje ? "text-blue-700" : "text-gray-500"}`}>
                {String(dia).padStart(2, "0")} de {mesesAno[mes]}
                {ehHoje && " — Hoje"}
              </p>
              <div className="space-y-1.5">
                {doDia.map((venda) => (
                  <VendaChip
                    key={venda.id}
                    venda={venda}
                    onClick={() => onVendaClick(venda)}
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
