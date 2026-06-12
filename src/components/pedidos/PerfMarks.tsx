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

export function PerfMarks({ server }: { server: ServerTimings }) {
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
    const querPerf =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("perf") === "1";

    if (querPerf) {
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
