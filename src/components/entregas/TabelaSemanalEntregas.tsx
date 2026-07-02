"use client";
// Tabela semanal de entregas (segunda a sábado).
//
// - Grade 2D: 6 colunas-dia × 3 blocos de turno (manhã/tarde/noite).
// - Capacidade por turno/dia: manhã=4, tarde=4, noite=2. Excesso é sinalizado
//   (vermelho), nunca bloqueado.
// - Drag-and-drop só para admin (espelha a mecânica do KanbanBoard): override
//   otimista por id, reversão em erro, banner de erro.
// - Datas tratadas como CIVIS (YYYY-MM-DD), manipuladas em UTC para não deslocar
//   o dia conforme o fuso.

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { EntregaCard } from "@/components/entregas/EntregaCard";
import { EntregaModal } from "@/components/entregas/EntregaModal";
import { type ContaInfoMap } from "@/components/entregas/ContaBadge";
import { moverEntrega } from "@/lib/entregas/acoes";
import type { Entrega, Periodo } from "@/lib/types/database";

interface Props {
  entregas: Entrega[]; // todas as entregas da semana (seg–sáb)
  inicioSemana: string; // segunda-feira "YYYY-MM-DD"
  isAdmin: boolean; // habilita o drag-and-drop
  contas: ContaInfoMap;
  mostrarConta: boolean;
}

