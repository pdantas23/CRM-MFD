"use client";
// Input de número inteiro sem setas de incremento.
// Permite a caixa ficar vazia enquanto o usuário digita; vazio propaga 0 ao pai.
import { useEffect, useState } from "react";

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
  // Texto local: permite a caixa vazia mesmo com value numérico no pai.
  const [text, setText] = useState(value > 0 ? String(value) : "");

  // Sincroniza com mudanças externas do valor (reset, seleção de produto, etc.).
  useEffect(() => {
    setText((prev) => {
      const atual = prev === "" ? 0 : parseInt(prev, 10);
      return atual === value ? prev : value > 0 ? String(value) : "";
    });
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setText(digits);
    if (digits === "") {
      onChange(0);
      return;
    }
    let n = parseInt(digits, 10);
    if (min !== undefined && n < min) n = min;
    onChange(n);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input-base ${className ?? ""}`}
    />
  );
}
