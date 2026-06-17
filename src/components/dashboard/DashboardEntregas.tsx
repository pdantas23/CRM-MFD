"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge, statusRowClass } from "@/components/ui/Badge";
import { EntregaModal } from "@/components/entregas/EntregaModal";
import type { Entrega } from "@/lib/types/database";

interface Props {
  manha: Entrega[];
  tarde: Entrega[];
  isAdmin: boolean;
}

export function DashboardEntregas({ manha, tarde, isAdmin }: Props) {
  const [manhaList, setManhaList] = useState(manha);
  const [tardeList, setTardeList] = useState(tarde);

  return (
    <div className="space-y-4">
      <PeriodoSection
        titulo="Manhã"
        accent="bg-amber-100"
        iconClass="text-amber-600"
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        }
        entregas={manhaList}
        setEntregas={setManhaList}
        isAdmin={isAdmin}
      />
      <PeriodoSection
        titulo="Tarde"
        accent="bg-orange-100"
        iconClass="text-orange-600"
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        }
        entregas={tardeList}
        setEntregas={setTardeList}
        isAdmin={isAdmin}
      />
    </div>
  );
}

interface PeriodoSectionProps {
  titulo: string;
  accent: string;
  iconClass: string;
  icon: React.ReactNode;
  entregas: Entrega[];
  setEntregas: React.Dispatch<React.SetStateAction<Entrega[]>>;
  isAdmin: boolean;
}

function PeriodoSection({
  titulo,
  accent,
  iconClass,
  icon,
  entregas,
  setEntregas,
  isAdmin,
}: PeriodoSectionProps) {
  const router = useRouter();
  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function move(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= entregas.length) return;

    const next = [...entregas];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setEntregas(next);

    setSavingId(next[swapIndex].id);
    try {
      const supabase = createClient();
      // Persiste a ordem de TODOS os itens da seção pra normalizar valores.
      await Promise.all(
        next.map((e, i) =>
          supabase.from("entregas").update({ ordem: i }).eq("id", e.id)
        )
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <svg className={`h-5 w-5 ${iconClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
          <p className="text-xs text-gray-500">
            {entregas.length} {entregas.length === 1 ? "entrega" : "entregas"}
          </p>
        </div>
      </header>

      {entregas.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          Nenhuma entrega para este período.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entregas.map((entrega, index) => {
            const isSaving = savingId === entrega.id;
            return (
              <li key={entrega.id}>
                <div
                  onClick={() => setModalEntrega(entrega)}
                  className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors ${statusRowClass[entrega.status]}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-xs font-semibold text-gray-600">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {entrega.nome_cliente}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {entrega.bairro}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={entrega.status} />

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); move(index, "up"); }}
                          disabled={index === 0 || isSaving}
                          aria-label="Mover para cima"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); move(index, "down"); }}
                          disabled={index === entregas.length - 1 || isSaving}
                          aria-label="Mover para baixo"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalEntrega && (
        <EntregaModal
          entrega={modalEntrega}
          isAdmin={isAdmin}
          onClose={() => setModalEntrega(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </section>
  );
}
