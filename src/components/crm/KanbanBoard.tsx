"use client";

import { useState, useTransition, type ReactNode } from "react";
import { formatBRL } from "@/lib/format";

export interface KanbanColuna {
  id: number;
  nome: string;
  segmentoLabel?: string;
  segmentoCor?: string; // classe Tailwind do border-bottom, ex: "border-amber-300"
}

interface KanbanBoardProps<T> {
  colunas: KanbanColuna[];
  itens: T[];
  getColunaId: (item: T) => number | null;
  getId: (item: T) => string | number;
  getValor: (item: T) => number;
  /** Recebe a coluna EFETIVA do item (respeita override otimista do DnD), para
   *  o card refletir a nova situação imediatamente após arrastar. */
  renderCard: (item: T, colunaId: number) => ReactNode;
  atingiuLimitePorColuna?: Record<number, boolean>;
  carregarMais?: (
    colunaId: number,
    offset: number
  ) => Promise<{ itens: T[]; erro?: boolean }>;
  larguraColuna?: string; // ex: "w-72" (default)
  /** Texto exibido quando a coluna está vazia. Default: "Nenhum item nesta coluna". */
  mensagemVazio?: string;
  /**
   * Quando fornecida, ativa o drag-and-drop nativo (HTML5) para mover cards entre
   * colunas. Sem esta prop o board funciona exatamente como antes.
   */
  onMoverCard?: (item: T, colunaDestinoId: number) => Promise<{ ok: boolean; erro?: string }>;
  /** Quando retorna false para um item, esse card não pode ser arrastado. */
  podeMoverItem?: (item: T) => boolean;
}

