"use client";
// Input de valor monetário/decimal com máscara "centavos primeiro".
// Dígitos entram pela direita: digitar 1, 4, 5 produz 0,01 → 0,14 → 1,45.
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
}

export function InputValor({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  casas = 2,
  cinzaSeZero,
}: InputValorProps) {
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  const corZero = cinzaSeZero && value === 0 ? "text-gray-400" : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const n = digits ? parseInt(digits, 10) / 10 ** casas : 0;
    onChange(n);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatted}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-base ${corZero} ${className ?? ""}`}
    />
  );
}
