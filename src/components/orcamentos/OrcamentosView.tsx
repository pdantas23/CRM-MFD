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
import { COLUNAS_KANBAN_ORCAMENTO, NOME_COLUNA_ORC } from "@/lib/vhsys/fluxo-orcamentos";
import type { Metrica } from "@/lib/crm/metricas";
import type { FiltrosCrm } from "@/lib/crm/filtros";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";

type ViewAtual = "lista" | "kanban";

// Cores por situação (ids da conta — 860, 768, 769 — e virtual -2)
const corSituacao: Record<number, string> = {
  860: "bg-amber-100 text-amber-800 border-amber-200",
  [-2]: "bg-blue-100 text-blue-800 border-blue-200",
  768: "bg-green-100 text-green-800 border-green-200",
  769: "bg-red-100 text-red-800 border-red-200",
};

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
          (o.situacao_id != null ? NOME_COLUNA_ORC[o.situacao_id] : undefined) ??
          o.status_base ??
          "—";
        return (
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              (o.situacao_id != null && corSituacao[o.situacao_id]) ||
              "bg-gray-100 text-gray-700 border-gray-200"
            }`}
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
  ];

  // ── Colunas do Kanban ─────────────────────────────────────────────────────
  // ids negativos (ex: -2) são virtuais e não estão em vhsys_situacoes;
  // resolve o nome via NOME_COLUNA_ORC como fallback.
  const corBordaSituacao: Record<number, string> = {
    860: "border-amber-300",
    [-2]: "border-blue-300",
    768: "border-green-300",
    769: "border-red-300",
  };

  const colunasKanban: KanbanColuna[] = COLUNAS_KANBAN_ORCAMENTO.map((id) => ({
    id,
    nome: situacaoPorId.get(id)?.nome ?? NOME_COLUNA_ORC[id] ?? String(id),
    segmentoCor: corBordaSituacao[id] ?? "border-gray-300",
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
          <div className="flex items-center gap-2">
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
            colunas={colunasTabela}
            rows={orcamentos}
            getRowKey={(o) => o.id}
            onRowClick={(o) => setOrcamentoAberto(o)}
            emptyMessage="Nenhum orçamento encontrado com estes filtros."
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
                  if (res.ok) router.refresh();
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
                 NOME_COLUNA_ORC[orcamentoAberto.situacao_id] ??
                 null)
              : null
          }
          situacoes={situacoes}
          profile={profile}
          podeEscrever={podeEscrever}
          mostrarMoverSituacao={viewAtual === "lista"}
          onEmitir={abrirEmissao}
          onClose={() => setOrcamentoAberto(null)}
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