export function KanbanBoard<T>({
  colunas,
  itens,
  getColunaId,
  getId,
  getValor,
  renderCard,
  atingiuLimitePorColuna = {},
  carregarMais,
  larguraColuna = "w-72",
  mensagemVazio = "Nenhum item nesta coluna",
  onMoverCard,
  podeMoverItem,
}: KanbanBoardProps<T>) {
  // Extras carregados via "Carregar mais" — chaveados por coluna id
  const [extras, setExtras] = useState<Record<number, T[]>>({});
  const [carregandoCol, setCarregandoCol] = useState<Record<number, boolean>>({});
  // Rastreia tamanho do último lote por coluna; < 50 = sem mais dados
  const [ultimoLote, setUltimoLote] = useState<Record<number, number>>({});
  const [, startTransition] = useTransition();

  // ── Estado de DnD (inerte quando onMoverCard não é fornecido) ─────────────
  const [arrastando, setArrastando] = useState<T | null>(null);
  const [overColuna, setOverColuna] = useState<number | null>(null);
  /** Update otimista: itemId → colunaId sobrescreve a coluna real enquanto aguarda resposta */
  const [overrides, setOverrides] = useState<Record<string | number, number>>({});
  const [erroMover, setErroMover] = useState<string | null>(null);

  /** Coluna efetiva do item: respeita override otimista se existir. */
  function colunaEfetiva(item: T): number | null {
    const id = getId(item);
    return id in overrides ? overrides[id] : getColunaId(item);
  }

  function handleCarregarMais(colunaId: number, offsetAtual: number) {
    if (!carregarMais) return;
    setCarregandoCol((prev) => ({ ...prev, [colunaId]: true }));
    startTransition(async () => {
      const resultado = await carregarMais(colunaId, offsetAtual);
      setCarregandoCol((prev) => ({ ...prev, [colunaId]: false }));
      if (!resultado.erro) {
        setExtras((prev) => ({
          ...prev,
          [colunaId]: [...(prev[colunaId] ?? []), ...resultado.itens],
        }));
        // Registra tamanho do lote para esconder o botão quando < 50
        setUltimoLote((prev) => ({ ...prev, [colunaId]: resultado.itens.length }));
      }
    });
  }

  async function handleDrop(item: T, colunaDestinoId: number) {
    if (!onMoverCard) return;
    const origem = colunaEfetiva(item);
    if (origem === colunaDestinoId) return;

    const itemId = getId(item);

    // Aplicar override otimista
    setOverrides((prev) => ({ ...prev, [itemId]: colunaDestinoId }));

    const res = await onMoverCard(item, colunaDestinoId);
    if (!res?.ok) {
      // Reverter override em caso de falha
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setErroMover(res?.erro ?? "Falha ao mover.");
    } else {
      setErroMover(null);
    }
  }

  return (
    <div className="overflow-x-auto pb-2">
      {/* Banner de erro DnD */}
      {erroMover && (
        <div className="mb-3 flex items-center justify-between rounded bg-red-50 p-2 text-sm text-red-700">
          <span>{erroMover}</span>
          <button
            type="button"
            onClick={() => setErroMover(null)}
            className="ml-4 text-red-500 hover:text-red-700"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex min-w-max gap-4">
        {colunas.map((coluna) => {
          // Usa colunaEfetiva para distribuir itens (respeita overrides otimistas)
          const daColuna = itens.filter((item) => colunaEfetiva(item) === coluna.id);

          // Extras: remove duplicatas contra os itens já presentes na coluna
          const extrasColuna = (extras[coluna.id] ?? []).filter(
            (extra) => !daColuna.some((item) => getId(item) === getId(extra))
          );
          const todos = [...daColuna, ...extrasColuna];

          const total = todos.reduce((acc, item) => acc + getValor(item), 0);
          const offsetParaProxima = daColuna.length + (extras[coluna.id]?.length ?? 0);

          // Mostrar botão "Carregar mais" somente se:
          //   - ainda não clicou (atingiu limite) OU último lote retornou exatamente 50
          //   - nunca mostrar se último lote < 50 (sem mais dados no servidor)
          const jaCarregouExtras = coluna.id in ultimoLote;
          const podeCarregarMais =
            carregarMais !== undefined &&
            (jaCarregouExtras
              ? ultimoLote[coluna.id] >= 50
              : Boolean(atingiuLimitePorColuna[coluna.id]));

          const bordaCor = coluna.segmentoCor ?? "border-transparent";
          const isDropTarget = onMoverCard && overColuna === coluna.id && arrastando;

          return (
            <div
              key={coluna.id}
              className={`flex min-h-[200px] ${larguraColuna} shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-100/60 transition-shadow${isDropTarget ? " ring-2 ring-primary-400" : ""}`}
              onDragOver={
                onMoverCard
                  ? (e) => {
                      if (arrastando) {
                        e.preventDefault();
                        setOverColuna(coluna.id);
                      }
                    }
                  : undefined
              }
              onDragLeave={
                onMoverCard
                  ? () => setOverColuna((c) => (c === coluna.id ? null : c))
                  : undefined
              }
              onDrop={
                onMoverCard
                  ? (e) => {
                      e.preventDefault();
                      const item = arrastando;
                      setArrastando(null);
                      setOverColuna(null);
                      if (!item) return;
                      void handleDrop(item, coluna.id);
                    }
                  : undefined
              }
            >
              <div className={`border-b-2 px-4 py-3 ${bordaCor}`}>
                {coluna.segmentoLabel && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {coluna.segmentoLabel}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">{coluna.nome}</h2>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-600 shadow-sm">
                    {todos.length}
                    {atingiuLimitePorColuna[coluna.id] && (
                      <span className="ml-0.5 text-gray-400">+</span>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatBRL(total)}</p>
              </div>

              <div className="flex-1 space-y-3 p-3">
                {todos.map((item) => {
                  const arrastavel = !!onMoverCard && (podeMoverItem ? podeMoverItem(item) : true);
                  const esteArrastando = arrastavel && arrastando !== null && getId(arrastando) === getId(item);
                  return (
                    <div
                      key={getId(item)}
                      draggable={arrastavel ? true : undefined}
                      onDragStart={
                        arrastavel
                          ? () => setArrastando(item)
                          : undefined
                      }
                      onDragEnd={
                        arrastavel
                          ? () => { setArrastando(null); setOverColuna(null); }
                          : undefined
                      }
                      className={arrastavel ? `cursor-grab active:cursor-grabbing${esteArrastando ? " opacity-50" : ""}` : undefined}
                    >
                      {renderCard(item, coluna.id)}
                    </div>
                  );
                })}
                {todos.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-gray-400">
                    {mensagemVazio}
                  </p>
                )}
              </div>

              {/* Botão "Carregar mais" quando há mais itens além do limite */}
              {podeCarregarMais && (
                <div className="border-t border-gray-200 p-3">
                  <button
                    type="button"
                    disabled={carregandoCol[coluna.id]}
                    onClick={() => handleCarregarMais(coluna.id, offsetParaProxima)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {carregandoCol[coluna.id] ? "Carregando…" : "Carregar mais"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
