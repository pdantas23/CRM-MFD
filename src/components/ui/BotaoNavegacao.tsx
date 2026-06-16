"use client";
// BotaoNavegacao — botão que navega para outra rota com feedback visual de pending.
// Usa useTransition + router.push; desabilita o botão e exibe spinner enquanto
// o server component da rota destino renderiza (até o loading.tsx sumir).
//
// Props:
//   href      — rota destino (passada para router.push)
//   className — classes Tailwind adicionais (ex.: btn-primary, btn-secondary)
//   children  — conteúdo normal do botão
//   labelPending — texto opcional exibido enquanto pendente (default: "…")
//   disabled  — desabilita mesmo fora do estado pendente

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./Spinner";

interface BotaoNavegacaoProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  labelPending?: string;
  disabled?: boolean;
}

export function BotaoNavegacao({
  href,
  className = "",
  children,
  labelPending,
  disabled = false,
}: BotaoNavegacaoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={`inline-flex items-center gap-2 disabled:opacity-60 ${className}`}
    >
      {isPending ? (
        <>
          <Spinner />
          {labelPending ?? "…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
