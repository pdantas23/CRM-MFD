"use client";
// Editor de itens do orçamento compartilhado entre criar e editar.
// - Itens com id_ped_produto < 0 são novos (ainda sem ID real).
// - removido=true marca para deletar (não exibido, deletado no diff).
// - Toggle "Mostrar impostos/peso" exibe colunas opcionais sem poluir.

import { useState } from "react";
import { AutocompleteVhsys } from "@/components/ui/AutocompleteVhsys";
import { formatBRL } from "@/lib/format";

export interface ItemEditavel {
  /** ID real do VHSYS (id_ped_produto). Negativo = novo item ainda sem ID. */
  id_ped_produto: number;
  id_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
  removido: boolean;
  // Campos opcionais
  ipi?: number;
  icms?: number;
  valorCusto?: number;
  peso?: number;
  pesoLiq?: number;
}

interface ProdutoOpcao {
  id_vhsys: number;
  descricao: string;
  codigo: string | null;
  unidade: string | null;
  valor: number | null;
}

interface Props {
  itens: ItemEditavel[];
  onChange: (itens: ItemEditavel[]) => void;
  nextKey: React.MutableRefObject<number>;
}

export function ItensOrcamentoEditor({ itens, onChange, nextKey }: Props) {
  const [mostrarImpostos, setMostrarImpostos] = useState(false);
  const [produtoQuery, setProdutoQuery] = useState("");

  const itensFiltrados = itens.filter((i) => !i.removido);

  function adicionar(p: ProdutoOpcao) {
    onChange([
      ...itens,
      {
        id_ped_produto: nextKey.current--,
        id_produto: p.id_vhsys,
        desc_produto: p.descricao,
        qtde: 1,
        valor_unit: p.valor ?? 0,
        desconto: 0,
        removido: false,
      },
    ]);
    setProdutoQuery("");
  }

  function remover(id_ped_produto: number) {
    if (id_ped_produto < 0) {
      // Item novo: remove da lista
      onChange(itens.filter((i) => i.id_ped_produto !== id_ped_produto));
    } else {
      // Item existente: marca como removido
      onChange(
        itens.map((i) =>
          i.id_ped_produto === id_ped_produto ? { ...i, removido: true } : i
        )
      );
    }
  }

  function atualizar<K extends keyof ItemEditavel>(
    id_ped_produto: number,
    campo: K,
    val: ItemEditavel[K]
  ) {
    onChange(
      itens.map((i) =>
        i.id_ped_produto === id_ped_produto ? { ...i, [campo]: val } : i
      )
    );
  }

  const totalGeral = itensFiltrados.reduce(
    (s, i) => s + i.qtde * i.valor_unit * (1 - i.desconto / 100),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Itens</h3>
        <button
          type="button"
          onClick={() => setMostrarImpostos((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {mostrarImpostos ? "Ocultar impostos/peso" : "Mostrar impostos/peso"}
        </button>
      </div>

      {itensFiltrados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-1 text-left font-medium">Produto</th>
                <th className="pb-1 text-right font-medium w-16">Qtde</th>
                <th className="pb-1 text-right font-medium w-24">Unit. (R$)</th>
                <th className="pb-1 text-right font-medium w-16">Desc.%</th>
                {mostrarImpostos && (
                  <>
                    <th className="pb-1 text-right font-medium w-16">IPI%</th>
                    <th className="pb-1 text-right font-medium w-16">ICMS%</th>
                    <th className="pb-1 text-right font-medium w-20">Custo</th>
                    <th className="pb-1 text-right font-medium w-16">Peso</th>
                    <th className="pb-1 text-right font-medium w-16">P.Liq</th>
                  </>
                )}
                <th className="pb-1 text-right font-medium w-20">Total</th>
                <th className="pb-1 w-8" />
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((item) => (
                <tr key={item.id_ped_produto} className="border-b last:border-0">
                  <td className="py-1 pr-2 text-gray-800">{item.desc_produto}</td>
                  <td className="py-1 pr-1">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.qtde}
                      onChange={(e) =>
                        atualizar(item.id_ped_produto, "qtde", Number(e.target.value))
                      }
                      className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.valor_unit}
                      onChange={(e) =>
                        atualizar(item.id_ped_produto, "valor_unit", Number(e.target.value))
                      }
                      className="w-24 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 pr-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.desconto}
                      onChange={(e) =>
                        atualizar(item.id_ped_produto, "desconto", Number(e.target.value))
                      }
                      className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                    />
                  </td>
                  {mostrarImpostos && (
                    <>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.ipi ?? ""}
                          onChange={(e) =>
                            atualizar(
                              item.id_ped_produto,
                              "ipi",
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="—"
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.icms ?? ""}
                          onChange={(e) =>
                            atualizar(
                              item.id_ped_produto,
                              "icms",
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="—"
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valorCusto ?? ""}
                          onChange={(e) =>
                            atualizar(
                              item.id_ped_produto,
                              "valorCusto",
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="—"
                          className="w-20 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.peso ?? ""}
                          onChange={(e) =>
                            atualizar(
                              item.id_ped_produto,
                              "peso",
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="—"
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.pesoLiq ?? ""}
                          onChange={(e) =>
                            atualizar(
                              item.id_ped_produto,
                              "pesoLiq",
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                          placeholder="—"
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                    </>
                  )}
                  <td className="py-1 text-right text-gray-700">
                    {formatBRL(item.qtde * item.valor_unit * (1 - item.desconto / 100))}
                  </td>
                  <td className="py-1 pl-1">
                    <button
                      type="button"
                      onClick={() => remover(item.id_ped_produto)}
                      className="text-red-400 hover:text-red-600"
                      title="Remover item"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adicionar produto via autocomplete */}
      <AutocompleteVhsys<ProdutoOpcao>
        endpoint="/api/buscar-produtos"
        placeholder="Buscar produto para adicionar..."
        value={produtoQuery}
        onChange={setProdutoQuery}
        onSelecionar={(p) => adicionar(p)}
        renderOpcao={(p) => (
          <>
            <span className="font-medium">{p.descricao}</span>
            {p.codigo && <span className="ml-2 text-xs text-gray-400">{p.codigo}</span>}
            {p.valor != null && (
              <span className="ml-2 text-xs text-gray-500">
                {formatBRL(p.valor)}
              </span>
            )}
          </>
        )}
        className="text-sm"
      />

      {itensFiltrados.length > 0 && (
        <p className="text-right text-sm font-semibold text-gray-800">
          Total: {formatBRL(totalGeral)}
        </p>
      )}
    </div>
  );
}
