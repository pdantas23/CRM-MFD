"use client";
// Input de valor monetário/decimal com máscara "centavos primeiro".
// Dígitos entram SEMPRE pela direita (digitar 1, 4, 5 produz 0,01 → 0,14 → 1,45),
// independentemente da posição do cursor — as teclas são interceptadas.
// Usa type="text" para evitar setas de incremento do navegador.

interface InputValorProps {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Casas decimais (padrão: 2) */
  casas?: number;
  /** Exibe o "0,00" em cinza (estado vazio) enquanto o valor for zero. */
  cinzaSeZero?: boolean;
  /** Permite interceptar teclas (ex.: Tab no último campo da linha de item). */
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  /** Classe base do input (padrão "input-base"); use "" para texto sem moldura. */
  baseClassName?: string;
}

export function InputValor({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  casas = 2,
  cinzaSeZero,
  onKeyDown,
  baseClassName = "input-base",
}: InputValorProps) {
  const fator = 10 ** casas;
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  const corZero = cinzaSeZero && value === 0 ? "text-gray-400" : "";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Handler externo primeiro (ex.: Tab que cria uma nova linha de item).
    onKeyDown?.(e);
    if (e.defaultPrevented || disabled || e.ctrlKey || e.metaKey || e.altKey) return;

    const cent = Math.round(value * fator);
    if (e.key >= "0" && e.key <= "9") {
      // Dígito → entra pela direita (aumenta o valor), ignorando o cursor.
      e.preventDefault();
      onChange((cent * 10 + Number(e.key)) / fator);
    } else if (e.key === "Backspace") {
      // Backspace → remove da direita.
      e.preventDefault();
      onChange(Math.floor(cent / 10) / fator);
    }
    // Demais teclas (Tab, setas, atalhos) seguem o comportamento padrão.
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Só chega aqui em colar (paste): extrai os dígitos e recompõe pela direita.
    const digits = e.target.value.replace(/\D/g, "");
    onChange(digits ? parseInt(digits, 10) / fator : 0);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatted}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`${baseClassName} ${corZero} ${className ?? ""}`.trim()}
    />
  );
}
