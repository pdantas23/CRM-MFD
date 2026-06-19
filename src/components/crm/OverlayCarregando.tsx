"use client";
// Envolve a área de resultados de uma tela de CRM (tabela/kanban/calendário)
// e sobrepõe um overlay sutil com Spinner enquanto a navegação de filtros está
// pendente (isPending do FiltrosUrlProvider). Mantém os controles da toolbar
// clicáveis — só a região de resultados fica "ocupada".

import type { ReactNode } from "react";
import { useFiltrosUrl } from "./FiltrosUrlProvider";
import { Spinner } from "@/components/ui/Spinner";

export function OverlayCarregando({ children }: { children: ReactNode }) {
  const { isPending } = useFiltrosUrl();

  return (
    <div className="relative" aria-busy={isPending}>
      <div
        className={
          isPending ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"
        }
      >
        {children}
      </div>
      {isPending && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="mt-16">
            <Spinner className="h-7 w-7 text-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}
