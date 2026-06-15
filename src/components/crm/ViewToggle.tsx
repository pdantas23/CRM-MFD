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
    <div className="flex items-center gap-2">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          className={valor === opcao.valor ? "btn-primary" : "btn-secondary"}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
