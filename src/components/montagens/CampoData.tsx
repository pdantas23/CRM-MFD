"use client";
// Campo de data dd/mm/aaaa com máscara: digitar "21062002" vira "21/06/2002"
// (o <input type="date"> do Safari não pula de dia → mês → ano). Só emite a
// data (ISO "AAAA-MM-DD") quando ela é válida; "" enquanto incompleta/vazia.
// O ícone abre um calendário próprio, que fecha ao escolher o dia, ao clicar
// fora ou com Esc (o calendário nativo do Safari não fecha ao clicar fora).

import { useEffect, useRef, useState } from "react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const isoParaTexto = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "");
const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function mascarar(digitos: string): string {
  const d = digitos.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "ddmmaaaa" → ISO, só se for uma data que existe (31/02 não). */
function paraIso(digitos: string): string | null {
  if (digitos.length !== 8) return null;
  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4));
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1) return null;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  if (dia > ultimo) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function hojeLocal(): string {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

function Calendario({
  value,
  max,
  onEscolher,
}: {
  value: string;
  max?: string;
  onEscolher: (iso: string) => void;
}) {
  const base = value || max || hojeLocal();
  const [ano, setAno] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);
  const hoje = hojeLocal();

  const inicio = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const dias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: inicio }, () => null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];

  function mudar(delta: number) {
    const m = mes + delta;
    setAno(ano + Math.floor(m / 12));
    setMes(((m % 12) + 12) % 12);
  }

  return (
    <div className="w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => mudar(-1)} className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Mês anterior">
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {MESES[mes]} {ano}
        </span>
        <button type="button" onClick={() => mudar(1)} className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100" aria-label="Próximo mês">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {SEMANA.map((d, i) => (
          <span key={i} className="py-1 font-medium text-gray-400">
            {d}
          </span>
        ))}
        {celulas.map((d, i) => {
          if (d === null) return <span key={i} />;
          const data = iso(ano, mes, d);
          const bloqueado = Boolean(max && data > max);
          const escolhido = data === value;
          return (
            <button
              key={i}
              type="button"
              disabled={bloqueado}
              onClick={() => onEscolher(data)}
              className={`rounded py-1.5 text-sm tabular-nums ${
                escolhido
                  ? "bg-primary-600 font-semibold text-white"
                  : bloqueado
                    ? "cursor-not-allowed text-gray-300"
                    : data === hoje
                      ? "font-semibold text-primary-700 hover:bg-primary-50"
                      : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onEscolher(max && hoje > max ? max : hoje)}
        className="mt-2 w-full rounded py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
      >
        Hoje
      </button>
    </div>
  );
}

export function CampoData({
  value,
  onChange,
  max,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(isoParaTexto(value));
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Mudança externa (ex.: restaurar ao cancelar) reescreve o texto.
  useEffect(() => {
    setTexto((atual) => (paraIso(atual.replace(/\D/g, "")) === value ? atual : isoParaTexto(value)));
  }, [value]);

  // Fecha ao clicar fora ou com Esc (o Esc não chega aos modais de baixo).
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc, true);
    };
  }, [aberto]);

  const digitos = texto.replace(/\D/g, "");
  const invalida = digitos.length === 8 && !paraIso(digitos);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        inputMode="numeric"
        value={texto}
        placeholder="dd/mm/aaaa"
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, 8);
          setTexto(mascarar(d));
          onChange(paraIso(d) ?? "");
        }}
        className={`input-base pr-10 tabular-nums ${invalida ? "border-red-400 text-red-600" : ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Abrir calendário"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 hover:text-gray-600"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-30 mt-1">
          <Calendario
            value={value}
            max={max}
            onEscolher={(d) => {
              setTexto(isoParaTexto(d));
              onChange(d);
              setAberto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
