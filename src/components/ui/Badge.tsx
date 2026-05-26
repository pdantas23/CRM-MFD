import { type Periodo, type StatusEntrega } from "@/lib/types/database";

const periodoConfig: Record<Periodo, { label: string; class: string }> = {
  manha: { label: "Manhã", class: "bg-amber-100 text-amber-800 border-amber-200" },
  tarde: { label: "Tarde", class: "bg-orange-100 text-orange-800 border-orange-200" },
};

const statusConfig: Record<StatusEntrega, { label: string; class: string }> = {
  entrega_final: { label: "Entrega Final", class: "bg-green-100 text-green-800 border-green-200" },
  entrega_parcial: { label: "Entrega Parcial", class: "bg-blue-100 text-blue-800 border-blue-200" },
};

export function PeriodoBadge({ periodo }: { periodo: Periodo }) {
  const config = periodoConfig[periodo];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      {config.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: StatusEntrega }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      {config.label}
    </span>
  );
}
