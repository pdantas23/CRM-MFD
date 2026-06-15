"use client";
// Seção de campos comerciais do orçamento: data, prazo, referência,
// observação pública, observação interna, desconto global (R$ e %).

export interface CamposComerciaisValue {
  validade: string;
  obs: string;
  prazoOrcamento: string;   // dias, string para input
  referencia: string;
  obsInterno: string;
  descontoReais: string;    // "10.00" — string decimal
  descontoPorc: string;     // "5.00" — string decimal
  status: string;
}

interface Props {
  value: CamposComerciaisValue;
  onChange: (v: CamposComerciaisValue) => void;
  /** Exibe campo Status apenas quando explicitamente solicitado (ex.: edição) */
  mostrarStatus?: boolean;
}

const STATUS_OPTIONS = [
  "Em Aberto",
  "Em Andamento",
  "Atendido",
  "Cancelado",
];

export function CamposComerciaisOrcamento({ value, onChange, mostrarStatus }: Props) {
  function set<K extends keyof CamposComerciaisValue>(k: K, v: CamposComerciaisValue[K]) {
    onChange({ ...value, [k]: v });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Validade</label>
          <input
            type="date"
            value={value.validade}
            onChange={(e) => set("validade", e.target.value)}
            className="input-base w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Prazo de entrega (dias)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={value.prazoOrcamento}
            onChange={(e) => set("prazoOrcamento", e.target.value)}
            placeholder="Ex.: 7"
            className="input-base w-full"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Referência</label>
        <input
          type="text"
          value={value.referencia}
          onChange={(e) => set("referencia", e.target.value)}
          maxLength={100}
          placeholder="Código ou referência interna"
          className="input-base w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Observação pública</label>
        <input
          type="text"
          value={value.obs}
          onChange={(e) => set("obs", e.target.value)}
          maxLength={500}
          placeholder="Visível para o cliente"
          className="input-base w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Observação interna</label>
        <input
          type="text"
          value={value.obsInterno}
          onChange={(e) => set("obsInterno", e.target.value)}
          maxLength={500}
          placeholder="Não exibida ao cliente"
          className="input-base w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Desconto global (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.descontoReais}
            onChange={(e) => set("descontoReais", e.target.value)}
            placeholder="0.00"
            className="input-base w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Desconto global (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={value.descontoPorc}
            onChange={(e) => set("descontoPorc", e.target.value)}
            placeholder="0.00"
            className="input-base w-full"
          />
        </div>
      </div>

      {mostrarStatus && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
          <select
            value={value.status}
            onChange={(e) => set("status", e.target.value)}
            className="input-base w-full"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
