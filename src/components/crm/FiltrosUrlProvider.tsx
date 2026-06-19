"use client";
// Provider que centraliza a navegação de filtros do CRM com:
// - Otimismo: um "overlay" de mudanças pendentes que `getParam` expõe
//   IMEDIATAMENTE, antes do servidor confirmar (toggle/dropdown reage na hora).
// - Loading: `isPending` (via useTransition) que as views usam para mostrar
//   um overlay de carregamento sobre a área de resultados.
//
// Substitui as funções `aplicar`/`router.replace` que antes estavam duplicadas
// em EntityToolbar, FiltrosPedido, FiltroConvertido, FiltrosEntrega e a
// `navegarCom` de OrcamentosView. A semântica de chaves/valores da URL é
// preservada exatamente (set quando truthy, delete quando vazio; `pagina`
// resetada salvo quando a própria mudança traz `pagina`).

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Mudancas = Record<string, string | undefined>;

interface FiltrosUrlContextValue {
  /** true enquanto a nova busca (router.replace) está em transição. */
  isPending: boolean;
  /** Aplica mudanças na URL (otimista + transição). */
  aplicar: (mudancas: Mudancas, opts?: { resetPagina?: boolean }) => void;
  /** Limpa (set undefined) todas as chaves informadas num único aplicar. */
  limpar: (keys: string[]) => void;
  /** Valor OTIMISTA da chave: overlay se pendente, senão o da URL. */
  getParam: (key: string) => string | undefined;
}

const FiltrosUrlContext = createContext<FiltrosUrlContextValue | null>(null);

export function FiltrosUrlProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Mudanças ainda não confirmadas pelo servidor. O ref espelha o estado para
  // acumular cliques rápidos antes do React aplicar o setState.
  const [overlay, setOverlay] = useState<Mudancas>({});
  const overlayRef = useRef<Mudancas>(overlay);
  overlayRef.current = overlay;

  // Quando a URL muda (servidor alcançou o estado pedido), zera o overlay.
  const spString = searchParams.toString();
  useEffect(() => {
    overlayRef.current = {};
    setOverlay({});
  }, [spString]);

  function aplicar(mudancas: Mudancas, opts?: { resetPagina?: boolean }) {
    const resetPagina = opts?.resetPagina ?? true;
    const novoOverlay: Mudancas = { ...overlayRef.current, ...mudancas };
    overlayRef.current = novoOverlay;
    setOverlay(novoOverlay);

    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(novoOverlay)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    if (resetPagina && !("pagina" in mudancas)) params.delete("pagina");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function limpar(keys: string[]) {
    const mudancas: Mudancas = {};
    for (const k of keys) mudancas[k] = undefined;
    aplicar(mudancas);
  }

  function getParam(key: string): string | undefined {
    if (key in overlay) {
      const v = overlay[key];
      return v === undefined || v === "" ? undefined : v;
    }
    return searchParams.get(key) ?? undefined;
  }

  return (
    <FiltrosUrlContext.Provider value={{ isPending, aplicar, limpar, getParam }}>
      {children}
    </FiltrosUrlContext.Provider>
  );
}

export function useFiltrosUrl(): FiltrosUrlContextValue {
  const ctx = useContext(FiltrosUrlContext);
  if (!ctx) {
    throw new Error("useFiltrosUrl deve ser usado dentro de <FiltrosUrlProvider>");
  }
  return ctx;
}
