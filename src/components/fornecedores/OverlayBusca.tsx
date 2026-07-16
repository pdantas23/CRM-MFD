"use client";
// Envolve uma lista e, enquanto `carregando`, borra o conteúdo e sobrepõe um
// spinner centralizado — feedback de "buscando" sobre a própria lista.

import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function OverlayBusca({
  carregando,
  children,
}: {
  carregando: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative" aria-busy={carregando}>
      <div
        className={
          carregando
            ? "pointer-events-none blur-sm transition duration-150"
            : "transition duration-150"
        }
      >
        {children}
      </div>
      {carregando && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-white/40">
          {/* sticky centraliza o spinner na porção VISÍVEL da lista (viewport),
              não no meio da lista inteira — que pode ser bem mais alta que a tela. */}
          <div className="sticky top-1/2 flex -translate-y-1/2 justify-center">
            <Spinner className="h-8 w-8 text-primary-600" />
          </div>
        </div>
      )}
    </div>
  );
}
