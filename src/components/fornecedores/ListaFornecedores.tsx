"use client";
// Tabela de fornecedores (nome + total de materiais). Na busca por material,
// cada fornecedor lista abaixo os materiais que casaram — clicáveis, abrindo o
// ProdutoDetalheModal (mesmo modal da lista de produtos do fornecedor).
// Se `onEditarSecoes` for passado, cada fornecedor ganha um botão "Seções".

import { useState } from "react";
import Link from "next/link";
import { ProdutoDetalheModal } from "./ProdutoDetalheModal";
import type { ProdutoRow } from "./ProdutosFornecedorList";

export interface FornecedorComMateriais {
  id: number;
  nome: string;
  total: number;
  /** Materiais que casaram a busca (vazio sem busca / quando casou só o nome). */
  materiais: ProdutoRow[];
  /** Chaves das seções a que o fornecedor pertence. */
  secoes: string[];
}

export function ListaFornecedores({
  fornecedores,
  onEditarSecoes,
}: {
  fornecedores: FornecedorComMateriais[];
  onEditarSecoes?: (f: FornecedorComMateriais) => void;
}) {
  const [selecionado, setSelecionado] = useState<ProdutoRow | null>(null);

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fornecedor
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Materiais
              </th>
              {onEditarSecoes && <th className="w-px px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {fornecedores.map((f) => (
              <tr key={f.id} className="border-b border-gray-50 align-top last:border-0">
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/fornecedores/${f.id}`}
                    className="font-medium text-gray-900 hover:text-primary-600 hover:underline"
                  >
                    {f.nome}
                  </Link>
                  {f.materiais.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {f.materiais.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => setSelecionado(m)}
                            className="text-left text-xs text-primary-600 hover:underline"
                          >
                            • {m.descricao}
                            {m.codigo ? ` (${m.codigo})` : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-700">{f.total}</td>
                {onEditarSecoes && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditarSecoes(f)}
                      title="Editar seções"
                      aria-label="Editar seções"
                      className="inline-flex items-center justify-center rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-primary-600"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 015 12V5a2 2 0 012-2z"
                        />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selecionado && (
        <ProdutoDetalheModal produto={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </>
  );
}
