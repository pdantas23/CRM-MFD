"use client";
// Aba Montagens: mini dashboard (ativos, finalizados, atrasados, previstos),
// lista e calendário dos serviços. Clicar num card filtra a lista; clicar num
// serviço abre o modal (edição para admin; leitura para financeiro/montador).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatarData } from "@/lib/format";
import type { MontadorOpcao } from "@/lib/montagens/dados";
import { statusServico, totalPago, type ServicoMontagem, type StatusServico } from "@/lib/montagens/status";
import { BadgeStatus } from "./BadgeStatus";
import { CalendarioMontagens } from "./CalendarioMontagens";
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

function Card({
  titulo,
  qtd,
  itens,
  cor,
  ativo,
  onClick,
}: {
  titulo: string;
  qtd: number;
  itens: string[];
  cor: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md ${
        ativo ? "border-primary-400 ring-2 ring-primary-200" : "border-gray-200"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-bold ${cor}`}>{qtd}</p>
      {itens.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
          {itens.slice(0, 4).map((t, i) => (
            <li key={i} className="truncate">
              {t}
            </li>
          ))}
          {itens.length > 4 && <li className="text-gray-400">+ {itens.length - 4}</li>}
        </ul>
      )}
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
  const [visao, setVisao] = useState<"lista" | "calendario">("lista");
  // undefined = fechado; null = novo serviço; string = id do serviço aberto.
  const [aberto, setAberto] = useState<string | null | undefined>(undefined);
  // Serviço recém-criado: reabre direto na fase de pagamentos.
  const [criado, setCriado] = useState<string | null>(null);

  const comStatus = useMemo(
    () => servicos.map((s) => ({ s, st: statusServico(s, hoje) })),
    [servicos, hoje]
  );
  const rotulo = (s: ServicoMontagem) =>
    `${s.clienteNome ?? "Sem cliente"}${s.pedidoNumero ? ` · pedido ${s.pedidoNumero}` : ""}`;

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
    if (!termo) return base;
    return base.filter(({ s }) =>
      normalizar(
        [s.clienteNome, s.pedidoNumero, s.montadorNome, s.cidade, s.uf, s.endereco, s.descricao].join(" ")
      ).includes(termo)
    );
  }, [comStatus, grupos, filtro, busca]);

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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          titulo="Ativos"
          qtd={grupos.ativos.length}
          itens={grupos.ativos.map((x) => rotulo(x.s))}
          cor="text-primary-700"
          ativo={filtro === "ativos"}
          onClick={() => alternar("ativos")}
        />
        <Card
          titulo="Atrasados"
          qtd={grupos.atrasados.length}
          itens={grupos.atrasados.map((x) => `${rotulo(x.s)} · ${x.st.diasAtraso}d`)}
          cor="text-red-600"
          ativo={filtro === "atrasados"}
          onClick={() => alternar("atrasados")}
        />
        <Card
          titulo="Previstos para começar"
          qtd={grupos.previstos.length}
          itens={grupos.previstos.map(
            (x) => `${x.s.inicioPrevisto ? formatarData(x.s.inicioPrevisto) : "sem data"} · ${rotulo(x.s)}`
          )}
          cor="text-amber-600"
          ativo={filtro === "previstos"}
          onClick={() => alternar("previstos")}
        />
        <Card
          titulo="Finalizados"
          qtd={grupos.finalizados.length}
          itens={[]}
          cor="text-green-700"
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
        {filtro !== "todos" && (
          <button type="button" onClick={() => setFiltro("todos")} className="text-sm text-primary-700 hover:underline">
            Limpar filtro
          </button>
        )}
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
        {permissoes.podeEditar && (
          <button type="button" onClick={() => setAberto(null)} className="btn-primary h-11 shrink-0">
            Novo serviço
          </button>
        )}
      </div>

      {visao === "calendario" ? (
        <CalendarioMontagens itens={visiveis} hoje={hoje} onAbrir={(id) => setAberto(id)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Cliente / pedido</th>
                {!permissoes.montador && <th className="px-3 py-2.5 text-left font-medium">Montador</th>}
                <th className="px-3 py-2.5 text-left font-medium">Obra</th>
                <th className="px-3 py-2.5 text-left font-medium">Previsto</th>
                <th className="px-3 py-2.5 text-left font-medium">Real</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor montador</th>
                <th className="px-3 py-2.5 text-right font-medium">Pago / saldo</th>
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
                      <p className="font-medium text-gray-900">{s.clienteNome ?? "—"}</p>
                      <p className="text-xs text-gray-500">
                        {s.pedidoNumero ? `Pedido ${s.pedidoNumero}` : "Sem pedido"}
                        {s.contaSlug ? ` · ${s.contaSlug.toUpperCase()}` : ""}
                      </p>
                    </td>
                    {!permissoes.montador && <td className="px-3 py-2.5 text-gray-700">{s.montadorNome ?? "—"}</td>}
                    <td className="max-w-xs px-3 py-2.5">
                      <p className="truncate text-gray-700">{s.endereco ?? "—"}</p>
                      <p className="text-xs text-gray-500">{[s.cidade, s.uf].filter(Boolean).join(" - ") || "—"}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{periodo(s.inicioPrevisto, s.fimPrevisto)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">{periodo(s.inicioReal, s.fimReal)}</td>
                    <td className="px-3 py-2.5">
                      <BadgeStatus st={st} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      {s.valorMontador === null ? "—" : formatBRL(s.valorMontador)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                      <span className="text-gray-700">{formatBRL(pago)}</span>
                      {s.valorMontador !== null && (
                        <span className={`block text-xs ${saldo > 0.005 ? "text-amber-700" : "text-green-700"}`}>
                          {saldo > 0.005 ? `falta ${formatBRL(saldo)}` : "quitado"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-gray-500">
                    Nenhum serviço.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
