"use client";
// Calendário mensal das montagens. Cada dia mostra os serviços daquela data:
//   não começou          → período PREVISTO, tracejado âmbar
//   começou              → período REAL (até hoje, se em andamento):
//                            azul (andamento) / verde (finalizado),
//                            VERMELHO nos dias além do fim previsto (atraso)

import { useState } from "react";
import type { ServicoMontagem, StatusServico } from "@/lib/montagens/status";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

type Estilo = "previsto" | "andamento" | "finalizado" | "atraso";

const ESTILOS: Record<Estilo, string> = {
  previsto: "border border-dashed border-amber-400 bg-amber-50 text-amber-800",
  andamento: "bg-primary-100 text-primary-800",
  finalizado: "bg-green-100 text-green-800",
  atraso: "bg-red-100 text-red-800",
};

/** Como o serviço aparece num dia (ou null se não aparece). */
function estiloNoDia(s: ServicoMontagem, st: StatusServico, dia: string, hoje: string): Estilo | null {
  if (s.inicioReal) {
    const fim = s.fimReal ?? hoje;
    if (dia < s.inicioReal || dia > fim) return null;
    if (s.fimPrevisto && dia > s.fimPrevisto) return "atraso";
    return st.fase === "finalizado" ? "finalizado" : "andamento";
  }
  const ini = s.inicioPrevisto;
  const fim = s.fimPrevisto ?? s.inicioPrevisto;
  if (!ini || !fim || dia < ini || dia > fim) return null;
  return "previsto";
}

export function CalendarioMontagens({
  itens,
  hoje,
  onAbrir,
}: {
  itens: { s: ServicoMontagem; st: StatusServico }[];
  hoje: string;
  onAbrir: (id: string) => void;
}) {
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoje.slice(5, 7)) - 1);

  const primeiroDiaSemana = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7) celulas.push(null);

  function mudarMes(delta: number) {
    const m = mes + delta;
    setAno(ano + Math.floor(m / 12));
    setMes(((m % 12) + 12) % 12);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button type="button" onClick={() => mudarMes(-1)} className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Mês anterior">
          ‹
        </button>
        <h2 className="text-sm font-semibold text-gray-900">
          {MESES[mes]} de {ano}
        </h2>
        <button type="button" onClick={() => mudarMes(1)} className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-gray-500">
        {SEMANA.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} className="min-h-[6.5rem] border-b border-r bg-gray-50/50" />;
          const data = iso(ano, mes, dia);
          const doDia = itens
            .map(({ s, st }) => ({ s, estilo: estiloNoDia(s, st, data, hoje) }))
            .filter((x): x is { s: ServicoMontagem; estilo: Estilo } => x.estilo !== null);
          return (
            <div key={i} className="min-h-[6.5rem] border-b border-r p-1">
              <p
                className={`mb-1 text-right text-xs ${
                  data === hoje ? "font-bold text-primary-700" : "text-gray-500"
                }`}
              >
                {dia}
              </p>
              <div className="space-y-0.5">
                {doDia.slice(0, 4).map(({ s, estilo }) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onAbrir(s.id)}
                    title={`${s.clienteNome ?? "Sem cliente"}${s.montadorNome ? ` · ${s.montadorNome}` : ""}`}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] ${ESTILOS[estilo]}`}
                  >
                    {s.clienteNome ?? "Sem cliente"}
                  </button>
                ))}
                {doDia.length > 4 && <p className="px-1 text-[11px] text-gray-400">+ {doDia.length - 4}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-gray-600">
        {(
          [
            ["previsto", "Previsto (não começou)"],
            ["andamento", "Em andamento"],
            ["finalizado", "Finalizado"],
            ["atraso", "Além do fim previsto"],
          ] as const
        ).map(([e, label]) => (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-3 w-5 rounded ${ESTILOS[e]}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
