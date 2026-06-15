"use client";
// Input de número inteiro sem setas de incremento.
// Filtra caracteres não numéricos e respeita o valor mínimo.

interface InputInteiroProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function InputInteiro({
  value,
  onChange,
  min,
  placeholder,
  className,
  disabled,
}: InputInteiroProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    let n = digits ? parseInt(digits, 10) : (min ?? 0);
    if (min !== undefined && n < min) n = min;
    onChange(n);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={String(value)}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-base ${className ?? ""}`}
    />
  );
}
