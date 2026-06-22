"use client";

interface OpcaoToggle {
  valor: string;
  label: string;
}

interface ViewToggleProps {
  opcoes: OpcaoToggle[];
  valor: string;
  onChange: (v: string) => void;
}

export function ViewToggle({ opcoes, valor, onChange }: ViewToggleProps) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          className={`${valor === opcao.valor ? "btn-primary" : "btn-secondary"} flex-1 whitespace-nowrap sm:flex-none`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
