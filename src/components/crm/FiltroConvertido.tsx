"use client";
// Filtro específico de Orçamentos: "Convertido em pedido?" (Qualquer/Sim/Não).
// Atua sobre pedido_emitido via param na URL.

import { useFiltrosUrl } from "./FiltrosUrlProvider";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";

const OPCOES: OpcaoFiltro[] = [
  { valor: "true", label: "Sim" },
  { valor: "false", label: "Não" },
];

export function FiltroConvertido() {
  const { aplicar, getParam } = useFiltrosUrl();

  const atual = getParam("pedido_emitido");

  function onChange(v: string | undefined) {
    aplicar({ pedido_emitido: v });
  }

  return (
    <DropdownFiltro
      label="Convertido"
      opcoes={OPCOES}
      valorAtual={atual}
      onChange={onChange}
      placeholder="Qualquer"
    />
  );
}
