// Barra de métricas apresentacional do CRM. Recebe agregados já formatados
// e renderiza cards de mesma largura/altura em grid responsivo.

import type { Metrica } from "@/lib/crm/metricas";

interface EntityMetricsProps {
  metricas: Metrica[];
}

export function EntityMetrics({ metricas }: EntityMetricsProps) {
  if (metricas.length === 0) return null;

  return (
    // Mobile: carrossel horizontal arrastável (swipe + snap). Desktop: grid.
    <div className="mb-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
      {metricas.map((m) => (
        <div
          key={m.label}
          className="w-full shrink-0 snap-start rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:w-auto sm:min-w-0"
        >
          <p className="truncate text-xs text-gray-500">{m.label}</p>
          <p
            className={`mt-0.5 break-words text-base font-semibold sm:text-lg ${
              m.destaque ? "text-blue-600" : "text-gray-900"
            }`}
          >
            {m.valor}
          </p>
        </div>
      ))}
    </div>
  );
}
