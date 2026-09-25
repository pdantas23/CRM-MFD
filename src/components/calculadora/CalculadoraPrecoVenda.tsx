"use client";
// Calculadora de preço de venda — método do divisor de markup.
//
//   Preço de Custo = preço do produto + frete + DIFAL
//     DIFAL = (ICMS atual − crédito de ICMS de origem) × preço do produto
//             (ICMS atual travado em 22,5% — Piauí; crédito varia com a origem)
//   Preço de Venda = Preço de Custo ÷ (1 − Σ%)
//     Σ% = custos operacionais + comissão + imposto de saída + margem
//
// Todos os % (inclusive a MARGEM) são "por dentro" (fatia do preço de venda), então
// custo + DIFAL + cada % em R$ = preço de venda. Bidirecional: digitar a MARGEM
// calcula o preço; digitar o PREÇO calcula a margem. Máscara "centavos primeiro".

import { useState } from "react";
import { InputValor } from "@/components/ui/InputValor";
import { formatBRL } from "@/lib/format";
import { MARCAS, FORMATO_LABEL, type MarcaId, type PisoVinilico } from "@/lib/calculadora/pisoVinilico";

// Agrupa os produtos de uma marca por categoria (Tarkett) ou formato (Rufino).
// Selecionar um produto preenche Frete e Crédito de ICMS quando a marca tem
// esses dados de planilha; o preço sugerido só é exibido como referência.
function gruposDaMarca(pisos: PisoVinilico[]): [string, PisoVinilico[]][] {
  const mapa = new Map<string, PisoVinilico[]>();
  for (const p of pisos) {
    const g = p.categoria ?? FORMATO_LABEL[p.formato];
    const arr = mapa.get(g);
    if (arr) arr.push(p);
    else mapa.set(g, [p]);
  }
  return Array.from(mapa.entries());
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function pct(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function Linha({ label, valor, destaque, forte }: { label: string; valor: string; destaque?: boolean; forte?: boolean }) {
  return (
    <div className={`flex justify-between ${forte ? "border-t border-gray-100 pt-2" : ""}`}>
      <dt className={forte ? "font-medium text-gray-700" : "text-gray-500"}>{label}</dt>
      <dd className={destaque ? "font-medium text-green-700" : forte ? "font-semibold text-gray-900" : "font-medium text-gray-800"}>
        {valor}
      </dd>
    </div>
  );
}

export function CalculadoraPrecoVenda() {
  const [precoCusto, setPrecoCusto] = useState(0); // preço do produto
  const [frete, setFrete] = useState(0);
  const [creditoIcms, setCreditoIcms] = useState(0); // crédito de ICMS de origem (%)
  const [icmsAtual, setIcmsAtual] = useState(22.5); // ICMS do estado (PI), travado em 22,5%
  const [custosOp, setCustosOp] = useState(7); // padrão 7% (editável)
  const [comissao, setComissao] = useState(0);
  const [impostoSaida, setImpostoSaida] = useState(11.5); // padrão 11,5% (editável)
  const [margem, setMargem] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  // Qual campo o usuário está definindo; o outro é calculado.
  const [modo, setModo] = useState<"margem" | "pv">("margem");
  // Marca + produto escolhidos (opcional): preenchem frete e crédito de ICMS.
  const [marcaPrecoId, setMarcaPrecoId] = useState<MarcaId>("tarkett");
  const [produtoId, setProdutoId] = useState("");
  const marcaPreco = MARCAS.find((m) => m.id === marcaPrecoId) ?? MARCAS[0];
  const produto = marcaPreco.pisos.find((p) => p.id === produtoId);

  function selecionarProduto(id: string) {
    setProdutoId(id);
    const p = marcaPreco.pisos.find((x) => x.id === id);
    if (!p) return;
    if (p.fretePorM2 != null) setFrete(p.fretePorM2);
    if (p.icmsIncluso != null) setCreditoIcms(p.icmsIncluso);
  }

  // DIFAL = ICMS atual − crédito (nunca negativo), sobre o preço do produto.
  const difalPct = Math.max(0, icmsAtual - creditoIcms);
  const difalReais = precoCusto * (difalPct / 100);
  const custo = precoCusto + frete + difalReais;

  // Σ% do divisor. A margem entra junto com os custos de venda.
  const outrosPct = custosOp + comissao + impostoSaida;
  const margemEfetiva =
    modo === "margem"
      ? margem
      : precoVenda > 0 && custo > 0
        ? (1 - custo / precoVenda) * 100 - outrosPct
        : 0;
  const somaPct = outrosPct + margemEfetiva;
  const divisor = 1 - somaPct / 100;
  const divisorValido = divisor > 0;

  const pvEfetivo = modo === "margem" ? (divisorValido ? custo / divisor : 0) : precoVenda;

  const custosOpReais = pvEfetivo * (custosOp / 100);
  const comissaoReais = pvEfetivo * (comissao / 100);
  const impostoReais = pvEfetivo * (impostoSaida / 100);
  const margemReais = pvEfetivo * (margemEfetiva / 100);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Entradas */}
      <div className="card space-y-4 p-6">
        <Campo label="Marca">
          <select
            value={marcaPrecoId}
            onChange={(e) => {
              setMarcaPrecoId(e.target.value as MarcaId);
              setProdutoId(""); // volta ao manual ao trocar de marca
            }}
            className="input-base w-full"
          >
            {MARCAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Produto">
          <select
            value={produtoId}
            onChange={(e) => selecionarProduto(e.target.value)}
            className="input-base w-full"
          >
            <option value="">Manual</option>
            {gruposDaMarca(marcaPreco.pisos).map(([grupo, itens]) => (
              <optgroup key={grupo} label={grupo}>
                {itens.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.colecao} · {p.dimensao}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Campo>

        <Campo label="Preço de custo do produto">
          <InputValor value={precoCusto} onChange={setPrecoCusto} className="w-full" cinzaSeZero />
        </Campo>

        <Campo label="Frete">
          <InputValor value={frete} onChange={setFrete} className="w-full" cinzaSeZero />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Crédito de ICMS (%)">
            <InputValor value={creditoIcms} onChange={setCreditoIcms} className="w-full" cinzaSeZero />
          </Campo>
          <Campo label="ICMS atual (%)">
            <InputValor value={icmsAtual} onChange={setIcmsAtual} className="w-full" cinzaSeZero />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Custos operacionais (%)">
            <InputValor value={custosOp} onChange={setCustosOp} className="w-full" cinzaSeZero />
          </Campo>
          <Campo label="Comissões (%)">
            <InputValor value={comissao} onChange={setComissao} className="w-full" cinzaSeZero />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Imposto de saída (%)">
            <InputValor value={impostoSaida} onChange={setImpostoSaida} className="w-full" cinzaSeZero />
          </Campo>
          <Campo label="Margem (%)">
            <InputValor
              value={modo === "margem" ? margem : Number(margemEfetiva.toFixed(2))}
              onChange={(n) => {
                setMargem(n);
                setModo("margem");
              }}
              className="w-full"
              cinzaSeZero
            />
          </Campo>
        </div>
      </div>

      {/* Resultado — preço de venda editável (define a margem ao ser digitado) */}
      <div className="card p-6">
        <p className="text-sm font-medium text-gray-500">Preço de venda</p>
        <div className="mt-1 flex items-baseline gap-1.5 text-3xl font-bold text-primary-700">
          <span>R$</span>
          <InputValor
            value={modo === "pv" ? precoVenda : Number(pvEfetivo.toFixed(2))}
            onChange={(n) => {
              setPrecoVenda(n);
              setModo("pv");
            }}
            baseClassName=""
            className="w-full min-w-0 bg-transparent p-0 text-3xl font-bold text-primary-700 focus:outline-none"
          />
        </div>

        <dl className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <Linha label="Produto" valor={formatBRL(precoCusto)} />
          <Linha label="Frete" valor={formatBRL(frete)} />
          <Linha label={`DIFAL (${pct(difalPct)})`} valor={formatBRL(difalReais)} />
          <Linha label="Preço de custo" valor={formatBRL(custo)} forte />
          <Linha label={`Custos operacionais (${pct(custosOp)})`} valor={formatBRL(custosOpReais)} />
          <Linha label={`Comissões (${pct(comissao)})`} valor={formatBRL(comissaoReais)} />
          <Linha label={`Imposto de saída (${pct(impostoSaida)})`} valor={formatBRL(impostoReais)} />
          <Linha label={`Margem (${pct(margemEfetiva)})`} valor={formatBRL(margemReais)} destaque />
        </dl>

        {produto?.precoSugerido != null && (
          <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">
              Preço sugerido (planilha)
              <span className="ml-1 text-xs text-gray-400">{produto.colecao}</span>
            </span>
            <span className="font-medium text-gray-800">{formatBRL(produto.precoSugerido)}/m²</span>
          </div>
        )}

        {creditoIcms > icmsAtual && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            O crédito de ICMS é maior que o ICMS atual — o DIFAL foi tratado como 0%.
          </p>
        )}
        {!divisorValido && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            Custos operacionais + comissão + imposto de saída + margem somam {pct(somaPct)} (≥ 100%)
            — impossível formar o preço. Reduza os percentuais.
          </p>
        )}
      </div>
    </div>
  );
}
