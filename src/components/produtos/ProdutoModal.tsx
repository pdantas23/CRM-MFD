"use client";
// Modal do produto (clique no nome, na aba Produtos), em duas abas:
// Informações (nome, seção, fornecedor, dados do cadastro no VHSYS) e
// Calculadora de custos (detalhamento do custo líquido e da margem). "Salvar" grava no CRM; "Salvar e enviar" também
// envia ao VHSYS (custo líquido, venda, fornecedor e nome).

import { useEffect, useMemo, useState } from "react";
import { formatBRL, formatarData } from "@/lib/format";
import {
  detalhesProduto,
  enviarProdutoAoVhsys,
  excluirProduto,
  salvarProduto,
  type DetalhesProduto,
} from "@/lib/produtos/acoes";
import type { FornecedorVhsys, LinhaProduto } from "@/lib/produtos/dados";
import {
  ORDEM_SECOES,
  SEM_SECAO,
  custoLiquido,
  difalPct,
  margem,
  precoEquilibrio,
  somaTaxas,
  vendaParaMargem,
  type TaxasProduto,
} from "@/lib/produtos/precificacao";
import { BadgeConta } from "./BadgeConta";
import { CampoNumero } from "./CampoNumero";
import { SeletorFornecedor } from "./SeletorFornecedor";
import { aplicarEnvio, situacaoDe } from "./situacao";

// Percentuais: o banco guarda fração (0.0982); o formulário mostra pontos (9,82).
const emPct = (f: number | null) => (f === null ? null : Math.round(f * 1e6) / 1e4);
const dePct = (p: number | null) => (p === null ? null : Math.round(p * 1e4) / 1e6);
const brl = (v: number | null) => (v === null ? "—" : formatBRL(v));
const pct = (f: number | null) =>
  f === null ? "—" : `${(f * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function Campo({ label, dica, children }: { label: string; dica?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {dica && <p className="mt-1 text-xs text-gray-400">{dica}</p>}
    </div>
  );
}

function Etapa({
  n,
  titulo,
  subtitulo,
  resultado,
  children,
}: {
  n: number;
  titulo: string;
  subtitulo: string;
  resultado: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200">
      <div className="space-y-3 px-4 py-3">
        <header className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
            {n}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
            <p className="text-xs text-gray-500">{subtitulo}</p>
          </div>
        </header>
        {children}
      </div>
      <div className="space-y-0.5 rounded-b-lg border-t border-gray-200 bg-gray-50 px-4 py-2.5">{resultado}</div>
    </section>
  );
}

function ResultadoEtapa({ label, valor, negativo }: { label: string; valor: string; negativo?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-base font-semibold tabular-nums ${negativo ? "text-red-600" : "text-gray-900"}`}>
        {valor}
      </span>
    </div>
  );
}

