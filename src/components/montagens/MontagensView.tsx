"use client";
// Aba Montagens: mini dashboard (ativos, finalizados, atrasados, previstos),
// lista e calendário dos serviços. Clicar num card filtra a lista; clicar num
// serviço abre o modal (edição para admin; leitura para financeiro/montador).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import type { MontadorOpcao } from "@/lib/montagens/dados";
import { statusServico, totalPago, type ServicoMontagem, type StatusServico } from "@/lib/montagens/status";
import { StatusDiscreto } from "./BadgeStatus";
import { CalendarioMontagens } from "./CalendarioMontagens";
import { FILTROS_VAZIOS, FiltrosServicos, type FiltrosAvancados } from "./FiltrosServicos";
import { ServicoModal } from "./ServicoModal";

export interface PermissoesMontagem {
  podeEditar: boolean;
  podePagar: boolean;
  montador: boolean;
}

type Filtro = "todos" | "ativos" | "finalizados" | "atrasados" | "previstos";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const periodo = (de: string | null, ate: string | null) =>
  de || ate ? `${de ? formatarData(de) : "?"} → ${ate ? formatarData(ate) : "?"}` : "—";

/** Período que a tabela mostra: o real quando finalizado, senão o previsto. */
function datasDoServico(s: ServicoMontagem, st: StatusServico): [string | null, string | null] {
  return st.fase === "finalizado" ? [s.inicioReal, s.fimReal] : [s.inicioPrevisto, s.fimPrevisto];
}

const unicos = (lista: (string | null)[]) =>
  Array.from(new Set(lista.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, "pt-BR"));

const CORES_CARD = {
  blue: { icone: "bg-blue-100 text-blue-600", numero: "text-blue-700", ativo: "border-blue-400 ring-blue-100" },
  red: { icone: "bg-red-100 text-red-600", numero: "text-red-600", ativo: "border-red-400 ring-red-100" },
  amber: { icone: "bg-amber-100 text-amber-600", numero: "text-amber-600", ativo: "border-amber-400 ring-amber-100" },
  emerald: { icone: "bg-emerald-100 text-emerald-600", numero: "text-emerald-700", ativo: "border-emerald-400 ring-emerald-100" },
};

