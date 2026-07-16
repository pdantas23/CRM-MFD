"use client";
// Modal somente leitura — mostra os dados do produto no mesmo layout do
// formulário "Dados do produto" da VHSYS. Sem edição: a API pública documentada
// (docs/vhsys/API_NOTES.md) só expõe GET /produtos e GET /produtos/{id}, não há
// endpoint de atualização do cadastro do produto.

import type { ProdutoRow } from "./ProdutosFornecedorList";
import { formatBRL } from "@/lib/format";

interface Props {
  produto: ProdutoRow;
  onClose: () => void;
}

// Tabela padrão de Origem da Mercadoria (NF-e).
const ORIGEM_PRODUTO_LABELS: Record<number, string> = {
  0: "0 - Nacional",
  1: "1 - Estrangeira – Importação direta",
  2: "2 - Estrangeira – Adquirida no mercado interno",
  3: "3 - Nacional – Conteúdo de importação > 40%",
  4: "4 - Nacional – Produção conforme processos produtivos básicos",
  5: "5 - Nacional – Conteúdo de importação ≤ 40%",
  6: "6 - Estrangeira – Importação direta, sem similar nacional",
  7: "7 - Estrangeira – Adquirida no mercado interno, sem similar nacional",
  8: "8 - Nacional – Conteúdo de importação > 70%",
};

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || value === 0 ? value : "—"}</dd>
    </div>
  );
}

function pesoFmt(valor: string | undefined): string {
  if (!valor) return "—";
  const n = Number(valor);
  return Number.isFinite(n) ? `${n.toLocaleString("pt-BR")} kg` : "—";
}

export function ProdutoDetalheModal({ produto, onClose }: Props) {
  const d = produto.dados;
  const variacao = Number(d.produto_variado) === 1;
  const origem = typeof d.origem_produto === "number" ? d.origem_produto : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Dados do produto</h2>
            <p className="text-xs text-gray-500">Somente leitura — espelho do cadastro VHSYS</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="max-h-[80vh] overflow-y-auto px-6 py-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome do produto" value={d.desc_produto} />
            <Campo label="Código GTIN/EAN" value={d.codigo_barra_produto} />

            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Produto com variação
              </dt>
              <dd className="mt-1">
                <input type="checkbox" checked={variacao} disabled className="h-4 w-4 rounded border-gray-300" />
              </dd>
            </div>
            <Campo label="Código do produto" value={produto.codigo} />

            <Campo label="NCM" value={d.ncm_produto} />
            <Campo label="Unidade" value={produto.unidade} />

            <Campo label="Marca" value={produto.marca} />
            <Campo label="Valor de venda" value={produto.valor != null ? formatBRL(produto.valor) : "—"} />

            <Campo label="Valor de custo" value={produto.valor_custo != null ? formatBRL(produto.valor_custo) : "—"} />
            <div />

            <Campo label="Peso bruto" value={pesoFmt(d.peso_produto)} />
            <Campo label="Peso líquido" value={pesoFmt(d.peso_liq_produto)} />

            <Campo label="Tamanho do produto" value={d.tamanho_produto} />
            <Campo
              label="Origem de produto"
              value={origem !== undefined ? ORIGEM_PRODUTO_LABELS[origem] ?? String(origem) : "—"}
            />

            <Campo label="Situação" value={produto.status} />
            <Campo
              label="Fornecedor"
              value={
                produto.fornecedor_produto ? (
                  <>
                    {produto.fornecedor_produto}
                    {produto.fornecedor_produto_id ? (
                      <span className="ml-1 text-xs text-gray-400">(ID: {produto.fornecedor_produto_id})</span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )
              }
            />

            <Campo label="Código de barras interno" value={d.codigo_barras_internos} />
            <Campo
              label="Categoria"
              value={
                d.id_categoria ? (
                  <>
                    Categoria #{d.id_categoria}
                    <span className="ml-1 text-xs text-gray-400">(ID interno VHSYS)</span>
                  </>
                ) : (
                  "—"
                )
              }
            />

            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">Descrição</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-gray-900">{d.obs_produto || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
