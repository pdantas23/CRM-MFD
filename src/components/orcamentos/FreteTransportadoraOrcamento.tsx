"use client";
// Seção de frete e transportadora do orçamento.
// Modalidade: 0=Remetente, 1=Destinatário, 9=Sem frete.

import { AutocompleteVhsys } from "@/components/ui/AutocompleteVhsys";

interface TransportadoraOpcao {
  id_vhsys: number;
  nome: string;
}

export interface FreteTransportadoraValue {
  freteValor: string;           // string decimal, ex.: "50.00"
  fretePor: "" | "0" | "1" | "9";
  transportadoraId: number | undefined;
  transportadoraNome: string;   // texto exibido no autocomplete
}

interface Props {
  value: FreteTransportadoraValue;
  onChange: (v: FreteTransportadoraValue) => void;
}

const MODALIDADE_LABELS: Record<string, string> = {
  "0": "Remetente (CIF)",
  "1": "Destinatário (FOB)",
  "9": "Sem frete",
};

export function FreteTransportadoraOrcamento({ value, onChange }: Props) {
  function set<K extends keyof FreteTransportadoraValue>(k: K, v: FreteTransportadoraValue[K]) {
    onChange({ ...value, [k]: v });
  }

  function selecionarTransportadora(t: TransportadoraOpcao) {
    onChange({
      ...value,
      transportadoraId: t.id_vhsys,
      transportadoraNome: t.nome,
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Valor do frete (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.freteValor}
            onChange={(e) => set("freteValor", e.target.value)}
            placeholder="0.00"
            className="input-base w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Modalidade</label>
          <select
            value={value.fretePor}
            onChange={(e) => set("fretePor", e.target.value as FreteTransportadoraValue["fretePor"])}
            className="input-base w-full"
          >
            <option value="">— Não informado —</option>
            {Object.entries(MODALIDADE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Transportadora</label>
        <AutocompleteVhsys<TransportadoraOpcao>
          endpoint="/api/buscar-transportadoras"
          placeholder="Buscar transportadora..."
          value={value.transportadoraNome}
          onChange={(texto) =>
            onChange({ ...value, transportadoraNome: texto, transportadoraId: undefined })
          }
          onSelecionar={selecionarTransportadora}
          renderOpcao={(t) => (
            <span className="font-medium">{t.nome}</span>
          )}
        />
      </div>
    </div>
  );
}
