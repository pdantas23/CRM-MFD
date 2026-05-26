"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/Badge";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            const isExpanded = expandedId === entrega.id;
            const isSaving = savingId === entrega.id;
            return (
              <li key={entrega.id}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
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
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entrega.id)
                      }
                      aria-label={isExpanded ? "Ocultar informações" : "Ver informações"}
                      aria-expanded={isExpanded}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                        isExpanded
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isExpanded ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        ) : (
                          <>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </>
                        )}
                      </svg>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, "up")}
                          disabled={index === 0 || isSaving}
                          aria-label="Mover para cima"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, "down")}
                          disabled={index === entregas.length - 1 || isSaving}
                          aria-label="Mover para baixo"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Field label="CPF / CNPJ" value={entrega.cpf_cnpj} />
                      <Field label="Nº Orçamento" value={entrega.numero_orcamento} />
                      <Field label="Bairro" value={entrega.bairro} />
                      <Field label="Endereço" value={entrega.endereco} />
                      {entrega.anexo_url && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                            Anexo
                          </dt>
                          <dd className="mt-1">
                            <a
                              href={entrega.anexo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {entrega.anexo_nome ?? "Abrir anexo"}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-4">
                      <Link
                        href={`/entregas/${entrega.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Abrir detalhes →
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
