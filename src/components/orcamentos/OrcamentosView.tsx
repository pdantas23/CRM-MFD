"use client";
// Orquestrador de visões da tela de orçamentos: Lista (EntityTable) e Kanban (KanbanBoard).
// Substitui o antigo OrcamentosClient (removido), reaproveitando os genéricos de CRM
// e adicionando a visão Kanban com carregamento agrupado por situação.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BotaoNavegacao } from "@/components/ui/BotaoNavegacao";
import { formatBRL, formatarData } from "@/lib/format";
import { EntityToolbar } from "@/components/crm/EntityToolbar";
import { EntityMetrics } from "@/components/crm/EntityMetrics";
import { FiltroConvertido } from "@/components/crm/FiltroConvertido";
import { FiltrosUrlProvider, useFiltrosUrl } from "@/components/crm/FiltrosUrlProvider";
import { OverlayCarregando } from "@/components/crm/OverlayCarregando";
import { EntityTable, type ColunaTabela } from "@/components/crm/EntityTable";
import { KanbanBoard, type KanbanColuna } from "@/components/crm/KanbanBoard";
import { ViewToggle } from "@/components/crm/ViewToggle";
import { OrcamentoModal } from "./OrcamentoModal";
import { OrcamentoCard } from "./OrcamentoCard";
import { EmitirPedidoModal } from "./EmitirPedidoModal";
import { buscarMaisOrcamentos } from "@/lib/vhsys/acoes-orcamentos";
import { moverSituacaoOrcamento } from "@/lib/vhsys/acoes";
import type { ModeloOrcamento } from "@/lib/vhsys/situacoes-orcamento";
import type { Metrica } from "@/lib/crm/metricas";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";

type ViewAtual = "lista" | "kanban";

