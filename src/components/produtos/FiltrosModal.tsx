"use client";
// Filtros da aba Produtos (conta, seção e situação), empilhados numa coluna.
// Aplicam na hora; o modal só agrupa os dropdowns. As seções oferecidas
// dependem da conta escolhida (todas as contas = todas as seções).

import { DropdownFiltro } from "@/components/ui/DropdownFiltro";

export const FILTROS_SITUACAO = [
  { valor: "sem_margem", label: "Sem margem" },
  { valor: "margem_negativa", label: "Margem negativa" },
  { valor: "alterado", label: "Alterados não enviados" },
  { valor: "divergente", label: "Diferente no VHSYS" },
  { valor: "erro", label: "Erro de envio" },
  { valor: "aviso_compra", label: "Custo da nota não aplicado" },
  { valor: "sem_vhsys", label: "Sem cadastro no VHSYS" },
] as const;
export type FiltroSituacao = (typeof FILTROS_SITUACAO)[number]["valor"];

export function FiltrosModal({
  contas,
  secoes,
  conta,
  secao,
  situacao,
  onConta,
  onSecao,
  onSituacao,
  onFechar,
}: {
  contas: { id: string; slug: string }[];
  secoes: string[];
  conta: string | undefined;
  secao: string | undefined;
  situacao: FiltroSituacao | undefined;
  onConta: (c: string | undefined) => void;
  onSecao: (s: string | undefined) => void;
  onSituacao: (s: FiltroSituacao | undefined) => void;
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
          <DropdownFiltro
            label="Conta"
            larguraTotal
            placeholder="Todas"
            opcoes={contas.map((c) => ({ valor: c.id, label: c.slug.toUpperCase() }))}
            valorAtual={conta}
            onChange={onConta}
          />
          <DropdownFiltro
            label="Seção"
            larguraTotal
            placeholder="Todas"
            opcoes={secoes.map((s) => ({ valor: s, label: s }))}
            valorAtual={secao}
            onChange={onSecao}
          />
          <DropdownFiltro
            label="Situação"
            larguraTotal
            placeholder="Todas"
            opcoes={FILTROS_SITUACAO.map((f) => ({ valor: f.valor, label: f.label }))}
            valorAtual={situacao}
            onChange={(v) => onSituacao(v as FiltroSituacao | undefined)}
          />
        </div>

        <div className="flex justify-between gap-3 border-t px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onConta(undefined);
              onSecao(undefined);
              onSituacao(undefined);
            }}
            className="btn-secondary"
          >
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
