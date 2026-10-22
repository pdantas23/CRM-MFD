"use client";
// Seletor de fornecedor da linha: só fornecedores já cadastrados no VHSYS da
// conta (escolha por id — o nome nunca é digitado). Com busca; fecha ao clicar
// fora, com Escape ou ao rolar. A lista usa posição FIXA (relativa à tela) para
// não ser cortada pela rolagem horizontal da tabela.

import { useEffect, useRef, useState } from "react";
import type { FornecedorVhsys } from "@/lib/produtos/dados";
import { CLASSE_CAMPO_TABELA } from "./CampoNumero";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function SeletorFornecedor({
  valor,
  opcoes,
  onEscolher,
  formulario,
}: {
  valor: number | null;
  opcoes: FornecedorVhsys[];
  onEscolher: (id: number) => void;
  /** Versão de formulário (com borda, largura total) — usada no modal do produto. */
  formulario?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState<{ top: number; right: number; acima: boolean }>({ top: 0, right: 0, acima: false });
  const ref = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const atual = opcoes.find((f) => f.id === valor);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    function rolou(e: Event) {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", rolou, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", rolou, true);
    };
  }, [aberto]);

  const termo = normalizar(busca.trim());
  const filtradas = termo ? opcoes.filter((f) => normalizar(f.nome).includes(termo)) : opcoes;

  return (
    <div ref={ref} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => {
          const r = botao.current?.getBoundingClientRect();
          if (r) {
            // Abre para cima quando não cabe abaixo (últimas linhas da tela).
            const acima = window.innerHeight - r.bottom < 320;
            setPos({ top: acima ? r.top - 4 : r.bottom + 4, right: window.innerWidth - r.right, acima });
          }
          setBusca("");
          setAberto((v) => !v);
        }}
        title={atual?.nome ?? ""}
        className={
          formulario
            ? "input-base block truncate text-left"
            : `${CLASSE_CAMPO_TABELA} block w-44 truncate text-left text-gray-600`
        }
      >
        {atual?.nome ?? <span className="text-gray-400">—</span>}
      </button>

      {aberto && (
        <div
          style={{ top: pos.top, right: pos.right }}
          className={`fixed z-[60] w-72 rounded-lg border border-gray-200 bg-white shadow-lg ${
            pos.acima ? "-translate-y-full" : ""
          }`}
        >
          <input
            autoFocus
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              // Enter escolhe o primeiro resultado (não propaga para a linha).
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (filtradas[0]) {
                  onEscolher(filtradas[0].id);
                  setAberto(false);
                }
              }
            }}
            placeholder="Buscar fornecedor"
            className="w-full rounded-t-lg border-b border-gray-100 px-3 py-2 text-sm focus:outline-none"
          />
          <div role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtradas.map((f) => (
              <button
                key={f.id}
                type="button"
                role="option"
                aria-selected={f.id === valor}
                onClick={() => {
                  onEscolher(f.id);
                  setAberto(false);
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  f.id === valor ? "font-semibold text-primary-700" : "text-gray-700"
                }`}
              >
                {f.nome}
              </button>
            ))}
            {filtradas.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">Nenhum fornecedor no VHSYS desta conta.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
