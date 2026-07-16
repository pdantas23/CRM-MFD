"use client";

import { useState, useEffect, useRef } from "react";
import { formatBRL } from "@/lib/format";
import type { VhsysProduto } from "@/lib/vhsys/types";
import { ProdutoDetalheModal } from "./ProdutoDetalheModal";
import { OverlayBusca } from "./OverlayBusca";

export interface ProdutoRow {
  id: string;
  id_vhsys: number;
  codigo: string | null;
  descricao: string;
  marca: string | null;
  unidade: string | null;
  valor: number | null;
  valor_custo: number | null;
  status: string | null;
  fornecedor_produto: string | null;
  fornecedor_produto_id: number | null;
  dados: VhsysProduto;
}

export function ProdutosFornecedorList({ produtos }: { produtos: ProdutoRow[] }) {
  const [selecionado, setSelecionado] = useState<ProdutoRow | null>(null);
  const [termo, setTermo] = useState("");
  const [termoAplicado, setTermoAplicado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const primeira = useRef(true);

  // Debounce local (busca client-side) com efeito de loading — o input responde
  // na hora; o filtro é aplicado 200ms depois, com a lista borrada nesse meio.
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    setCarregando(true);
    const t = setTimeout(() => {
      setTermoAplicado(termo);
      setCarregando(false);
    }, 200);
    return () => clearTimeout(t);
  }, [termo]);

  const filtro = termoAplicado.trim().toLowerCase();
  const filtrados = filtro
    ? produtos.filter(
        (p) =>
          p.descricao.toLowerCase().includes(filtro) ||
          (p.codigo?.toLowerCase().includes(filtro) ?? false) ||
          (p.marca?.toLowerCase().includes(filtro) ?? false)
      )
    : produtos;

  if (produtos.length === 0) {
    return (
      <div className="card px-6 py-16 text-center text-sm text-gray-500">
        Nenhum produto ativo para este fornecedor.
      </div>
    );
  }

  return (
    <>
      {/* Busca (mesma largura da lista) */}
      <div className="relative mb-4 w-full">
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
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar material por descrição, código ou marca…"
          className="input-base w-full pl-9"
          aria-label="Buscar material"
        />
      </div>

      <OverlayBusca carregando={carregando}>
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Marca</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unidade</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor de venda</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor de custo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhum material corresponde a “{termoAplicado.trim()}”.
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelecionado(p)}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{p.codigo || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.descricao}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.marca || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.unidade || "—"}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {p.valor != null ? formatBRL(p.valor) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {p.valor_custo != null ? formatBRL(p.valor_custo) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.status || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </OverlayBusca>

      {selecionado && (
        <ProdutoDetalheModal produto={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </>
  );
}
