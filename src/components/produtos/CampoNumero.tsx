"use client";
// Número decimal pt-BR que PODE ficar vazio (vazio = null). Diferente de
// InputValor/InputDecimal, que tratam vazio como 0 — aqui a diferença importa
// (ex.: crédito de ICMS em branco = compra interna; 0% = DIFAL cheio).
import { useEffect, useState } from "react";

function formatar(n: number | null, casas: number): string {
  return n === null
    ? ""
    : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false });
}

function interpretar(texto: string): number | null {
  if (texto === "" || texto === ",") return null;
  const n = parseFloat(texto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Campo de tabela: sem borda; destaca só no hover/foco. */
export const CLASSE_CAMPO_TABELA =
  "h-8 rounded-md bg-transparent px-2 text-sm text-gray-900 placeholder-gray-400 transition-colors hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30";

export function CampoNumero({
  value,
  onChange,
  casas = 2,
  sufixo,
  prefixo,
  placeholder,
  className,
  compacto,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  casas?: number;
  sufixo?: string;
  prefixo?: string;
  placeholder?: string;
  className?: string;
  /** Versão de tabela: mais baixa, alinhada à direita. */
  compacto?: boolean;
}) {
  const [texto, setTexto] = useState(formatar(value, casas));

  // Sincroniza com mudanças externas (ex.: margem recalculada a partir da venda),
  // sem reescrever o que o usuário está digitando quando o número é o mesmo.
  useEffect(() => {
    setTexto((prev) => {
      const atual = interpretar(prev);
      const igual =
        atual === value || (atual !== null && value !== null && Math.abs(atual - value) < 10 ** -casas / 2);
      return igual ? prev : formatar(value, casas);
    });
  }, [value, casas]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Só dígitos, um separador (vira vírgula) e o sinal de menos no início.
    let raw = e.target.value.replace(/[^\d.,-]/g, "").replace(/(?!^)-/g, "");
    const partes = raw.split(/[.,]/);
    raw = partes.length > 2 ? `${partes[0]},${partes.slice(1).join("")}` : raw.replace(".", ",");
    setTexto(raw);
    onChange(raw === "-" ? null : interpretar(raw));
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={handleChange}
        // Ao sair do campo, completa as casas decimais ("7" → "7,00").
        onBlur={() => setTexto(formatar(value, casas))}
        placeholder={placeholder}
        className={`${compacto ? `${CLASSE_CAMPO_TABELA} text-right tabular-nums` : "input-base"} ${
          sufixo ? (compacto ? "pr-6" : "pr-8") : ""
        } ${prefixo ? (compacto ? "pl-7" : "pl-9") : ""} ${className ?? ""}`}
      />
      {prefixo && (
        <span
          className={`pointer-events-none absolute inset-y-0 flex items-center text-sm text-gray-400 ${
            compacto ? "left-2" : "left-3"
          }`}
        >
          {prefixo}
        </span>
      )}
      {sufixo && (
        <span
          className={`pointer-events-none absolute inset-y-0 flex items-center text-sm text-gray-400 ${
            compacto ? "right-2" : "right-3"
          }`}
        >
          {sufixo}
        </span>
      )}
    </div>
  );
}