const DIAS_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Cores por turno (coerentes com o PeriodoBadge): manhã=amber, tarde=orange,
// noite=indigo. `rotulo` = faixa lateral forte; `celula` = fundo suave da coluna.
const TURNOS: {
  periodo: Periodo;
  label: string;
  capacidade: number;
  rotulo: string;
  celula: string;
}[] = [
  { periodo: "manha", label: "Manhã", capacidade: 4, rotulo: "bg-amber-100 text-amber-800", celula: "bg-amber-50/50" },
  { periodo: "tarde", label: "Tarde", capacidade: 4, rotulo: "bg-orange-100 text-orange-800", celula: "bg-orange-50/50" },
  { periodo: "noite", label: "Noite", capacidade: 2, rotulo: "bg-indigo-100 text-indigo-800", celula: "bg-indigo-50/50" },
];

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Soma `dias` a uma data civil YYYY-MM-DD em UTC (sem deslocar pelo fuso local).
function somarDiasCivil(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

// "dd/mm" a partir de YYYY-MM-DD.
function formatarDiaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Rótulo do intervalo, ex.: "16 – 21 jun" ou "30 mai – 4 jun".
function rotuloIntervalo(seg: string, sab: string): string {
  const [, mSeg, dSeg] = seg.split("-").map(Number);
  const [, mSab, dSab] = sab.split("-").map(Number);
  if (mSeg === mSab) return `${dSeg} – ${dSab} ${MESES[mSab - 1]}`;
  return `${dSeg} ${MESES[mSeg - 1]} – ${dSab} ${MESES[mSab - 1]}`;
}

// Hoje no fuso de São Paulo, como YYYY-MM-DD civil.
function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function TabelaSemanalEntregas({ entregas, inicioSemana, isAdmin, contas, mostrarConta }: Props) {
  const router = useRouter();

  // ── DnD: override otimista por id (espelha KanbanBoard) ───────────────────
  const [arrastando, setArrastando] = useState<Entrega | null>(null);
  const [overCelula, setOverCelula] = useState<string | null>(null); // `${data}|${periodo}`
  const [overrides, setOverrides] = useState<
    Record<string, { data: string; periodo: Periodo }>
  >({});
  const [erro, setErro] = useState<string | null>(null);

  const [modalEntrega, setModalEntrega] = useState<Entrega | null>(null);

  // Célula efetiva de uma entrega (respeita override otimista).
  function celulaEfetiva(e: Entrega): { data: string; periodo: Periodo } {
    return overrides[e.id] ?? { data: e.data, periodo: e.periodo };
  }

  async function handleDrop(entrega: Entrega, dataDestino: string, periodoDestino: Periodo) {
    const atual = celulaEfetiva(entrega);
    if (atual.data === dataDestino && atual.periodo === periodoDestino) return;

    // Override otimista.
    setOverrides((prev) => ({
      ...prev,
      [entrega.id]: { data: dataDestino, periodo: periodoDestino },
    }));

    const res = await moverEntrega(entrega.id, dataDestino, periodoDestino);
    if (!res.ok) {
      // Reverte em caso de falha.
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[entrega.id];
        return next;
      });
      setErro(res.erro ?? "Falha ao mover a entrega.");
    } else {
      setErro(null);
    }
  }

  // Dias da semana (civis, somando 0..5 dias à segunda).
  const dias = Array.from({ length: 6 }, (_, i) => somarDiasCivil(inicioSemana, i));
  const sabado = dias[5];
  const hoje = hojeSaoPaulo();

  // Navegação de semana.
  function irPara(novaSegunda: string) {
    router.push(`/entregas?inicio=${novaSegunda}`);
  }

  return (
    <div className="space-y-3">
      {/* Navegação de semana */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => irPara(somarDiasCivil(inicioSemana, -7))}
          aria-label="Semana anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50"
        >
          ‹
        </button>
        <span className="min-w-[8rem] px-2 text-center text-sm font-medium text-gray-700">
          {rotuloIntervalo(inicioSemana, sabado)}
        </span>
        <button
          type="button"
          onClick={() => irPara(somarDiasCivil(inicioSemana, 7))}
          aria-label="Próxima semana"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50"
        >
          ›
        </button>
      </div>

      {/* Banner de erro DnD */}
      {erro && (
        <div className="flex items-center justify-between rounded bg-red-50 p-2 text-sm text-red-700">
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => setErro(null)}
            className="ml-4 text-red-500 hover:text-red-700"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}

      {/* Calendário semanal em matriz: turnos nas LINHAS, dias nas COLUNAS.
          Cada faixa de turno é uma row do grid → as células do mesmo turno têm
          altura uniforme entre os dias (alinhadas à do dia com mais entregas),
          dando simetria. As linhas de grade vêm do `gap-px` sobre fundo cinza. */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[920px] gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200"
          style={{ gridTemplateColumns: "4.5rem repeat(6, minmax(0, 1fr))" }}
        >
          {/* ── Linha de cabeçalho: canto + dias ── */}
          <div className="bg-gray-50" />
          {dias.map((dia, idx) => {
            const isHoje = dia === hoje;
            return (
              <div
                key={dia}
                className={`px-2 py-2 text-center ${isHoje ? "bg-primary-50" : "bg-gray-50"}`}
              >
                <p
                  className={`text-sm font-semibold ${
                    isHoje ? "text-primary-700" : "text-gray-900"
                  }`}
                >
                  {DIAS_LABEL[idx]}
                  {isHoje && (
                    <span className="ml-1 text-xs font-normal text-primary-600">· hoje</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{formatarDiaMes(dia)}</p>
              </div>
            );
          })}

          {/* ── Uma linha por turno: rótulo colorido + 6 células ── */}
          {TURNOS.map(({ periodo, label, capacidade, rotulo, celula }) => (
            <Fragment key={periodo}>
              {/* Rótulo lateral do turno (cor forte) */}
              <div className={`flex items-center justify-center px-1 ${rotulo}`}>
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
              </div>

              {dias.map((dia) => {
                const daCelula = entregas.filter((e) => {
                  const c = celulaEfetiva(e);
                  return c.data === dia && c.periodo === periodo;
                });
                // Ordena por `ordem` (nulls por último), depois created_at/nome.
                daCelula.sort((a, b) => {
                  const oa = a.ordem ?? Number.POSITIVE_INFINITY;
                  const ob = b.ordem ?? Number.POSITIVE_INFINITY;
                  if (oa !== ob) return oa - ob;
                  if (a.created_at !== b.created_at) {
                    return a.created_at.localeCompare(b.created_at);
                  }
                  return a.nome_cliente.localeCompare(b.nome_cliente);
                });

                const ocupacao = daCelula.length;
                const excesso = ocupacao > capacidade;
                const chaveCelula = `${dia}|${periodo}`;
                const isDropTarget = isAdmin && arrastando && overCelula === chaveCelula;

                return (
                  <div
                    key={chaveCelula}
                    className={`flex flex-col ${celula} ${
                      isDropTarget ? "ring-2 ring-inset ring-primary-400" : ""
                    }`}
                    onDragOver={
                      isAdmin
                        ? (e) => {
                            if (arrastando) {
                              e.preventDefault();
                              setOverCelula(chaveCelula);
                            }
                          }
                        : undefined
                    }
                    onDragLeave={
                      isAdmin
                        ? () => setOverCelula((c) => (c === chaveCelula ? null : c))
                        : undefined
                    }
                    onDrop={
                      isAdmin
                        ? (e) => {
                            e.preventDefault();
                            const item = arrastando;
                            setArrastando(null);
                            setOverCelula(null);
                            if (!item) return;
                            void handleDrop(item, dia, periodo);
                          }
                        : undefined
                    }
                  >
                    <div className="flex justify-end px-2 py-1">
                      <span
                        className={`text-[11px] ${
                          excesso ? "font-semibold text-red-600" : "text-gray-400"
                        }`}
                      >
                        {ocupacao}/{capacidade}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1.5 px-2 pb-2">
                      {daCelula.map((entrega) => {
                        const esteArrastando =
                          isAdmin && arrastando !== null && arrastando.id === entrega.id;
                        return (
                          <div
                            key={entrega.id}
                            draggable={isAdmin ? true : undefined}
                            onDragStart={isAdmin ? () => setArrastando(entrega) : undefined}
                            onDragEnd={
                              isAdmin
                                ? () => {
                                    setArrastando(null);
                                    setOverCelula(null);
                                  }
                                : undefined
                            }
                            className={
                              isAdmin
                                ? `cursor-grab active:cursor-grabbing${
                                    esteArrastando ? " opacity-50" : ""
                                  }`
                                : undefined
                            }
                          >
                            <EntregaCard
                              entrega={entrega}
                              arrastavel={isAdmin}
                              isAdmin={isAdmin}
                              contas={contas}
                              mostrarConta={mostrarConta}
                              onClick={
                                arrastando ? undefined : () => setModalEntrega(entrega)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

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
