// Barra de métricas apresentacional do CRM. Recebe agregados já formatados
// e renderiza cards de mesma largura/altura em grid responsivo.

import type { Metrica } from "@/lib/crm/metricas";

interface EntityMetricsProps {
  metricas: Metrica[];
}

export function EntityMetrics({ metricas }: EntityMetricsProps) {
  if (metricas.length === 0) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {metricas.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
        >
          <p className="text-xs text-gray-500">{m.label}</p>
          <p
            className={`mt-0.5 text-lg font-semibold ${
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
