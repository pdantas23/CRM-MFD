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
}

export function InputValor({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  casas = 2,
}: InputValorProps) {
  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

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
      className={`input-base ${className ?? ""}`}
    />
  );
}
