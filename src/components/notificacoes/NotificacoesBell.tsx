"use client";
// Sino de notificações flutuante (canto inferior direito). Faz polling a cada
// ~45s e ao focar a janela; abre um painel com a lista (quem, o quê, há quanto
// tempo). Abrir zera o badge (marca como vistas para o usuário).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarNotificacoes,
  marcarNotificacoesVistas,
  type NotificacaoItem,
} from "@/lib/notificacoes/acoes";

const POLL_MS = 45_000;

function tempoRelativo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora mesmo";
  const min = Math.floor(s / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

function dataCompleta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function texto(n: NotificacaoItem): string {
  const ped = n.pedidoNumero ? `Pedido #${n.pedidoNumero}` : "Pedido";
  const cli = n.nomeCliente ? ` — ${n.nomeCliente}` : "";
  if (n.tipo === "pedido_emitido") {
    const por = n.atorNome ? ` por ${n.atorNome}` : "";
    return `${ped} emitido${por}${cli}`;
  }
  return `Pagamento do ${ped} aprovado${cli} — já pode cadastrar a entrega`;
}

export function NotificacoesBell({
  demo,
}: {
  /** PREVIEW-ONLY: dados de exemplo (pula fetch/polling e abre o painel). */
  demo?: { itens: NotificacaoItem[]; naoLidas: number };
} = {}) {
  const router = useRouter();
  const [itens, setItens] = useState<NotificacaoItem[]>(demo?.itens ?? []);
  const [naoLidas, setNaoLidas] = useState(demo?.naoLidas ?? 0);
  const [aberto, setAberto] = useState(Boolean(demo));

  const carregar = useCallback(async () => {
    try {
      const res = await listarNotificacoes();
      setItens(res.itens);
      setNaoLidas(res.naoLidas);
    } catch {
      /* silencioso — polling tenta de novo */
    }
  }, []);

  useEffect(() => {
    if (demo) return; // preview: sem fetch/polling
    carregar();
    const id = setInterval(carregar, POLL_MS);
    const onFocus = () => carregar();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [carregar, demo]);

  async function alternar() {
    const abrindo = !aberto;
    setAberto(abrindo);
    if (demo) return; // preview: não chama server actions
    if (abrindo && naoLidas > 0) {
      setNaoLidas(0);
      try {
        await marcarNotificacoesVistas();
      } catch {
        /* best-effort */
      }
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {aberto && (
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notificações</span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {itens.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              Nenhuma notificação.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {itens.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/pedidos");
                      setAberto(false);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        n.tipo === "pagamento_aprovado" ? "bg-emerald-500" : "bg-primary-600"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-gray-800">{texto(n)}</span>
                      <span className="mt-0.5 block text-xs text-gray-400" title={dataCompleta(n.createdAt)}>
                        {tempoRelativo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={alternar}
        aria-label="Notificações"
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg transition-colors hover:bg-primary-800"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
    </div>
  );
}