// Cor por situação — derivada da SEMÂNTICA do modelo da conta (sem ids fixos).
function corSituacaoDe(m: ModeloOrcamento, id: number | null): string {
  if (id === m.emNegociacaoId) return "bg-amber-100 text-amber-800 border-amber-200";
  if (id === m.emAndamentoVirtual) return "bg-primary-100 text-primary-800 border-primary-200";
  if (id === m.aprovadoId) return "bg-green-100 text-green-800 border-green-200";
  if (id === m.perdidoId) return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

interface Props {
  // ── Lista ──
  orcamentos: OrcamentoRow[];
  pagina: number;
  totalPaginas: number;
  countAproximado?: boolean;
  // ── Kanban ──
  orcamentosKanban: OrcamentoRow[];
  atingiuLimitePorSituacao: Record<number, boolean>;
  // ── Compartilhados ──
  situacoes: SituacaoRow[];
  vendedores: { id_vhsys: number; nome: string }[];
  profile: Profile;
  filtros: FiltrosCrm;
  metricas: Metrica[];
  podeEscrever?: boolean;
  /** Modelo de situações de orçamento da conta (colunas/cores/nomes data-driven). */
  modeloOrc: ModeloOrcamento;
}

export function OrcamentosView(props: Props) {
  return (
    <FiltrosUrlProvider>
      <OrcamentosViewInner {...props} />
    </FiltrosUrlProvider>
  );
}

function OrcamentosViewInner({
  orcamentos,
  pagina,
  totalPaginas,
  countAproximado = false,
  orcamentosKanban,
  atingiuLimitePorSituacao,
  situacoes,
  vendedores,
  profile,
  filtros,
  metricas,
  podeEscrever,
  modeloOrc,
}: Props) {
  const router = useRouter();
  const { aplicar } = useFiltrosUrl();

  const [viewAtual, setViewAtual] = useState<ViewAtual>("lista");
  const [orcamentoAberto, setOrcamentoAberto] = useState<OrcamentoRow | null>(null);
  const [orcamentoEmitir, setOrcamentoEmitir] = useState<OrcamentoRow | null>(null);

  // Fecha o detalhe e abre o formulário de emissão de pedido.
  const abrirEmissao = (o: OrcamentoRow) => {
    setOrcamentoAberto(null);
    setOrcamentoEmitir(o);
  };

  const situacaoPorId = new Map(situacoes.map((s) => [s.id_vhsys, s]));

  const podeNovo = ehAdmin(profile.role) || profile.role === "vendedor";
  const opcoesSituacao = situacoes.map((s) => ({ id: s.id_vhsys, nome: s.nome }));

  // ── Definição de colunas da tabela (migrada de OrcamentosClient) ──────────
  const colunasTabela: ColunaTabela<OrcamentoRow>[] = [
    {
      header: "Nº",
      render: (o) => (
        <span className="font-semibold text-gray-900">#{o.numero}</span>
      ),
      tdClassName: "text-gray-900",
    },
    {
      header: "Cliente",
      render: (o) => <span className="text-gray-900">{o.nome_cliente}</span>,
    },
    {
      header: "Vendedor",
      render: (o) => <span className="text-gray-500">{o.vendedor_nome ?? "—"}</span>,
    },
    {
      header: "Data",
      render: (o) => (
        <span className="text-gray-500">
          {o.data_orcamento ? formatarData(o.data_orcamento) : "—"}
        </span>
      ),
    },
    {
      header: "Valor",
      align: "right",
      render: (o) => (
        <span className="font-medium text-gray-900">{formatBRL(o.valor_total ?? 0)}</span>
      ),
    },
    {
      header: "Situação",
      render: (o) => {
        const nomeSituacao =
          (o.situacao_id != null ? situacaoPorId.get(o.situacao_id)?.nome : undefined) ??
          (o.situacao_id != null ? modeloOrc.nomePorId[o.situacao_id] : undefined) ??
          o.status_base ??
          "—";
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${corSituacaoDe(
              modeloOrc,
              o.situacao_id
            )}`}
          >
            {nomeSituacao}
          </span>
        );
      },
    },
    {
      header: "Pedido",
      render: (o) =>
        o.pedido_emitido ? (
          <span className="font-medium text-green-700">Emitido</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
      tdClassName: "text-xs",
    },
    {
      header: "PDF",
      // Preview do PDF oficial do VHSYS. stopPropagation p/ não abrir o modal.
      render: (o) => (
        <a
          href={`/orcamento-pdf/${o.id_vhsys}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Ver PDF do orçamento"
          aria-label="Ver PDF do orçamento"
          className="inline-flex items-center justify-center rounded p-1 text-primary-600 hover:bg-primary-50 hover:text-primary-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-6L12 15m0 0l4.5-4.5M12 15V3" />
          </svg>
        </a>
      ),
      thClassName: "whitespace-nowrap",
      tdClassName: "whitespace-nowrap",
    },
  ];

  // Compacta o padding horizontal (px-4 → px-2) de todas as colunas para caber a
  // coluna extra "PDF" sem scroll horizontal. `!` garante precedência sobre o
  // px-4 padrão do EntityTable (sem alterar o componente compartilhado).
  const colunasCompactas: ColunaTabela<OrcamentoRow>[] = colunasTabela.map((c) => ({
    ...c,
    thClassName: `!px-2${c.thClassName ? ` ${c.thClassName}` : ""}`,
    tdClassName: `!px-2${c.tdClassName ? ` ${c.tdClassName}` : ""}`,
  }));

  // ── Colunas do Kanban (data-driven pelo modelo da conta) ──────────────────
  // ids virtuais (ex: -2) não estão em vhsys_situacoes; o nome vem do modelo.
  function corBordaSituacaoDe(id: number): string {
    if (id === modeloOrc.emNegociacaoId) return "border-amber-300";
    if (id === modeloOrc.emAndamentoVirtual) return "border-primary-300";
    if (id === modeloOrc.aprovadoId) return "border-green-300";
    if (id === modeloOrc.perdidoId) return "border-red-300";
    return "border-gray-300";
  }

  const colunasKanban: KanbanColuna[] = modeloOrc.colunas.map((id) => ({
    id,
    nome: situacaoPorId.get(id)?.nome ?? modeloOrc.nomePorId[id] ?? String(id),
    segmentoCor: corBordaSituacaoDe(id),
  }));

  async function handleCarregarMais(
    situacaoId: number,
    offset: number
  ): Promise<{ itens: OrcamentoRow[]; erro?: boolean }> {
    const resultado = await buscarMaisOrcamentos(situacaoId, offset);
    if (resultado.erro) return { itens: [], erro: true };
    return { itens: resultado.orcamentos };
  }

  return (
    <>
      <EntityToolbar
        filtros={filtros}
        situacoes={opcoesSituacao}
        vendedores={vendedores}
        mostrarVendedor={ehAdmin(profile.role)}
        filtroEspecifico={<FiltroConvertido />}
        acaoPrimaria={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ViewToggle
              opcoes={[
                { valor: "lista", label: "Lista" },
                { valor: "kanban", label: "Kanban" },
              ]}
              valor={viewAtual}
              onChange={(v) => setViewAtual(v as ViewAtual)}
            />
            {podeNovo && (
              <BotaoNavegacao
                href="/orcamentos/novo"
                className="btn-primary w-full sm:w-auto"
                labelPending="Abrindo…"
              >
                + Novo Orçamento
              </BotaoNavegacao>
            )}
          </div>
        }
      />

      <OverlayCarregando>
      <EntityMetrics metricas={metricas} />

      {/* ── Visão Lista ───────────────────────────────────────────────────── */}
      {viewAtual === "lista" && (
        <>
          <EntityTable<OrcamentoRow>
            colunas={colunasCompactas}
            rows={orcamentos}
            getRowKey={(o) => o.id}
            onRowClick={(o) => setOrcamentoAberto(o)}
            emptyMessage="Nenhum orçamento encontrado com estes filtros."
            divideClassName="divide-gray-200"
          />

          {/* Paginação */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Página {pagina} de {countAproximado ? "≈ " : ""}
              {totalPaginas}
            </span>
            <div className="flex gap-2">
              {pagina > 1 && (
                <button
                  type="button"
                  onClick={() => aplicar({ pagina: String(pagina - 1) })}
                  className="btn-secondary !px-3 !py-1.5 text-sm"
                >
                  Anterior
                </button>
              )}
              {pagina < totalPaginas && (
                <button
                  type="button"
                  onClick={() => aplicar({ pagina: String(pagina + 1) })}
                  className="btn-secondary !px-3 !py-1.5 text-sm"
                >
                  Próxima
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Visão Kanban ──────────────────────────────────────────────────── */}
      {viewAtual === "kanban" && (
        <KanbanBoard<OrcamentoRow>
          colunas={colunasKanban}
          itens={orcamentosKanban}
          getColunaId={(o) => o.situacao_id}
          getId={(o) => o.id}
          getValor={(o) => o.valor_total ?? 0}
          renderCard={(o, colunaId) => (
            // Reflete a coluna efetiva (override otimista do DnD) no situacao_id
            // para o botão "Emitir Pedido" aparecer já ao arrastar para Aprovado.
            <OrcamentoCard
              orcamento={o.situacao_id === colunaId ? o : { ...o, situacao_id: colunaId }}
              onClick={setOrcamentoAberto}
              onEmitir={abrirEmissao}
              aprovadoId={modeloOrc.aprovadoId}
            />
          )}
          atingiuLimitePorColuna={atingiuLimitePorSituacao}
          carregarMais={handleCarregarMais}
          mensagemVazio="Nenhum orçamento nesta situação"
          podeMoverItem={(o) => !o.pedido_emitido}
          onMoverCard={
            podeEscrever
              ? async (orc, novaSituacaoId) => {
                  const res = await moverSituacaoOrcamento(orc.id_vhsys, novaSituacaoId);
                  // Reconcilia sempre que NÃO houve falha explícita (ok ou
                  // resposta perdida): a escrita pode ter persistido mesmo sem
                  // resposta. Propaga res como está — undefined não reverte.
                  if (!res || res.ok) router.refresh();
                  return res;
                }
              : undefined
          }
        />
      )}
      </OverlayCarregando>

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      {orcamentoAberto && (
        <OrcamentoModal
          orcamento={orcamentoAberto}
          situacaoNome={
            orcamentoAberto.situacao_id != null
              ? (situacaoPorId.get(orcamentoAberto.situacao_id)?.nome ??
                 modeloOrc.nomePorId[orcamentoAberto.situacao_id] ??
                 null)
              : null
          }
          situacoes={situacoes}
          profile={profile}
          podeEscrever={podeEscrever}
          mostrarMoverSituacao={viewAtual === "lista"}
          onEmitir={abrirEmissao}
          onClose={() => setOrcamentoAberto(null)}
          modeloOrc={modeloOrc}
        />
      )}

      {orcamentoEmitir && (
        <EmitirPedidoModal
          orcamento={orcamentoEmitir}
          profile={profile}
          vendedores={vendedores}
          onClose={() => setOrcamentoEmitir(null)}
          onEmitido={() => {
            setOrcamentoEmitir(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
