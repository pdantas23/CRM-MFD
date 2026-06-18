"use client";
// Visão de entregas do ADMIN: alterna entre o calendário semanal e a lista
// completa (tabela + filtros + métricas) via uma mini-navbar (ViewToggle).

import { useState } from "react";
import { ViewToggle } from "@/components/crm/ViewToggle";
import { TabelaSemanalEntregas } from "@/components/entregas/TabelaSemanalEntregas";
import { EntregasClient } from "@/components/entregas/EntregasClient";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { Metrica } from "@/lib/crm/metricas";
import type { Entrega } from "@/lib/types/database";

interface Props {
  /** Entregas da semana corrente (seg–sáb) para o calendário. */
  semana: Entrega[];
  inicioSemana: string;
  /** Dados da lista completa. */
  lista: Entrega[];
  filtros: FiltrosCrm;
  metricas: Metrica[];
  podeNovaEntrega: boolean;
}

type Visao = "calendario" | "lista";

const OPCOES = [
  { valor: "calendario", label: "Calendário semanal" },
  { valor: "lista", label: "Lista de entregas" },
];

export function EntregasAdminView({
  semana,
  inicioSemana,
  lista,
  filtros,
  metricas,
  podeNovaEntrega,
}: Props) {
  const [visao, setVisao] = useState<Visao>("calendario");

  return (
    <div className="space-y-4">
      <ViewToggle opcoes={OPCOES} valor={visao} onChange={(v) => setVisao(v as Visao)} />

      {visao === "calendario" ? (
        <TabelaSemanalEntregas entregas={semana} inicioSemana={inicioSemana} isAdmin />
      ) : (
        <EntregasClient
          entregas={lista}
          filtros={filtros}
          metricas={metricas}
          podeNovaEntrega={podeNovaEntrega}
          isAdmin
        />
      )}
    </div>
  );
}
