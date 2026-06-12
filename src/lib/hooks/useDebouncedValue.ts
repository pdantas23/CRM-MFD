"use client";
// Retorna o valor após estabilizar por `delay` ms (debounce).

import { useEffect, useState } from "react";

export function useDebouncedValue<T>(valor: T, delay = 350): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), delay);
    return () => clearTimeout(id);
  }, [valor, delay]);

  return debounced;
}
