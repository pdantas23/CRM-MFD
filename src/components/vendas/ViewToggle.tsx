"use client";

export type VendasView = "kanban" | "calendario";

interface ViewToggleProps {
  view: VendasView;
  onChange: (view: VendasView) => void;
}

const views: { value: VendasView; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "calendario", label: "Calendário" },
];

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      {views.map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onChange(v.value)}
          aria-pressed={view === v.value}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            view === v.value
              ? "bg-blue-700 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
