"use client";

import { useEffect } from "react";

// Marcas de diagnóstico de performance (User Timing API). Não renderiza nada
// visível (retorna null) e não muda comportamento — só cria marcas/medidas no
// mount e, com `?perf=1` na URL, loga uma timeline consolidada no console.
//
// As medidas aparecem na trilha "Timings" do DevTools > Performance. Os números
// de servidor chegam como prop (medidos em pedidos/page.tsx); os de cliente são
// derivados de PerformanceNavigationTiming quando disponível.

export interface ServerTimings {
  authProfile: number;
  onda0: number;
  onda1: number;
  onda2: number;
  serverTotal: number;
  cache: string;
}

/** Só loga quando ?perf=1 está na URL (mesmo padrão do bloco de mount). */
function querPerf(): boolean {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("perf") === "1"
  );
}

export function PerfMarks({
  server,
  filterNonce,
  filterCount,
}: {
  server: ServerTimings;
  /**
   * Identidade dos dados que MUDA a cada troca de filtro (len + primeiros ids
   * dos pedidos, derivada no servidor). Dispara o marcador render-done a cada
   * soft navigation, não só no mount.
   */
  filterNonce?: string;
  /** Nº de pedidos renderizados (para o log render-done). */
  filterCount?: number;
}) {
  // render-done: pinta-se DEPOIS de reconciliar os novos dados do servidor.
  // Roda em CADA mudança de filterNonce (inclui o mount). requestAnimationFrame
  // garante que o ts caia após o paint. Mesma timeline wall-clock (Date.now())
  // dos logs [perf-trace] do servidor. Não muda comportamento.
  useEffect(() => {
    if (filterNonce === undefined) return;
    if (!querPerf()) return;
    const raf =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame(() => {
            // eslint-disable-next-line no-console
            console.log(
              `[perf-filter] render-done ts=${Date.now()} n_pedidos=${
                filterCount ?? 0
              }`
            );
          })
        : null;
    return () => {
      if (raf !== null && typeof cancelAnimationFrame !== "undefined")
        cancelAnimationFrame(raf);
    };
  }, [filterNonce, filterCount]);

  useEffect(() => {
    // Guarda defensiva: ambientes sem User Timing API simplesmente não medem.
    if (typeof performance === "undefined" || !performance.mark) return;

    const PFX = "pedidos";

    try {
      // Bloco que representa o tempo gasto no servidor (uma medida única com
      // duração = serverTotal, ancorada logo antes do mount do cliente).
      const mountNow = performance.now();
      const serverStart = Math.max(0, mountNow - server.serverTotal);
      performance.mark(`${PFX}:server-start`, { startTime: serverStart });
      performance.mark(`${PFX}:client-mount`, { startTime: mountNow });
      performance.measure(`${PFX}:server (${server.cache})`, {
        start: `${PFX}:server-start`,
        end: `${PFX}:client-mount`,
      });
    } catch {
      // startTime em options de mark exige browsers recentes; ignore se faltar.
    }

    // Métricas de navegação do cliente (TTFB, parse do bundle, load).
    let ttfb: number | null = null;
    let domContentLoaded: number | null = null;
    let loadEvent: number | null = null;
    try {
      const nav = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        ttfb = Math.round(nav.responseStart);
        domContentLoaded = Math.round(nav.domContentLoadedEventEnd);
        loadEvent = Math.round(nav.loadEventEnd);
      }
    } catch {
      // getEntriesByType pode não existir em ambientes muito antigos.
    }

    // Console só com ?perf=1, para não poluir o console de usuários reais.
    if (querPerf()) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf /pedidos client] server_total=${Math.round(
          server.serverTotal
        )}ms (auth_profile=${Math.round(server.authProfile)}ms onda0=${Math.round(
          server.onda0
        )}ms onda1=${Math.round(server.onda1)}ms onda2=${Math.round(
          server.onda2
        )}ms cache=${server.cache}) ttfb=${
          ttfb ?? "n/a"
        }ms dom_content_loaded=${domContentLoaded ?? "n/a"}ms load_event=${
          loadEvent ?? "n/a"
        }ms`
      );
    }
  }, [server]);

  return null;
}
