import { type Periodo, type StatusEntrega } from "@/lib/types/database";
import { ehAtrasada } from "@/lib/entregas/hoje";

export { ehAtrasada };

const periodoConfig: Record<Periodo, { label: string; class: string }> = {
  manha: { label: "Manhã", class: "bg-amber-100 text-amber-800 border-amber-200" },
  tarde: { label: "Tarde", class: "bg-orange-100 text-orange-800 border-orange-200" },
  noite: { label: "Noite", class: "bg-indigo-100 text-indigo-800 border-indigo-200" },
};

const statusConfig: Record<StatusEntrega, { label: string; labelCurto: string; class: string }> = {
  entrega_final: { label: "Entrega Final", labelCurto: "Final", class: "bg-green-100 text-green-800 border-green-200" },
  entrega_parcial: { label: "Entrega Parcial", labelCurto: "Parcial", class: "bg-blue-100 text-blue-800 border-blue-200" },
};

// Cor de fundo + borda-esquerda das linhas de entrega, por status.
// Usado nas listagens (dashboard do dia e tabela completa).
export const statusRowClass: Record<StatusEntrega, string> = {
  entrega_final: "bg-green-50 hover:bg-green-100 border-l-4 border-green-400",
  entrega_parcial: "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400",
};

export function PeriodoBadge({ periodo }: { periodo: Periodo }) {
  const config = periodoConfig[periodo];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      {config.label}
    </span>
  );
}

export function StatusBadge({ status, curto }: { status: StatusEntrega; curto?: boolean }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.class}`}>
      {curto ? config.labelCurto : config.label}
    </span>
  );
}

/** Sinal de entrega atrasada (não realizada e com data vencida). */
export function AtrasadaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      Atrasada
    </span>
  );
}

/** Sinal de entrega realizada (entregue). */
export function EntregueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Entregue
    </span>
  );
}
