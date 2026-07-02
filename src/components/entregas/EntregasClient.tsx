"use client";
// Gerencia a tabela de entregas com toolbar e métricas padronizados.
// Recebe dados já buscados pelo server component.

import Link from "next/link";
import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { BotaoNavegacao } from "@/components/ui/BotaoNavegacao";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltrosEntrega } from "@/components/crm/FiltrosEntrega";
import { FiltrosUrlProvider } from "@/components/crm/FiltrosUrlProvider";
import { OverlayCarregando } from "@/components/crm/OverlayCarregando";
import {
  PeriodoBadge,
  StatusBadge,
  statusRowClass,
  AtrasadaBadge,
  EntregueBadge,
  ehAtrasada,
} from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { EntregaModal } from "@/components/entregas/EntregaModal";
import { ContaBadge, type ContaInfoMap } from "@/components/entregas/ContaBadge";
import {
  marcarEntregaEntregue,
  desmarcarEntregaEntregue,
  moverEntrega,
} from "@/lib/entregas/acoes";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { Metrica } from "@/lib/crm/metricas";
import type { Entrega, Periodo } from "@/lib/types/database";

interface EntregasClientProps {
  entregas: Entrega[];
  filtros: FiltrosCrm;
  metricas: Metrica[];
  podeNovaEntrega: boolean;
  isAdmin: boolean;
  contas: ContaInfoMap;
  mostrarConta: boolean;
  contasOpcoes: { slug: string; label: string }[];
}

const STATUS_OPCOES = [
  { id: "entrega_final", nome: "Entrega Final" },
  { id: "entrega_parcial", nome: "Entrega Parcial" },
];

