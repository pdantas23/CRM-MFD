"use client";
// Filtros específicos de Entregas:
// - Dropdown de período do dia (Manhã/Tarde/Noite)
// - Toggle "Só com saldo a receber" (pedido vinculado com saldo > 0)

import { useFiltrosUrl } from "./FiltrosUrlProvider";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";

const OPCOES_PERIODO: OpcaoFiltro[] = [
  { valor: "manha", label: "Manhã" },
  { valor: "tarde", label: "Tarde" },
  { valor: "noite", label: "Noite" },
];

export function FiltrosEntrega({
  contasOpcoes = [],
}: {
  /** Contas do mural compartilhado (slug + rótulo). Vazio = não mostra o filtro. */
  contasOpcoes?: { slug: string; label: string }[];
}) {
  const { aplicar, getParam } = useFiltrosUrl();

  const periodoAtual = getParam("periodo_entrega");
  const comSaldo = getParam("com_saldo") === "true";
  const contaAtual = getParam("conta");

  const opcoesConta: OpcaoFiltro[] = contasOpcoes.map((c) => ({
    valor: c.slug,
    label: c.label,
  }));

  return (
    <>
      {opcoesConta.length > 0 && (
        <DropdownFiltro
          label="Conta"
          opcoes={opcoesConta}
          valorAtual={contaAtual}
          onChange={(v) => aplicar({ conta: v })}
          placeholder="Todas as contas"
        />
      )}

      <DropdownFiltro
        label="Período"
        opcoes={OPCOES_PERIODO}
        valorAtual={periodoAtual}
        onChange={(v) => aplicar({ periodo_entrega: v })}
        placeholder="Manhã e Tarde"
      />

      <button
        type="button"
        role="switch"
        aria-checked={comSaldo}
        onClick={() => aplicar({ com_saldo: comSaldo ? undefined : "true" })}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
          comSaldo
            ? "border-primary-600 bg-primary-50 text-primary-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span
          className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
            comSaldo ? "bg-primary-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              comSaldo ? "translate-x-3.5" : "translate-x-0.5"
            }`}
          />
        </span>
        Só com saldo a receber
      </button>
    </>
  );
}
