"use client";
// Input de número DECIMAL (aceita fração) sem setas de incremento.
// Aceita vírgula ou ponto como separador (exibe com vírgula, pt-BR). A caixa
// pode ficar vazia enquanto o usuário digita; vazio propaga 0 ao pai.
import { useEffect, useState } from "react";

interface InputDecimalProps {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Casas decimais máximas exibidas (padrão: 3). */
  casas?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

function formatar(n: number, casas: number): string {
  // Remove zeros à direita e o ruído de ponto flutuante; usa vírgula pt-BR.
  return n > 0 ? String(Number(n.toFixed(casas))).replace(".", ",") : "";
}

export function InputDecimal({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  casas = 3,
  onKeyDown,
}: InputDecimalProps) {
  // Texto local: permite estados intermediários como "1," durante a digitação.
  const [text, setText] = useState(formatar(value, casas));

  // Sincroniza com mudanças externas do valor (seleção de produto, reset).
  useEffect(() => {
    setText((prev) => {
      const atual = prev === "" ? 0 : parseFloat(prev.replace(",", "."));
      return atual === value ? prev : formatar(value, casas);
    });
  }, [value, casas]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Mantém só dígitos e um único separador decimal (unificado em vírgula).
    let raw = e.target.value.replace(/[^\d.,]/g, "");
    const partes = raw.split(/[.,]/);
    raw = partes.length > 2 ? `${partes[0]},${partes.slice(1).join("")}` : raw.replace(".", ",");

    setText(raw);
    if (raw === "" || raw === ",") {
      onChange(0);
      return;
    }
    const n = parseFloat(raw.replace(",", "."));
    onChange(Number.isFinite(n) ? n : 0);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-base ${className ?? ""}`}
    />
  );
}
