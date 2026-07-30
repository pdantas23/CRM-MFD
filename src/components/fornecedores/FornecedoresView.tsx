"use client";
// Busca + lista de fornecedores AGRUPADA por seção (Drywall / Piso Vinílico /
// Solução Acústica / Outros). O input atualiza o ?q= da URL (debounced) e a
// página (server) refaz a consulta; enquanto isso, a lista fica borrada com um
// spinner por cima. Admin pode editar as seções de cada fornecedor.

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListaFornecedores, type FornecedorComMateriais } from "./ListaFornecedores";
import { OverlayBusca } from "./OverlayBusca";
import { SecoesFornecedorModal } from "./SecoesFornecedorModal";
import { SECOES_FORNECEDOR, CHAVES_SECAO } from "@/lib/fornecedores/secoes";

export function FornecedoresView({
  fornecedores,
  qInicial,
}: {
  fornecedores: FornecedorComMateriais[];
  qInicial: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(qInicial);
  const [debouncing, setDebouncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const primeira = useRef(true);
  const [editando, setEditando] = useState<FornecedorComMateriais | null>(null);

  // Debounce: navega 300ms depois de parar de digitar (replace, não push).
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    setDebouncing(true);
    const t = setTimeout(() => {
      setDebouncing(false);
      const q = valor.trim();
      startTransition(() => {
        router.replace(q ? `/fornecedores?q=${encodeURIComponent(q)}` : "/fornecedores");
      });
    }, 300);
    return () => clearTimeout(t);
  }, [valor, router]);

  const carregando = debouncing || isPending;
  const termo = valor.trim();
  const buscando = termo.length > 0;

  const daSecao = (chave: string) => fornecedores.filter((f) => f.secoes.includes(chave));
  const outros = fornecedores.filter((f) => !f.secoes.some((s) => CHAVES_SECAO.includes(s)));

  return (
    <>
      <div className="relative mb-6 w-full">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Buscar por fornecedor ou material (ex.: placa)…"
          className="input-base w-full pl-9"
          aria-label="Buscar fornecedor ou material"
        />
      </div>

      <OverlayBusca carregando={carregando}>
        {fornecedores.length === 0 ? (
          <div className="card px-6 py-16 text-center text-sm text-gray-500">
            {buscando
              ? `Nenhum fornecedor ou material encontrado para "${termo}".`
              : "Nenhum fornecedor encontrado nos produtos ativos."}
          </div>
        ) : (
          <div className="space-y-8">
            {SECOES_FORNECEDOR.map((s) => {
              const lista = daSecao(s.chave);
              // Na busca, oculta seções sem resultado; sem busca, mostra as 3
              // sempre (para o admin categorizar mesmo quando vazias).
              if (buscando && lista.length === 0) return null;
              return (
                <section key={s.chave}>
                  <h2 className="mb-2 text-lg font-semibold text-gray-800">
                    {s.label}
                    <span className="ml-2 text-sm font-normal text-gray-400">({lista.length})</span>
                  </h2>
                  {lista.length > 0 ? (
                    <ListaFornecedores fornecedores={lista} onEditarSecoes={setEditando} />
                  ) : (
                    <div className="card px-6 py-8 text-center text-sm text-gray-400">
                      Nenhum fornecedor nesta seção ainda.
                    </div>
                  )}
                </section>
              );
            })}

            {outros.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold text-gray-800">
                  Outros
                  <span className="ml-2 text-sm font-normal text-gray-400">({outros.length})</span>
                </h2>
                <ListaFornecedores fornecedores={outros} onEditarSecoes={setEditando} />
              </section>
            )}
          </div>
        )}
      </OverlayBusca>

      {editando && (
        <SecoesFornecedorModal
          fornecedor={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
