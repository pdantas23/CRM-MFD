"use client";
// Modal de detalhes do orçamento com itens sob demanda (skeleton enquanto carrega)
// e edição inline quando podeEditar.

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { editarOrcamento } from "@/lib/vhsys/acoes-orcamentos";
import { emitirPedidoDeOrcamento } from "@/lib/vhsys/acoes";
import { formatBRL, formatarData } from "@/lib/format";
import type { OrcamentoRow } from "@/lib/types/pedidos";
import type { PayloadCriarOrcamento, PayloadItemOrcamento, ItensDiff } from "@/lib/vhsys/types";
import type { Profile } from "@/lib/types/database";

const SITUACAO_APROVADO = 768;

interface ItemApi {
  id_ped_produto: number;
  id_produto: number;
  desc_produto: string;
  qtde_produto: string;
  valor_unit_produto: string;
  desconto_produto?: number;
  valor_total_produto: number;
}

interface ItemEditavel {
  id_ped_produto: number;
  id_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
  removido: boolean;
}

interface Props {
  orcamento: OrcamentoRow;
  situacaoNome: string | null;
  profile: Profile;
  onClose: () => void;
}

export function OrcamentoModal({ orcamento, situacaoNome, profile, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Itens carregados sob demanda
  const [itens, setItens] = useState<ItemEditavel[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  // Campos editáveis
  const [obs, setObs] = useState(orcamento.obs ?? "");
  const [validade, setValidade] = useState(orcamento.validade ?? "");

  // Autocomplete de produto para inserir novos itens
  const [produtoQuery, setProdutoQuery] = useState("");
  const [produtoOpcoes, setProdutoOpcoes] = useState<{ id_vhsys: number; descricao: string; valor: number | null }[]>([]);
  const produtoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextKey = useRef(-1); // ids negativos = novos (ainda sem id_ped_produto real)

  const podeEditar =
    profile.role === "admin" ||
    (profile.role === "vendedor" && profile.vendedor_id === orcamento.vendedor_id_vhsys);
  const podeEmitir =
    !orcamento.pedido_emitido &&
    orcamento.situacao_id === SITUACAO_APROVADO &&
    (profile.role === "admin" ||
      (profile.role === "vendedor" && profile.vendedor_id === orcamento.vendedor_id_vhsys));

  // Carrega itens ao abrir modal
  useEffect(() => {
    setCarregandoItens(true);
    fetch(`/api/orcamento-itens/${orcamento.id_vhsys}`)
      .then((r) => r.json())
      .then((data: ItemApi[]) => {
        setItens(
          data.map((i) => ({
            id_ped_produto: i.id_ped_produto,
            id_produto: i.id_produto,
            desc_produto: i.desc_produto,
            qtde: Number(i.qtde_produto),
            valor_unit: Number(i.valor_unit_produto),
            desconto: Number(i.desconto_produto ?? 0),
            removido: false,
          }))
        );
      })
      .catch(() => setItens([]))
      .finally(() => setCarregandoItens(false));
  }, [orcamento.id_vhsys]);

  const buscarProdutos = useCallback((q: string) => {
    if (produtoTimer.current) clearTimeout(produtoTimer.current);
    produtoTimer.current = setTimeout(async () => {
      if (q.trim().length < 2) { setProdutoOpcoes([]); return; }
      const res = await fetch(`/api/buscar-produtos?q=${encodeURIComponent(q)}`);
      if (res.ok) setProdutoOpcoes(await res.json());
    }, 300);
  }, []);

  function adicionarNovoItem(p: { id_vhsys: number; descricao: string; valor: number | null }) {
    setItens((prev) => [
      ...(prev ?? []),
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
    setProdutoOpcoes([]);
  }

  function salvar() {
    if (!itens) return;
    setErro(null);

    // Calcula diff: itens com id_ped_produto < 0 = novos; removido=true = deletar
    const deletar = itens
      .filter((i) => i.removido && i.id_ped_produto > 0)
      .map((i) => i.id_ped_produto);

    const inserir: PayloadItemOrcamento[] = itens
      .filter((i) => !i.removido && i.id_ped_produto < 0)
      .map((i) => ({
        id_produto: i.id_produto,
        desc_produto: i.desc_produto,
        qtde_produto: i.qtde,
        valor_unit_produto: i.valor_unit,
        ...(i.desconto > 0 ? { desconto_produto: i.desconto } : {}),
      }));

    const diff: ItensDiff = { deletar, inserir };
    const payload: Partial<PayloadCriarOrcamento> = {};
    if (obs !== (orcamento.obs ?? "")) payload.obs_pedido = obs;
    if (validade !== (orcamento.validade ?? "")) payload.validade_orcamento = validade;

    startTransition(async () => {
      const res = await editarOrcamento(orcamento.id_vhsys, payload, diff);
      if (!res.ok) { setErro(res.erro ?? "Erro ao salvar."); return; }
      router.refresh();
      setModoEdicao(false);
    });
  }

  function handleEmitir() {
    setErro(null);
    startTransition(async () => {
      const res = await emitirPedidoDeOrcamento(orcamento.id_vhsys);
      if (!res.ok) { setErro(res.erro ?? "Erro ao emitir pedido."); return; }
      router.refresh();
      onClose();
    });
  }

  const itensFiltrados = itens?.filter((i) => !i.removido) ?? [];
  const totalItens = itensFiltrados.reduce(
    (s, i) => s + i.qtde * i.valor_unit * (1 - i.desconto / 100),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Orçamento #{orcamento.numero}
            </h2>
            <p className="text-sm text-gray-500">{orcamento.nome_cliente}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Cabeçalho: situação, data, validade, vendedor */}
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-400">Situação</dt>
              <dd className="font-medium text-gray-900">{situacaoNome ?? orcamento.status_base ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Data</dt>
              <dd className="text-gray-700">
                {orcamento.data_orcamento ? formatarData(orcamento.data_orcamento) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Validade</dt>
              {modoEdicao ? (
                <input
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  className="input-base w-full text-sm"
                />
              ) : (
                <dd className="text-gray-700">
                  {orcamento.validade ? formatarData(orcamento.validade) : "—"}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-gray-400">Vendedor</dt>
              <dd className="text-gray-700">{orcamento.vendedor_nome ?? "—"}</dd>
            </div>
          </dl>

          {/* Valor total */}
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400">Valor total</p>
            <p className="text-xl font-bold text-gray-900">
              {formatBRL(orcamento.valor_total ?? 0)}
            </p>
          </div>

          {/* Observação */}
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Observação</p>
            {modoEdicao ? (
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                maxLength={1000}
                rows={2}
                className="input-base w-full resize-none text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700">{orcamento.obs || "—"}</p>
            )}
          </div>

          {/* Itens */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Itens</h3>
            {carregandoItens ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : itensFiltrados.length === 0 ? (
              <p className="text-sm text-gray-400">Sem itens.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="pb-1 text-left font-medium">Produto</th>
                    <th className="pb-1 text-right font-medium w-12">Qtde</th>
                    <th className="pb-1 text-right font-medium w-20">Unitário</th>
                    <th className="pb-1 text-right font-medium w-20">Total</th>
                    {modoEdicao && <th className="pb-1 w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map((item) => (
                    <tr key={item.id_ped_produto} className="border-b last:border-0">
                      <td className="py-1 pr-2 text-gray-800">{item.desc_produto}</td>
                      <td className="py-1 text-right text-gray-700">
                        {modoEdicao ? (
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.qtde}
                            onChange={(e) =>
                              setItens((prev) =>
                                prev?.map((i) =>
                                  i.id_ped_produto === item.id_ped_produto
                                    ? { ...i, qtde: Number(e.target.value) }
                                    : i
                                ) ?? null
                              )
                            }
                            className="w-12 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          item.qtde
                        )}
                      </td>
                      <td className="py-1 text-right text-gray-700">
                        {formatBRL(item.valor_unit)}
                      </td>
                      <td className="py-1 text-right font-medium text-gray-900">
                        {formatBRL(item.qtde * item.valor_unit * (1 - item.desconto / 100))}
                      </td>
                      {modoEdicao && (
                        <td className="py-1 pl-1">
                          <button
                            type="button"
                            onClick={() =>
                              setItens((prev) =>
                                prev?.map((i) =>
                                  i.id_ped_produto === item.id_ped_produto
                                    ? { ...i, removido: true }
                                    : i
                                ) ?? null
                              )
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Adicionar item (modo edição) */}
            {modoEdicao && (
              <div className="relative mt-2">
                <input
                  type="text"
                  value={produtoQuery}
                  onChange={(e) => {
                    setProdutoQuery(e.target.value);
                    buscarProdutos(e.target.value);
                  }}
                  placeholder="Buscar produto..."
                  className="input-base w-full text-sm"
                  autoComplete="off"
                />
                {produtoOpcoes.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {produtoOpcoes.map((p) => (
                      <li key={p.id_vhsys}>
                        <button
                          type="button"
                          onClick={() => adicionarNovoItem(p)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {p.descricao}
                          {p.valor != null && (
                            <span className="ml-2 text-xs text-gray-400">
                              {formatBRL(p.valor)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!carregandoItens && itensFiltrados.length > 0 && (
              <p className="mt-2 text-right text-sm font-semibold text-gray-800">
                Total calculado: {formatBRL(totalItens)}
              </p>
            )}
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
          )}
        </div>

        {/* Rodapé com ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <div className="flex gap-2">
            {podeEmitir && !modoEdicao && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleEmitir}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {isPending ? "Emitindo…" : "Emitir Pedido"}
              </button>
            )}
            {orcamento.pedido_emitido && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                Pedido emitido
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {podeEditar && !modoEdicao && !orcamento.pedido_emitido && (
              <button
                type="button"
                onClick={() => setModoEdicao(true)}
                className="btn-secondary"
              >
                Editar
              </button>
            )}
            {modoEdicao && (
              <>
                <button
                  type="button"
                  onClick={() => { setModoEdicao(false); setErro(null); }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={salvar}
                  className="btn-primary disabled:opacity-50"
                >
                  {isPending ? "Salvando…" : "Salvar"}
                </button>
              </>
            )}
            {!modoEdicao && (
              <button type="button" onClick={onClose} className="btn-secondary">
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
