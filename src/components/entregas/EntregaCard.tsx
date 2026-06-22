"use client";
// Card compacto de entrega para a grade da tabela semanal.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, ehAtrasada } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
import { moverEntrega, excluirEntrega } from "@/lib/entregas/acoes";
import type { Entrega, Periodo } from "@/lib/types/database";

const PERIODO_OPCOES = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

interface Props {
  entrega: Entrega;
  arrastavel?: boolean;
  isAdmin?: boolean;
  onClick?: () => void;
}

export function EntregaCard({ entrega, isAdmin = false, onClick }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remarcando, setRemarcando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [novaData, setNovaData] = useState(entrega.data);
  const [novoPeriodo, setNovoPeriodo] = useState<Periodo>(entrega.periodo);
  const [erro, setErro] = useState<string | null>(null);

  const entregue = Boolean(entrega.entregue_em);
  const atrasada = ehAtrasada(entrega, hojeISOSaoPaulo());
  const podeAgir = isAdmin && atrasada && !entregue;

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function salvarRemarcacao(e: React.MouseEvent) {
    stop(e);
    setErro(null);
    startTransition(async () => {
      const res = await moverEntrega(entrega.id, novaData, novoPeriodo);
      if (!res.ok && res.erro) setErro(res.erro);
      else setRemarcando(false);
      router.refresh();
    });
  }

  function confirmarExclusao(e: React.MouseEvent) {
    stop(e);
    setErro(null);
    startTransition(async () => {
      const res = await excluirEntrega(entrega.id);
      if (!res.ok && res.erro) setErro(res.erro);
      router.refresh();
    });
  }

  // Realce de borda: entregue (verde) tem prioridade sobre atrasada (vermelho).
  const borda = entregue
    ? "border-emerald-300"
    : atrasada
      ? "border-red-300"
      : "border-gray-200";

  return (
    <div
      onClick={onClick}
      className={`rounded-md border bg-white p-2.5 shadow-sm transition-colors hover:border-gray-300 ${borda}${
        onClick ? " cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="truncate text-sm font-semibold text-gray-900">
          {entrega.nome_cliente}
        </p>
        {entregue ? (
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Entregue">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : atrasada ? (
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Atrasada">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        ) : null}
      </div>
      {entrega.bairro && (
        <p className="mt-0.5 truncate text-xs text-gray-500">{entrega.bairro}</p>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <StatusBadge status={entrega.status} curto />
        {entrega.numero_orcamento && (
          <span className="shrink-0 text-[11px] text-gray-400">
            #{entrega.numero_orcamento}
          </span>
        )}
      </div>

      {podeAgir && (
        <div
          className="mt-2 border-t border-gray-100 pt-1.5"
          onClick={stop}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {!remarcando && !confirmando && (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={(e) => { stop(e); setRemarcando(true); setErro(null); }}
                disabled={pending}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remarcar
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); setConfirmando(true); setErro(null); }}
                disabled={pending}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          )}

          {remarcando && (
            <div className="flex flex-col gap-1.5">
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="input-base w-full py-1 text-xs"
              />
              <Select
                options={PERIODO_OPCOES}
                value={novoPeriodo}
                onChange={(v) => setNovoPeriodo(v as Periodo)}
                className="w-full"
                ariaLabel="Período"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => { stop(e); setRemarcando(false); }}
                  disabled={pending}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarRemarcacao}
                  disabled={pending}
                  className="btn-secondary py-1 text-xs disabled:opacity-50"
                >
                  {pending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          )}

          {confirmando && (
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto text-xs text-gray-600">Excluir entrega?</span>
              <button
                type="button"
                onClick={(e) => { stop(e); setConfirmando(false); }}
                disabled={pending}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={pending}
                className="btn-danger py-1 text-xs disabled:opacity-50"
              >
                {pending ? "Excluindo…" : "Sim, excluir"}
              </button>
            </div>
          )}

          {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        </div>
      )}
    </div>
  );
}
