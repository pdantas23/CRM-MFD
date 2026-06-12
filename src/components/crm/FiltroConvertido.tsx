"use client";
// Filtro específico de Orçamentos: "Convertido em pedido?" (Qualquer/Sim/Não).
// Atua sobre pedido_emitido via param na URL.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";

const OPCOES: OpcaoFiltro[] = [
  { valor: "true", label: "Sim" },
  { valor: "false", label: "Não" },
];

export function FiltroConvertido() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const atual = searchParams.get("pedido_emitido") ?? undefined;

  function onChange(v: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (v) params.set("pedido_emitido", v);
    else params.delete("pedido_emitido");
    params.delete("pagina");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
