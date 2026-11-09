"use client";
// Filtros avançados da aba Serviços (conta, montador, cidade, pagamento e
// período). Aplicam na hora; o modal só agrupa os campos. As opções saem dos
// próprios serviços.

import { DropdownFiltro } from "@/components/ui/DropdownFiltro";
import { CampoData } from "./CampoData";

export interface FiltrosAvancados {
  conta?: string;
  montador?: string;
  cidade?: string;
  pagamento?: string;
  de: string;
  ate: string;
}

export const FILTROS_VAZIOS: FiltrosAvancados = { de: "", ate: "" };

export const OPCOES_PAGAMENTO = [
  { valor: "falta", label: "Com saldo a pagar" },
  { valor: "quitado", label: "Quitado" },
];

const paraOpcoes = (lista: string[]) => lista.map((v) => ({ valor: v, label: v }));

export function FiltrosServicos({
  filtros,
  contas,
  montadores,
  cidades,
  onMudar,
  onFechar,
}: {
  filtros: FiltrosAvancados;
  contas: string[];
  /** Vazio para o montador, que só vê os próprios serviços. */
  montadores: string[];
  cidades: string[];
  onMudar: (f: FiltrosAvancados) => void;
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          {contas.length > 1 && (
            <DropdownFiltro
              label="Conta"
              larguraTotal
              placeholder="Todas"
              opcoes={paraOpcoes(contas)}
              valorAtual={filtros.conta}
              onChange={(conta) => onMudar({ ...filtros, conta })}
            />
          )}
          {montadores.length > 0 && (
            <DropdownFiltro
              label="Montador"
              larguraTotal
              opcoes={paraOpcoes(montadores)}
              valorAtual={filtros.montador}
              onChange={(montador) => onMudar({ ...filtros, montador })}
            />
          )}
          <DropdownFiltro
            label="Cidade"
            larguraTotal
            placeholder="Todas"
            opcoes={paraOpcoes(cidades)}
            valorAtual={filtros.cidade}
            onChange={(cidade) => onMudar({ ...filtros, cidade })}
          />
          <DropdownFiltro
            label="Pagamento"
            larguraTotal
            opcoes={OPCOES_PAGAMENTO}
            valorAtual={filtros.pagamento}
            onChange={(pagamento) => onMudar({ ...filtros, pagamento })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Data de</label>
              <CampoData value={filtros.de} onChange={(de) => onMudar({ ...filtros, de })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Data até</label>
              <CampoData value={filtros.ate} onChange={(ate) => onMudar({ ...filtros, ate })} />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 border-t px-5 py-3">
          <button type="button" onClick={() => onMudar(FILTROS_VAZIOS)} className="btn-secondary">
            Limpar
          </button>
          <button type="button" onClick={onFechar} className="btn-primary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
