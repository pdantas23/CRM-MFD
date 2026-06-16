"use client";
// Editor de parcelas do orçamento: lista controlled de parcelas com
// data, valor, forma de pagamento e observação.
// Mostra aviso (não bloqueante) se soma divergir do total do orçamento.

import { formatBRL } from "@/lib/format";
import { InputValor } from "@/components/ui/InputValor";

export interface ParcelaForm {
  key: number;
  data: string;
  valor: number;        // número (centavos-first via InputValor)
  formaPagamento: string;
  observacao: string;
}

interface Props {
  parcelas: ParcelaForm[];
  onChange: (parcelas: ParcelaForm[]) => void;
  nextKey: React.MutableRefObject<number>;
  /** Total do orçamento para comparar com a soma das parcelas */
  totalOrcamento?: number;
  /** Quando false, o botão "+ Adicionar parcela" fica desabilitado. */
  podeAdicionar?: boolean;
}

const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Cheque",
  "Permuta",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Transferência",
  "Ted",
  "Depósito Identificado",
  "Depósito em C/C",
  "Duplicata Mercantil",
  "Faturado",
  "Faturar",
  "Débito Automático",
  "Lotérica",
  "Banco",
  "DDA",
  "Pagamento online",
  "BNDES",
  "Outros",
  "DP Descontada",
  "CH Descontado",
  "Vale Alimentação",
  "Vale Refeição",
  "Vale Presente",
  "Vale Combustível",
] as const;

export function ParcelasEditor({ parcelas, onChange, nextKey, totalOrcamento, podeAdicionar = true }: Props) {
  function adicionar() {
    onChange([
      ...parcelas,
      {
        key: nextKey.current++,
        data: "",
        valor: 0,
        formaPagamento: "Boleto",
        observacao: "",
      },
    ]);
  }

  function remover(key: number) {
    onChange(parcelas.filter((p) => p.key !== key));
  }

  function atualizar<K extends keyof ParcelaForm>(key: number, campo: K, val: ParcelaForm[K]) {
    onChange(
      parcelas.map((p) => (p.key === key ? { ...p, [campo]: val } : p))
    );
  }

  const somaParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const diverge =
    totalOrcamento !== undefined &&
    totalOrcamento > 0 &&
    parcelas.length > 0 &&
    Math.abs(somaParcelas - totalOrcamento) > 0.01;

  return (
    <div className="space-y-2">
      {parcelas.length > 0 && (
        <div className="space-y-2">
          {parcelas.map((p) => (
            <div key={p.key} className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Data</label>
                <input
                  type="date"
                  value={p.data}
                  onChange={(e) => atualizar(p.key, "data", e.target.value)}
                  className="input-base w-full text-xs"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-gray-600">Valor (R$)</label>
                <InputValor
                  value={p.valor}
                  onChange={(n) => atualizar(p.key, "valor", n)}
                  placeholder="0,00"
                  cinzaSeZero
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Forma</label>
                <select
                  value={p.formaPagamento}
                  onChange={(e) => atualizar(p.key, "formaPagamento", e.target.value)}
                  className="input-base w-full text-xs"
                >
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Observação</label>
                <input
                  type="text"
                  value={p.observacao}
                  onChange={(e) => atualizar(p.key, "observacao", e.target.value)}
                  maxLength={255}
                  placeholder="Opcional"
                  className="input-base w-full text-xs"
                />
              </div>
              <div className="pb-1">
                <button
                  type="button"
                  onClick={() => remover(p.key)}
                  className="text-red-400 hover:text-red-600"
                  title="Remover parcela"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={adicionar}
        disabled={!podeAdicionar}
        title={podeAdicionar ? undefined : "Adicione um produto primeiro"}
        className="text-sm text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:text-gray-400"
      >
        + Adicionar parcela
      </button>

      {parcelas.length > 0 && (
        <p className="text-right text-xs text-gray-500">
          Soma das parcelas: <span className="font-medium">{formatBRL(somaParcelas)}</span>
          {totalOrcamento !== undefined && totalOrcamento > 0 && (
            <span className="ml-1 text-gray-400">/ total: {formatBRL(totalOrcamento)}</span>
          )}
        </p>
      )}

      {diverge && (
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          Atenção: a soma das parcelas ({formatBRL(somaParcelas)}) difere do total do orçamento ({formatBRL(totalOrcamento!)}).
        </p>
      )}
    </div>
  );
}
