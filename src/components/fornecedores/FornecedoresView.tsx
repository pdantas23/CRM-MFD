"use client";
// Busca + lista de fornecedores. O input atualiza o ?q= da URL (debounced) e a
// página (server) refaz a consulta; enquanto isso, a lista fica borrada com um
// spinner por cima (OverlayBusca). Busca casa nome do fornecedor OU
// descrição/código do material.

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaFornecedores, type FornecedorComMateriais } from "./ListaFornecedores";
import { OverlayBusca } from "./OverlayBusca";

export function FornecedoresView({
  fornecedores,
  qInicial,
}: {
  fornecedores: FornecedorComMateriais[];
  qInicial: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(qInicial);
  const [debouncing, setDebouncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const primeira = useRef(true);

  // Debounce: navega 300ms depois de parar de digitar (replace, não push).
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    setDebouncing(true);
    const t = setTimeout(() => {
      setDebouncing(false);
      const q = valor.trim();
      startTransition(() => {
        router.replace(q ? `/fornecedores?q=${encodeURIComponent(q)}` : "/fornecedores");
      });
    }, 300);
    return () => clearTimeout(t);
  }, [valor, router]);

  // Cobre o debounce (digitando) e a navegação server (busca no banco).
  const carregando = debouncing || isPending;
  const termo = valor.trim();

  return (
    <>
      <div className="relative mb-6 w-full">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Buscar por fornecedor ou material (ex.: placa)…"
          className="input-base w-full pl-9"
          aria-label="Buscar fornecedor ou material"
        />
      </div>

      <OverlayBusca carregando={carregando}>
        {fornecedores.length === 0 ? (
          <div className="card px-6 py-16 text-center text-sm text-gray-500">
            {termo
              ? `Nenhum fornecedor ou material encontrado para "${termo}".`
              : "Nenhum fornecedor encontrado nos produtos ativos."}
          </div>
        ) : (
          <ListaFornecedores fornecedores={fornecedores} />
        )}
      </OverlayBusca>
    </>
  );
}