export function ProdutoModal({
  linha,
  icmsAtual,
  fornecedores,
  secoes,
  onFechar,
  onAtualizada,
  onExcluida,
}: {
  linha: LinhaProduto;
  icmsAtual: number;
  fornecedores: FornecedorVhsys[];
  secoes: string[];
  onFechar: () => void;
  onAtualizada: (l: LinhaProduto) => void;
  /** Produto excluído (VHSYS + CRM): sai da tabela. */
  onExcluida: (l: LinhaProduto) => void;
}) {
  const [nome, setNome] = useState(linha.produto);
  const [secao, setSecao] = useState(linha.secao === SEM_SECAO ? "" : linha.secao);
  const [fornecedorId, setFornecedorId] = useState(linha.fornecedorId);
  const [precoCusto, setPrecoCusto] = useState(linha.precoCusto);
  const [frete, setFrete] = useState(linha.frete);
  const [credito, setCredito] = useState(emPct(linha.creditoIcms));
  const [op, setOp] = useState(emPct(linha.custoOp));
  const [com, setCom] = useState(emPct(linha.comissao));
  const [imp, setImp] = useState(emPct(linha.impostoSaida));
  const [venda, setVenda] = useState(linha.valorVenda);
  const [detalhes, setDetalhes] = useState<DetalhesProduto | null>(null);
  const [estado, setEstado] = useState<"livre" | "salvando" | "enviando" | "excluindo">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"info" | "calculadora">("info");

  useEffect(() => {
    if (linha.idVhsys === null) return;
    let vivo = true;
    detalhesProduto(linha.contaId, linha.idVhsys)
      .then((d) => vivo && setDetalhes(d))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [linha.contaId, linha.idVhsys]);

  // Fecha com Escape (exceto com envio em andamento).
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape" && estado === "livre") onFechar();
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [estado, onFechar]);

  const taxas: TaxasProduto = {
    precoCusto,
    frete,
    creditoIcms: dePct(credito),
    custoOp: dePct(op) ?? 0,
    comissao: dePct(com) ?? 0,
    impostoSaida: dePct(imp) ?? 0,
  };
  const liq = custoLiquido(taxas, icmsAtual);
  const equilibrio = precoEquilibrio(taxas, icmsAtual);
  const m = margem(taxas, icmsAtual, venda);
  const vendaEfetiva = venda ?? equilibrio;
  const pctDifal = difalPct(taxas.creditoIcms, icmsAtual);
  const difal = precoCusto === null ? null : pctDifal * precoCusto;
  const sobreVenda = (f: number) => (vendaEfetiva === null ? null : f * vendaEfetiva);
  const lucro = vendaEfetiva === null || liq === null ? null : vendaEfetiva - liq - somaTaxas(taxas) * vendaEfetiva;

  const opcoesSecao = useMemo(
    () => Array.from(new Set([...ORDEM_SECOES, ...secoes])).filter((s) => s !== SEM_SECAO),
    [secoes]
  );
  const fornecedorVhsys = fornecedores.find((f) => f.id === linha.vhsys?.fornecedorId)?.nome;
  const situacao = situacaoDe(linha, icmsAtual);

  function mudarMargem(p: number | null) {
    if (p === null) return setVenda(null);
    const v = vendaParaMargem(taxas, icmsAtual, p / 100);
    if (v !== null) setVenda(v);
  }

  async function salvar(enviar: boolean) {
    setErro(null);
    if (op === null || com === null || imp === null) {
      setErro("Preencha custos operacionais, comissões e imposto de saída.");
      return;
    }
    if (!nome.trim()) {
      setErro("O nome do produto não pode ficar vazio.");
      return;
    }
    const vendaFinal = venda === null ? null : Math.round(venda * 100) / 100;
    setEstado("salvando");
    try {
      const res = await salvarProduto({
        id: linha.id,
        contaId: linha.contaId,
        idVhsys: linha.idVhsys,
        secao: secao.trim() || null,
        precoCusto,
        frete,
        creditoIcms: taxas.creditoIcms,
        custoOp: taxas.custoOp,
        comissao: taxas.comissao,
        impostoSaida: taxas.impostoSaida,
        valorVenda: vendaFinal,
        fornecedorId,
        nome: nome.trim(),
      });
      if (!res.ok || !res.id) {
        setErro(res.erro ?? "Falha ao salvar.");
        return;
      }
      const nomeNovo = nome.trim();
      let salva: LinhaProduto = {
        ...linha,
        ...taxas,
        id: res.id,
        produto: nomeNovo,
        nomeEditado: linha.vhsys && nomeNovo === linha.vhsys.nome ? null : nomeNovo,
        secao: secao.trim() || SEM_SECAO,
        fornecedorId,
        valorVenda: vendaFinal,
        avisoCompra: null,
        alteradoEm: new Date().toISOString(),
      };
      if (enviar && salva.idVhsys !== null) {
        setEstado("enviando");
        const envio = await enviarProdutoAoVhsys(res.id);
        salva = aplicarEnvio(salva, envio);
        onAtualizada(salva);
        if (!envio.ok) {
          setErro(`Salvo no CRM, mas o VHSYS recusou: ${envio.erro}`);
          return;
        }
      } else {
        onAtualizada(salva);
      }
      onFechar();
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setEstado("livre");
    }
  }

  const ocupado = estado !== "livre";

  async function excluir() {
    const ondeVhsys = linha.idVhsys !== null ? " no VHSYS (vai para a lixeira de lá) e" : "";
    if (!window.confirm(`Excluir "${linha.produto}"${ondeVhsys} da aba Produtos?`)) return;
    setErro(null);
    setEstado("excluindo");
    try {
      const res = await excluirProduto({ id: linha.id, contaId: linha.contaId, idVhsys: linha.idVhsys });
      if (!res.ok) {
        setErro(`Não foi possível excluir: ${res.erro}`);
        return;
      }
      onExcluida(linha);
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setEstado("livre");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onFechar();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BadgeConta slug={linha.contaSlug} />
              {detalhes?.codigo && <span className="text-xs text-gray-400">{detalhes.codigo}</span>}
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold text-gray-900" title={linha.produto}>
              {linha.produto}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {erro && <p className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <nav className="flex gap-1 border-b border-gray-200 px-6">
          {(
            [
              ["info", "Informações"],
              ["calculadora", "Calculadora de custos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                aba === id ? "border-b-2 border-primary-600 text-primary-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="px-6 py-5">
          {/* Informações */}
          <div className={aba === "info" ? "space-y-4" : "hidden"}>
            <Campo
              label="Nome"
              dica={linha.idVhsys !== null ? "Ao enviar, o nome também é alterado no VHSYS." : undefined}
            >
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={255}
                className="input-base"
              />
            </Campo>
            <Campo label="Seção">
              <select value={secao} onChange={(e) => setSecao(e.target.value)} className="input-base">
                <option value="">{SEM_SECAO}</option>
                {opcoesSecao.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              label="Fornecedor"
              dica={fornecedorVhsys && fornecedorId !== linha.vhsys?.fornecedorId ? `No VHSYS: ${fornecedorVhsys}` : undefined}
            >
              <SeletorFornecedor formulario valor={fornecedorId} opcoes={fornecedores} onEscolher={setFornecedorId} />
            </Campo>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-4 py-3 text-sm">
              {[
                ["Código", detalhes?.codigo],
                ["Unidade", detalhes?.unidade],
                ["NCM", detalhes?.ncm],
                ["Marca", detalhes?.marca],
                ["Estoque", detalhes?.estoque?.toLocaleString("pt-BR")],
                ["Situação no VHSYS", detalhes?.status],
                ["Última compra", linha.ultimaCompra ? formatarData(linha.ultimaCompra) : null],
                ["No VHSYS hoje", linha.vhsys ? `custo ${brl(linha.vhsys.valorCusto)} · venda ${brl(linha.vhsys.valor)}` : "sem cadastro"],
              ].map(([label, valor]) => (
                <div key={label as string} className={label === "No VHSYS hoje" ? "col-span-2" : ""}>
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="text-gray-800">{valor || "—"}</dd>
                </div>
              ))}
            </dl>
            {linha.avisoCompra && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠ {linha.avisoCompra}</p>
            )}
            {situacao === "erro" && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Último envio falhou: {linha.erroEnvio}</p>
            )}
          </div>

          {/* Calculadora de custos — três etapas, na ordem em que o preço se forma */}
          <div className={aba === "calculadora" ? "space-y-4" : "hidden"}>
            <Etapa
              n={1}
              titulo="Custo do produto"
              subtitulo="Quanto o produto custa até chegar ao estoque"
              resultado={
                <>
                  <ResultadoEtapa label="Custo líquido" valor={brl(liq)} />
                  {liq !== null && (
                    <p className="text-xs text-gray-500">
                      {brl(precoCusto)} de custo + {brl(frete ?? 0)} de frete + {brl(difal)} de DIFAL (
                      {pct(pctDifal)} do custo)
                    </p>
                  )}
                </>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Campo label="Preço de custo">
                  <CampoNumero value={precoCusto} onChange={setPrecoCusto} prefixo="R$" />
                </Campo>
                <Campo label="Frete">
                  <CampoNumero value={frete} onChange={setFrete} prefixo="R$" />
                </Campo>
                <Campo label="Crédito de ICMS" dica="Vazio = compra interna (sem DIFAL) · 0 = DIFAL cheio">
                  <CampoNumero value={credito} onChange={setCredito} sufixo="%" placeholder="interno" />
                </Campo>
              </div>
            </Etapa>

            <Etapa
              n={2}
              titulo="Despesas da venda"
              subtitulo="Percentuais descontados do preço de venda"
              resultado={
                <>
                  <ResultadoEtapa label="Preço mínimo (equilíbrio)" valor={brl(equilibrio)} />
                  <p className="text-xs text-gray-500">
                    Despesas somam {pct(somaTaxas(taxas))} da venda · abaixo desse preço o produto dá prejuízo
                  </p>
                </>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Campo label="Custos operacionais">
                  <CampoNumero value={op} onChange={setOp} sufixo="%" />
                </Campo>
                <Campo label="Comissões">
                  <CampoNumero value={com} onChange={setCom} sufixo="%" />
                </Campo>
                <Campo label="Imposto de saída">
                  <CampoNumero value={imp} onChange={setImp} sufixo="%" />
                </Campo>
              </div>
            </Etapa>

            <Etapa
              n={3}
              titulo="Preço de venda"
              subtitulo="Digite o valor de venda OU a margem — o outro é calculado"
              resultado={
                venda === null ? (
                  <p className="text-sm text-amber-700">
                    Sem valor de venda: o VHSYS recebe o preço mínimo ({brl(equilibrio)}) e o produto fica sem margem.
                  </p>
                ) : (
                  <>
                    <ResultadoEtapa
                      label={`Lucro por unidade (${pct(m)})`}
                      valor={brl(lucro)}
                      negativo={lucro !== null && lucro < -0.005}
                    />
                    <p className="text-xs text-gray-500">
                      {brl(venda)} de venda − {brl(sobreVenda(somaTaxas(taxas)))} de despesas − {brl(liq)} de custo
                      líquido
                    </p>
                  </>
                )
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo label="Valor de venda">
                  <CampoNumero
                    value={venda}
                    onChange={setVenda}
                    prefixo="R$"
                    placeholder={equilibrio === null ? "" : equilibrio.toFixed(2).replace(".", ",")}
                  />
                </Campo>
                <Campo label="Margem">
                  <CampoNumero
                    value={m === null ? null : m * 100}
                    onChange={mudarMargem}
                    sufixo="%"
                    className={m === null ? "" : m < 0 ? "text-red-600" : "text-green-700"}
                  />
                </Campo>
              </div>
            </Etapa>

            <p className="text-xs text-gray-400">
              Vai para o VHSYS: custo {brl(liq)} · venda {brl(vendaEfetiva)} · ICMS atual da conta{" "}
              {(icmsAtual * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={excluir}
            disabled={ocupado}
            className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {estado === "excluindo" ? "Excluindo…" : "Excluir produto"}
          </button>
          <button type="button" onClick={onFechar} disabled={ocupado} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={() => salvar(false)} disabled={ocupado} className="btn-secondary">
            {estado === "salvando" ? "Salvando…" : "Salvar"}
          </button>
          {linha.idVhsys !== null && linha.vhsys !== null && (
            <button type="button" onClick={() => salvar(true)} disabled={ocupado} className="btn-primary">
              {estado === "enviando" ? "Enviando ao VHSYS…" : "Salvar e enviar ao VHSYS"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