const PERIODO_OPCOES = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function LinhaEntrega({
  entrega,
  isAdmin,
  hojeIso,
  contas,
  mostrarConta,
  onAbrir,
  onAviso,
}: {
  entrega: Entrega;
  isAdmin: boolean;
  hojeIso: string;
  contas: ContaInfoMap;
  mostrarConta: boolean;
  onAbrir: () => void;
  onAviso: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remarcando, setRemarcando] = useState(false);
  const [novaData, setNovaData] = useState(entrega.data);
  const [novoPeriodo, setNovoPeriodo] = useState<Periodo>(entrega.periodo);

  const atrasada = ehAtrasada(entrega, hojeIso);
  const entregue = Boolean(entrega.entregue_em);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function marcar() {
    onAviso(null);
    startTransition(async () => {
      const res = await marcarEntregaEntregue(entrega.id);
      if (!res.ok) onAviso(res.erro);
      else if (res.aviso) onAviso(res.aviso);
      router.refresh();
    });
  }

  function desmarcar() {
    onAviso(null);
    startTransition(async () => {
      const res = await desmarcarEntregaEntregue(entrega.id);
      if (!res.ok && res.erro) onAviso(res.erro);
      router.refresh();
    });
  }

  function salvarRemarcacao() {
    onAviso(null);
    startTransition(async () => {
      const res = await moverEntrega(entrega.id, novaData, novoPeriodo);
      if (!res.ok && res.erro) onAviso(res.erro);
      else setRemarcando(false);
      router.refresh();
    });
  }

  // Linha atrasada ganha realce vermelho (sobrepõe a cor por status).
  const rowClass = atrasada
    ? "bg-red-50 hover:bg-red-100 border-l-4 border-red-400"
    : statusRowClass[entrega.status];

  return (
    <tr
      onClick={onAbrir}
      className={`cursor-pointer transition-colors ${rowClass}`}
    >
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
        {formatDate(entrega.data)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {mostrarConta && <ContaBadge contaId={entrega.conta_id} contas={contas} />}
          <p className="text-sm font-medium text-gray-900">{entrega.nome_cliente}</p>
        </div>
        <p className="text-xs text-gray-500">{entrega.cpf_cnpj}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
        {entrega.numero_orcamento}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{entrega.bairro}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <PeriodoBadge periodo={entrega.periodo} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={entrega.status} />
          {entregue ? <EntregueBadge /> : atrasada ? <AtrasadaBadge /> : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-2" onClick={stop}>
          <div className="flex items-center justify-end gap-3">
            {isAdmin && (
              entregue ? (
                <button
                  type="button"
                  onClick={desmarcar}
                  disabled={pending}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Desmarcar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={marcar}
                  disabled={pending}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  Marcar entregue
                </button>
              )
            )}
            {isAdmin && atrasada && !entregue && (
              <button
                type="button"
                onClick={() => setRemarcando((v) => !v)}
                disabled={pending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remarcar
              </button>
            )}
            {isAdmin && (
              <Link
                href={`/entregas/${entrega.id}/editar`}
                onClick={stop}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Editar
              </Link>
            )}
          </div>

          {remarcando && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="input-base w-auto py-1 text-sm"
              />
              <Select
                options={PERIODO_OPCOES}
                value={novoPeriodo}
                onChange={(v) => setNovoPeriodo(v as Periodo)}
                className="w-28"
                ariaLabel="Período"
              />
              <button
                type="button"
                onClick={salvarRemarcacao}
                disabled={pending}
                className="btn-secondary py-1 text-sm disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function TabelaInterna({
  entregas,
  isAdmin,
  contas,
  mostrarConta,
}: {
  entregas: Entrega[];
  isAdmin: boolean;
  contas: ContaInfoMap;
  mostrarConta: boolean;
}) {
  const router = useRouter();
  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const hojeIso = hojeISOSaoPaulo();

  if (entregas.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm font-medium text-gray-500">Nenhuma entrega encontrada</p>
        <p className="mt-1 text-sm text-gray-400">Tente ajustar os filtros ou crie uma nova entrega.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {aviso && (
        <div className="flex items-start justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>{aviso}</span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="shrink-0 font-medium text-amber-700 hover:text-amber-900"
          >
            Fechar
          </button>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cliente</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Orçamento</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bairro</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Período</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entregas.map((entrega) => (
            <LinhaEntrega
              key={entrega.id}
              entrega={entrega}
              isAdmin={isAdmin}
              hojeIso={hojeIso}
              contas={contas}
              mostrarConta={mostrarConta}
              onAbrir={() => setModalEntrega(entrega)}
              onAviso={setAviso}
            />
          ))}
        </tbody>
      </table>

      {modalEntrega && (
        <EntregaModal
          entrega={modalEntrega}
          isAdmin={isAdmin}
          onClose={() => setModalEntrega(null)}
          onChanged={() => router.refresh()}
          contas={contas}
          mostrarConta={mostrarConta}
        />
      )}
    </div>
  );
}

export function EntregasClient({
  entregas,
  filtros,
  metricas,
  podeNovaEntrega,
  isAdmin,
  contas,
  mostrarConta,
  contasOpcoes,
}: EntregasClientProps) {
  return (
    <FiltrosUrlProvider>
      <EntityToolbar
        filtros={filtros}
        situacoes={STATUS_OPCOES}
        situacoesSelecionadas={filtros.situacoesStr}
        mostrarVendedor={false}
        placeholderBusca="Buscar cliente, bairro, endereço, orçamento…"
        acaoPrimaria={
          podeNovaEntrega ? (
            <BotaoNavegacao
              href="/entregas/nova"
              className="btn-primary w-full sm:w-auto"
              labelPending="Abrindo…"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Entrega
            </BotaoNavegacao>
          ) : undefined
        }
        filtroEspecifico={
          <Suspense>
            <FiltrosEntrega
              contasOpcoes={mostrarConta ? contasOpcoes : []}
            />
          </Suspense>
        }
      />

      <OverlayCarregando>
        <EntityMetrics metricas={metricas} />

        <div className="card overflow-hidden">
          <TabelaInterna
            entregas={entregas}
            isAdmin={isAdmin}
            contas={contas}
            mostrarConta={mostrarConta}
          />
        </div>
      </OverlayCarregando>
    </FiltrosUrlProvider>
  );
}
