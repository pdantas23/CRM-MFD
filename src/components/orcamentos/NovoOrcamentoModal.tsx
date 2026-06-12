"use client";
// Modal para criar novo orçamento.
// Admin pode escolher vendedor; vendedor usa automaticamente o próprio id.
// Autocomplete de cliente e produto com debounce 300ms.

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { criarOrcamento } from "@/lib/vhsys/acoes-orcamentos";
import type { PayloadCriarOrcamento, PayloadItemOrcamento } from "@/lib/vhsys/types";
import type { Profile } from "@/lib/types/database";

interface ClienteOpcao {
  id_vhsys: number;
  razao: string;
  fantasia: string | null;
  cnpj_cpf: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
}

interface ProdutoOpcao {
  id_vhsys: number;
  descricao: string;
  codigo: string | null;
  unidade: string | null;
  valor: number | null;
}

interface VendedorOpcao {
  id_vhsys: number;
  nome: string;
}

interface ItemForm {
  key: number;
  id_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
}

interface Props {
  profile: Profile;
  vendedores: VendedorOpcao[];
  onClose: () => void;
}

export function NovoOrcamentoModal({ profile, vendedores, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const nextKey = useRef(0);

  // Campos do orçamento
  const [nomeCliente, setNomeCliente] = useState("");
  const [idCliente, setIdCliente] = useState<number | undefined>();
  const [validade, setValidade] = useState("");
  const [obs, setObs] = useState("");
  const [vendedorId, setVendedorId] = useState<number | undefined>(
    profile.role === "vendedor" ? (profile.vendedor_id ?? undefined) : undefined
  );
  const [itens, setItens] = useState<ItemForm[]>([]);

  // Autocomplete cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteOpcoes, setClienteOpcoes] = useState<ClienteOpcao[]>([]);
  const clienteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscarClientes = useCallback((q: string) => {
    if (clienteTimer.current) clearTimeout(clienteTimer.current);
    clienteTimer.current = setTimeout(async () => {
      if (q.trim().length < 2) { setClienteOpcoes([]); return; }
      const res = await fetch(`/api/buscar-clientes?q=${encodeURIComponent(q)}`);
      if (res.ok) setClienteOpcoes(await res.json());
    }, 300);
  }, []);

  // Autocomplete produto (para nova linha de item)
  const [produtoQuery, setProdutoQuery] = useState("");
  const [produtoOpcoes, setProdutoOpcoes] = useState<ProdutoOpcao[]>([]);
  const produtoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscarProdutos = useCallback((q: string) => {
    if (produtoTimer.current) clearTimeout(produtoTimer.current);
    produtoTimer.current = setTimeout(async () => {
      if (q.trim().length < 2) { setProdutoOpcoes([]); return; }
      const res = await fetch(`/api/buscar-produtos?q=${encodeURIComponent(q)}`);
      if (res.ok) setProdutoOpcoes(await res.json());
    }, 300);
  }, []);

  function selecionarCliente(c: ClienteOpcao) {
    setNomeCliente(c.razao);
    setIdCliente(c.id_vhsys);
    setClienteQuery(c.razao);
    setClienteOpcoes([]);
  }

  function adicionarItem(p: ProdutoOpcao) {
    setItens((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        id_produto: p.id_vhsys,
        desc_produto: p.descricao,
        qtde: 1,
        valor_unit: p.valor ?? 0,
        desconto: 0,
      },
    ]);
    setProdutoQuery("");
    setProdutoOpcoes([]);
  }

  function removerItem(key: number) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }

  function atualizarItem(key: number, campo: "qtde" | "valor_unit" | "desconto", val: number) {
    setItens((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [campo]: val } : i))
    );
  }

  const totalItens = itens.reduce(
    (s, i) => s + i.qtde * i.valor_unit * (1 - i.desconto / 100),
    0
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nomeCliente.trim()) { setErro("Informe o nome do cliente."); return; }

    const payload: PayloadCriarOrcamento = {
      nome_cliente: nomeCliente.trim(),
      ...(idCliente ? { id_cliente: idCliente } : {}),
      ...(validade ? { validade_orcamento: validade } : {}),
      ...(obs.trim() ? { obs_pedido: obs.trim() } : {}),
      status_pedido: "Em Aberto",
    };

    if (profile.role === "admin" && vendedorId) {
      const vend = vendedores.find((v) => v.id_vhsys === vendedorId);
      payload.vendedor_pedido_id = vendedorId;
      if (vend) payload.vendedor_pedido = vend.nome;
    }

    const itensMapped: PayloadItemOrcamento[] = itens.map((i) => ({
      id_produto: i.id_produto,
      desc_produto: i.desc_produto,
      qtde_produto: i.qtde,
      valor_unit_produto: i.valor_unit,
      ...(i.desconto > 0 ? { desconto_produto: i.desconto } : {}),
    }));

    startTransition(async () => {
      const res = await criarOrcamento(payload, itensMapped);
      if (!res.ok) { setErro(res.erro ?? "Erro ao criar orçamento."); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Novo Orçamento</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Cliente */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">Cliente *</label>
            <input
              type="text"
              value={clienteQuery}
              onChange={(e) => {
                setClienteQuery(e.target.value);
                setNomeCliente(e.target.value);
                setIdCliente(undefined);
                buscarClientes(e.target.value);
              }}
              placeholder="Buscar cliente..."
              className="input-base w-full"
              required
              autoComplete="off"
            />
            {clienteOpcoes.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {clienteOpcoes.map((c) => (
                  <li key={c.id_vhsys}>
                    <button
                      type="button"
                      onClick={() => selecionarCliente(c)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{c.razao}</span>
                      {c.cnpj_cpf && (
                        <span className="ml-2 text-xs text-gray-400">{c.cnpj_cpf}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Vendedor — somente admin */}
          {profile.role === "admin" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vendedor</label>
              <select
                value={vendedorId ?? ""}
                onChange={(e) => setVendedorId(e.target.value ? Number(e.target.value) : undefined)}
                className="input-base w-full"
              >
                <option value="">— Nenhum —</option>
                {vendedores.map((v) => (
                  <option key={v.id_vhsys} value={v.id_vhsys}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Validade + Obs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Validade</label>
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <input
                type="text"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                maxLength={500}
                className="input-base w-full"
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Itens */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Itens</h3>
            {itens.length > 0 && (
              <table className="mb-2 w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="pb-1 text-left font-medium">Produto</th>
                    <th className="pb-1 text-right font-medium w-16">Qtde</th>
                    <th className="pb-1 text-right font-medium w-24">Unit. (R$)</th>
                    <th className="pb-1 text-right font-medium w-16">Desc.%</th>
                    <th className="pb-1 text-right font-medium w-20">Total</th>
                    <th className="pb-1 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.key} className="border-b last:border-0">
                      <td className="py-1 pr-2 text-gray-800">{item.desc_produto}</td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qtde}
                          onChange={(e) => atualizarItem(item.key, "qtde", Number(e.target.value))}
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor_unit}
                          onChange={(e) => atualizarItem(item.key, "valor_unit", Number(e.target.value))}
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
                          onChange={(e) => atualizarItem(item.key, "desconto", Number(e.target.value))}
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      </td>
                      <td className="py-1 text-right text-gray-700">
                        {(item.qtde * item.valor_unit * (1 - item.desconto / 100)).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>
                      <td className="py-1 pl-1">
                        <button
                          type="button"
                          onClick={() => removerItem(item.key)}
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
            )}

            {/* Adicionar produto */}
            <div className="relative">
              <input
                type="text"
                value={produtoQuery}
                onChange={(e) => {
                  setProdutoQuery(e.target.value);
                  buscarProdutos(e.target.value);
                }}
                placeholder="Buscar produto para adicionar..."
                className="input-base w-full text-sm"
                autoComplete="off"
              />
              {produtoOpcoes.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                  {produtoOpcoes.map((p) => (
                    <li key={p.id_vhsys}>
                      <button
                        type="button"
                        onClick={() => adicionarItem(p)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{p.descricao}</span>
                        {p.codigo && <span className="ml-2 text-xs text-gray-400">{p.codigo}</span>}
                        {p.valor != null && (
                          <span className="ml-2 text-xs text-gray-500">
                            {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {itens.length > 0 && (
              <p className="mt-2 text-right text-sm font-semibold text-gray-800">
                Total:{" "}
                {totalItens.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            )}
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary disabled:opacity-50"
            >
              {isPending ? "Criando…" : "Criar Orçamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
