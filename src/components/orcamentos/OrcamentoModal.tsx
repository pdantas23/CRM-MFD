"use client";
// Modal de detalhes do orçamento com itens e parcelas sob demanda (skeleton enquanto carrega)
// Edição é feita na página dedicada /orcamentos/[idVhsys]/editar.

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { moverSituacaoOrcamento } from "@/lib/vhsys/acoes";
import { BotaoNavegacao } from "@/components/ui/BotaoNavegacao";
import { formatBRL, formatarData } from "@/lib/format";
import type { ModeloOrcamento } from "@/lib/vhsys/situacoes-orcamento";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";

interface ItemApi {
  id_ped_produto: number;
  id_produto: number;
  desc_produto: string;
  qtde_produto: string;
  valor_unit_produto: string;
  desconto_produto?: number;
}

interface ItemExibido {
  id_ped_produto: number;
  desc_produto: string;
  qtde: number;
  valor_unit: number;
  desconto: number;
}

interface Props {
  orcamento: OrcamentoRow;
  situacaoNome: string | null;
  /** Situações disponíveis para o painel "Mover situação". */
  situacoes?: SituacaoRow[];
  profile: Profile;
  /** Se true, exibe o painel de mover situação (admin ou vendedor-autor). */
  podeEscrever?: boolean;
  /** Só exibe o painel de mover situação no modo Lista (no Kanban é por drag). */
  mostrarMoverSituacao?: boolean;
  /** Abre o formulário de emissão de pedido (em vez de emitir direto). */
  onEmitir?: (orcamento: OrcamentoRow) => void;
  onClose: () => void;
  /** Modelo de situações de orçamento da conta (colunas/nomes/aprovado). */
  modeloOrc: ModeloOrcamento;
}

export function OrcamentoModal({ orcamento, situacaoNome, situacoes = [], profile, podeEscrever, mostrarMoverSituacao, onEmitir, onClose, modeloOrc }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Controle do painel "Mover situação"
  const [erroMover, setErroMover] = useState<string | null>(null);
  const [situacaoPendente, setSituacaoPendente] = useState<number | null>(null);

  // Itens carregados sob demanda
  const [itens, setItens] = useState<ItemExibido[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  // Opções de destino para mover situação: todas as colunas do Kanban excluindo a atual.
  const situacoesPorId = new Map(situacoes.map((s) => [s.id_vhsys, s]));
  const opcoesDestino = modeloOrc.colunas
    .filter((id) => id !== orcamento.situacao_id)
    .map((id) => ({
      id_vhsys: id,
      nome: situacoesPorId.get(id)?.nome ?? modeloOrc.nomePorId[id] ?? String(id),
    }));

  function handleMoverSituacao(novaSituacaoId: number) {
    setErroMover(null);
    setSituacaoPendente(novaSituacaoId);
    startTransition(async () => {
      const resultado = await moverSituacaoOrcamento(orcamento.id_vhsys, novaSituacaoId);
      setSituacaoPendente(null);
      if (!resultado.ok) {
        setErroMover(resultado.erro ?? "Erro ao mover situação.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const podeEditar =
    ehAdmin(profile.role) ||
    (profile.role === "vendedor" && profile.vendedor_id === orcamento.vendedor_id_vhsys);
  const podeEmitir =
    !orcamento.pedido_emitido &&
    modeloOrc.aprovadoId !== null &&
    orcamento.situacao_id === modeloOrc.aprovadoId &&
    (ehAdmin(profile.role) ||
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
            desc_produto: i.desc_produto,
            qtde: Number(i.qtde_produto),
            valor_unit: Number(i.valor_unit_produto),
            desconto: Number(i.desconto_produto ?? 0),
          }))
        );
      })
      .catch(() => setItens([]))
      .finally(() => setCarregandoItens(false));
  }, [orcamento.id_vhsys]);

  const itensFiltrados = itens ?? [];
  const totalItens = itensFiltrados.reduce(
    (s, i) => s + i.qtde * i.valor_unit * (1 - i.desconto / 100),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
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

        <div className="max-h-[75vh] overflow-y-auto px-6 py-4 space-y-5">
          {/* Cabeçalho: situação, data, vendedor */}
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
              <dd className="text-gray-700">
                {orcamento.validade ? formatarData(orcamento.validade) : "—"}
              </dd>
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

          {/* Observação / referência */}
          {(orcamento.obs || orcamento.referencia) && (
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {orcamento.obs && (
                <div>
                  <dt className="text-xs text-gray-400">Observação</dt>
                  <dd className="text-gray-700">{orcamento.obs}</dd>
                </div>
              )}
              {orcamento.referencia && (
                <div>
                  <dt className="text-xs text-gray-400">Referência</dt>
                  <dd className="text-gray-700">{orcamento.referencia}</dd>
                </div>
              )}
            </dl>
          )}

          {/* Painel de mover situação */}
          {mostrarMoverSituacao && podeEscrever && !orcamento.pedido_emitido && opcoesDestino.length > 0 && (
            <div className="rounded-lg border border-primary-100 bg-primary-50 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary-700">
                Mover situação
              </label>
              {erroMover && (
                <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {erroMover}
                </p>
              )}
              <select
                value=""
                disabled={situacaoPendente !== null}
                onChange={(e) => {
                  if (e.target.value) handleMoverSituacao(Number(e.target.value));
                }}
                className="input-base w-full"
              >
                <option value="">
                  {situacaoPendente !== null ? "Movendo…" : "Selecione a nova situação…"}
                </option>
                {opcoesDestino.map((s) => (
                  <option key={s.id_vhsys} value={s.id_vhsys}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Itens (read-only) */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Itens</h3>
            {carregandoItens ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                {itensFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem itens.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-gray-400">
                        <th className="pb-1 text-left font-medium">Produto</th>
                        <th className="pb-1 text-right font-medium w-12">Qtde</th>
                        <th className="pb-1 text-right font-medium w-20">Unitário</th>
                        <th className="pb-1 text-right font-medium w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensFiltrados.map((item) => (
                        <tr key={item.id_ped_produto} className="border-b last:border-0">
                          <td className="py-1 pr-2 text-gray-800">{item.desc_produto}</td>
                          <td className="py-1 text-right text-gray-700">{item.qtde}</td>
                          <td className="py-1 text-right text-gray-700">
                            {formatBRL(item.valor_unit)}
                          </td>
                          <td className="py-1 text-right font-medium text-gray-900">
                            {formatBRL(item.qtde * item.valor_unit * (1 - item.desconto / 100))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {itensFiltrados.length > 0 && (
                  <p className="mt-2 text-right text-sm font-semibold text-gray-800">
                    Total calculado: {formatBRL(totalItens)}
                  </p>
                )}
              </>
            )}
          </div>

        </div>

        {/* Rodapé com ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <div className="flex gap-2">
            {orcamento.pedido_emitido && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                Pedido emitido
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {podeEditar && !orcamento.pedido_emitido && (
              <BotaoNavegacao
                href={`/orcamentos/${orcamento.id_vhsys}/editar`}
                className="btn-secondary"
                labelPending="Abrindo…"
              >
                Editar
              </BotaoNavegacao>
            )}
            {podeEmitir && onEmitir && (
              <button
                type="button"
                onClick={() => onEmitir(orcamento)}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
              >
                Emitir Pedido
              </button>
            )}
            {!podeEmitir && (
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
