"use client";
// Tabela de fornecedores (nome + total de materiais). Na busca por material,
// cada fornecedor lista abaixo os materiais que casaram — clicáveis, abrindo o
// ProdutoDetalheModal (mesmo modal da lista de produtos do fornecedor).

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
}

export function ListaFornecedores({ fornecedores }: { fornecedores: FornecedorComMateriais[] }) {
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