function Card({
  titulo,
  qtd,
  icone,
  cor,
  ativo,
  onClick,
}: {
  titulo: string;
  qtd: number;
  /** Atributo `d` do ícone. */
  icone: string;
  cor: keyof typeof CORES_CARD;
  ativo: boolean;
  onClick: () => void;
}) {
  const estilo = CORES_CARD[cor];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex flex-col items-center rounded-xl border bg-white px-4 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        ativo ? `ring-2 ${estilo.ativo}` : "border-gray-200"
      }`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${estilo.icone}`}>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icone} />
        </svg>
      </span>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${estilo.numero}`}>{qtd}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-500">{titulo}</p>
    </button>
  );
}

export function MontagensView({
  servicos,
  montadores,
  hoje,
  permissoes,
}: {
  servicos: ServicoMontagem[];
  montadores: MontadorOpcao[];
  hoje: string;
  permissoes: PermissoesMontagem;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [avancados, setAvancados] = useState<FiltrosAvancados>(FILTROS_VAZIOS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  // undefined = fechado; null = novo serviço; string = id do serviço aberto.
  const [aberto, setAberto] = useState<string | null | undefined>(undefined);
  // Serviço recém-criado: reabre direto na fase de pagamentos.
  const [criado, setCriado] = useState<string | null>(null);

  const comStatus = useMemo(
    () => servicos.map((s) => ({ s, st: statusServico(s, hoje) })),
    [servicos, hoje]
  );
  const grupos = useMemo(() => {
    const ativos = comStatus.filter((x) => x.st.fase === "andamento");
    const finalizados = comStatus.filter((x) => x.st.fase === "finalizado");
    const atrasados = comStatus.filter((x) => x.st.atrasado);
    const previstos = comStatus
      .filter((x) => x.st.fase === "previsto")
      .sort((a, b) => (a.s.inicioPrevisto ?? "9999").localeCompare(b.s.inicioPrevisto ?? "9999"));
    return { ativos, finalizados, atrasados, previstos };
  }, [comStatus]);

  const visiveis = useMemo(() => {
    const base: { s: ServicoMontagem; st: StatusServico }[] =
      filtro === "todos" ? comStatus : grupos[filtro];
    const termo = normalizar(busca.trim());
    const { conta, montador, cidade, pagamento, de, ate } = avancados;
    return base.filter(({ s, st }) => {
      if (conta && s.contaSlug?.toUpperCase() !== conta) return false;
      if (montador && s.montadorNome !== montador) return false;
      if (cidade && s.cidade !== cidade) return false;
      if (pagamento) {
        const falta = (s.valorMontador ?? 0) - totalPago(s) > 0.005;
        if (falta !== (pagamento === "falta")) return false;
      }
      if (de || ate) {
        const [inicio, fim] = datasDoServico(s, st);
        const ini = inicio ?? fim;
        const ult = fim ?? inicio;
        if (!ini || !ult || (de && ult < de) || (ate && ini > ate)) return false;
      }
      return (
        !termo ||
        normalizar(
          [s.clienteNome, s.pedidoNumero, s.montadorNome, s.cidade, s.uf, s.endereco, s.descricao].join(" ")
        ).includes(termo)
      );
    });
  }, [comStatus, grupos, filtro, busca, avancados]);

  const qtdAvancados = [
    avancados.conta,
    avancados.montador,
    avancados.cidade,
    avancados.pagamento,
    avancados.de || avancados.ate,
  ].filter(Boolean).length;

  const alternar = (f: Filtro) => setFiltro((atual) => (atual === f ? "todos" : f));
  const servicoAberto = typeof aberto === "string" ? servicos.find((s) => s.id === aberto) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="mt-1 text-sm text-gray-500">
            {permissoes.montador ? "Seus serviços de montagem" : "Acompanhamento dos serviços dos montadores"}
          </p>
        </div>
        <div className="inline-flex h-11 items-stretch rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
          {(
            [
              ["lista", "Lista"],
              ["calendario", "Calendário"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVisao(id)}
              className={`rounded-md px-4 font-medium ${
                visao === id ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card
          titulo="Ativos"
          qtd={grupos.ativos.length}
          icone="M13 10V3L4 14h7v7l9-11h-7z"
          cor="blue"
          ativo={filtro === "ativos"}
          onClick={() => alternar("ativos")}
        />
        <Card
          titulo="Atrasados"
          qtd={grupos.atrasados.length}
          icone="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          cor="red"
          ativo={filtro === "atrasados"}
          onClick={() => alternar("atrasados")}
        />
        <Card
          titulo="Previstos para começar"
          qtd={grupos.previstos.length}
          icone="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          cor="amber"
          ativo={filtro === "previstos"}
          onClick={() => alternar("previstos")}
        />
        <Card
          titulo="Finalizados"
          qtd={grupos.finalizados.length}
          icone="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          cor="emerald"
          ativo={filtro === "finalizados"}
          onClick={() => alternar("finalizados")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente, pedido, montador ou cidade"
          className="input-base h-11 min-w-[16rem] flex-1"
        />
        <button
          type="button"
          onClick={() => setFiltrosAbertos(true)}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${
            qtdAvancados
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
          </svg>
          Filtros{qtdAvancados ? ` (${qtdAvancados})` : ""}
        </button>
        {filtro !== "todos" && (
          <button type="button" onClick={() => setFiltro("todos")} className="text-sm text-primary-700 hover:underline">
            Limpar filtro
          </button>
        )}
        {permissoes.podeEditar && (
          <button type="button" onClick={() => setAberto(null)} className="btn-primary h-11 shrink-0">
            Novo serviço
          </button>
        )}
      </div>

      {visao === "calendario" ? (
        <CalendarioMontagens itens={visiveis} hoje={hoje} onAbrir={(id) => setAberto(id)} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="w-[23%] truncate px-3 py-2.5 text-left font-medium">Cliente / pedido</th>
                {!permissoes.montador && <th className="w-[13%] truncate px-3 py-2.5 text-left font-medium">Montador</th>}
                <th className="w-[20%] truncate px-3 py-2.5 text-left font-medium">Obra</th>
                <th className="w-[19%] truncate px-3 py-2.5 text-left font-medium">Data</th>
                <th className="w-[12%] truncate px-3 py-2.5 text-right font-medium">Valor montador</th>
                <th className="w-[13%] truncate px-3 py-2.5 text-right font-medium">Pago / saldo</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ s, st }) => {
                const pago = totalPago(s);
                const saldo = (s.valorMontador ?? 0) - pago;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setAberto(s.id)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2.5">
                      <p className="truncate font-medium text-gray-900" title={s.clienteNome ?? undefined}>
                        {s.clienteNome ?? "—"}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {s.pedidoNumero ? `Pedido ${s.pedidoNumero}` : "Sem pedido"}
                        {s.contaSlug ? ` · ${s.contaSlug.toUpperCase()}` : ""}
                      </p>
                    </td>
                    {!permissoes.montador && (
                      <td className="truncate px-3 py-2.5 text-gray-700" title={s.montadorNome ?? undefined}>
                        {s.montadorNome ?? "—"}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <p className="truncate text-gray-700" title={s.endereco ?? undefined}>
                        {s.endereco ?? "—"}
                      </p>
                      <p className="truncate text-xs text-gray-500">{[s.cidade, s.uf].filter(Boolean).join(" - ") || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="truncate text-gray-600">
                        {st.fase === "finalizado" ? periodo(s.inicioReal, s.fimReal) : periodo(s.inicioPrevisto, s.fimPrevisto)}
                      </p>
                      <StatusDiscreto st={st} />
                    </td>
                    <td className="truncate px-3 py-2.5 text-right tabular-nums">
                      {s.valorMontador === null ? "—" : formatBRL(s.valorMontador)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <p className="truncate text-gray-700">{formatBRL(pago)}</p>
                      {s.valorMontador !== null && (
                        <p className={`truncate text-xs ${saldo > 0.005 ? "text-amber-700" : "text-green-700"}`}>
                          {saldo > 0.005 ? `falta ${formatBRL(saldo)}` : "quitado"}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                    Nenhum serviço.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {filtrosAbertos && (
        <FiltrosServicos
          filtros={avancados}
          contas={unicos(servicos.map((s) => s.contaSlug?.toUpperCase() ?? null))}
          montadores={permissoes.montador ? [] : unicos(servicos.map((s) => s.montadorNome))}
          cidades={unicos(servicos.map((s) => s.cidade))}
          onMudar={setAvancados}
          onFechar={() => setFiltrosAbertos(false)}
        />
      )}

      {aberto !== undefined &&
        (typeof aberto === "string" && !servicoAberto ? (
          // Serviço recém-criado: aguarda os dados recarregados do servidor.
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <p className="rounded-lg bg-white px-4 py-3 text-sm text-gray-600 shadow">Carregando…</p>
          </div>
        ) : (
          <ServicoModal
            key={aberto ?? "novo"}
            servico={servicoAberto}
            montadores={montadores}
            permissoes={permissoes}
            hoje={hoje}
            onFechar={() => setAberto(undefined)}
            onMudou={() => router.refresh()}
            abaInicial={aberto && aberto === criado ? "pagamentos" : "fase"}
            onCriado={(id) => {
              setCriado(id);
              setAberto(id);
              router.refresh();
            }}
          />
        ))}
    </div>
  );
}
