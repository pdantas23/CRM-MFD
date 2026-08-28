"use client";
// Calculadora de preço de venda × margem de lucro (bidirecional).
// Fórmula: PV = { [ (P×(1+ICMS)) + F ] ÷ (1−CO) × (1+L) } ÷ (1 − COM − IS)
//  - P    = preço de custo do produto
//  - ICMS = diferença max(0, atual − crédito de origem); markup sobre o custo
//  - F    = frete (aditivo)
//  - CO   = custos operacionais (% "por dentro" sobre a base — leva em conta
//           tudo, MENOS o lucro)
//  - L    = lucro (% sobre a base já com os custos operacionais — leva tudo)
//  - COM  = comissões (% "por dentro" sobre o VALOR FINAL — conta com o frete)
//  - IS   = imposto de saída (% "por dentro" sobre o VALOR FINAL, ao final)
// A soma de custo + ICMS + frete + custos op + lucro + comissão + imposto = PV.
// Digitando o LUCRO, calcula o preço de venda; digitando o PREÇO DE VENDA,
// calcula o lucro. Campos nulos (exceto o preço de custo) são neutros no cálculo.
// Todos os campos usam a máscara "centavos primeiro" (dígitos entram pela direita).

import { useState } from "react";
import { InputValor } from "@/components/ui/InputValor";
import { formatBRL } from "@/lib/format";

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

// Linha "descrição … valor" do painel da direita.
function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={destaque ? "font-medium text-green-700" : "font-medium text-gray-800"}>{valor}</dd>
    </div>
  );
}

export function CalculadoraPrecoVenda() {
  const [precoCusto, setPrecoCusto] = useState(0);
  const [icmsOrigem, setIcmsOrigem] = useState(0);
  const [icmsAtual, setIcmsAtual] = useState(0);
  const [frete, setFrete] = useState(0);
  const [comissao, setComissao] = useState(0);
  const [custosOp, setCustosOp] = useState(0);
  const [impostoSaida, setImpostoSaida] = useState(0);
  const [lucro, setLucro] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  // Qual campo o usuário está definindo; o outro é calculado.
  const [modo, setModo] = useState<"lucro" | "pv">("lucro");

  // ICMS da fórmula = diferencial (atual − crédito da origem), nunca negativo.
  const icmsDiffPct = Math.max(0, icmsAtual - icmsOrigem);
  const custoICMS = precoCusto * (1 + icmsDiffPct / 100);
  const base = custoICMS + frete;

  // Custos operacionais: "por dentro" SOBRE A BASE, antes do lucro.
  const divCO = 1 - custosOp / 100;
  const divCOValido = divCO > 0;
  const subtotal1 = divCOValido ? base / divCO : 0;

  // Comissão + imposto de saída: "por dentro" SOBRE O VALOR FINAL (o preço de venda).
  const divFinal = 1 - (comissao + impostoSaida) / 100;
  const divFinalValido = divFinal > 0;
  const divisoresValidos = divCOValido && divFinalValido;

  // Direto (modo=lucro): subtotal2 = subtotal1 × (1+L); PV = subtotal2 ÷ divFinal.
  // Inverso (modo=pv): subtotal2 = PV × divFinal → L = subtotal2/subtotal1 − 1.
  const lucroEfetivo =
    modo === "lucro"
      ? lucro
      : subtotal1 > 0 && divisoresValidos
        ? ((precoVenda * divFinal) / subtotal1 - 1) * 100
        : 0;
  const subtotal2 = subtotal1 * (1 + lucroEfetivo / 100);
  const pvEfetivo = modo === "lucro" ? (divisoresValidos ? subtotal2 / divFinal : 0) : precoVenda;

  // Valores em R$ de cada componente (somam o preço de venda).
  const icmsReais = custoICMS - precoCusto;
  const custosOpReais = divCOValido ? subtotal1 - base : 0;
  const lucroReais = subtotal2 - subtotal1;
  const comissaoReais = pvEfetivo * (comissao / 100);
  const impostoReais = pvEfetivo * (impostoSaida / 100);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Entradas */}
      <div className="card space-y-4 p-6">
        <Campo label="Preço de custo do produto">
          <InputValor value={precoCusto} onChange={setPrecoCusto} className="w-full" cinzaSeZero />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Crédito de ICMS (%)">
            <InputValor value={icmsOrigem} onChange={setIcmsOrigem} className="w-full" cinzaSeZero />
          </Campo>
          <Campo label="ICMS atual (%)">
            <InputValor value={icmsAtual} onChange={setIcmsAtual} className="w-full" cinzaSeZero />
          </Campo>
        </div>

        <Campo label="Frete">
          <InputValor value={frete} onChange={setFrete} className="w-full" cinzaSeZero />
        </Campo>

        <Campo label="Comissões (%)">
          <InputValor value={comissao} onChange={setComissao} className="w-full" cinzaSeZero />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Custos operacionais (%)">
            <InputValor value={custosOp} onChange={setCustosOp} className="w-full" cinzaSeZero />
          </Campo>
          <Campo label="Imposto de saída (%)">
            <InputValor value={impostoSaida} onChange={setImpostoSaida} className="w-full" cinzaSeZero />
          </Campo>
        </div>

        <Campo label="Lucro (%)">
          <InputValor
            value={modo === "lucro" ? lucro : Number(lucroEfetivo.toFixed(2))}
            onChange={(n) => {
              setLucro(n);
              setModo("lucro");
            }}
            className="w-full"
            cinzaSeZero
          />
        </Campo>
      </div>

      {/* Resultado — preço de venda editável (define o lucro ao ser digitado) */}
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
          <Linha label="Custo base" valor={formatBRL(precoCusto)} />
          <Linha label={`ICMS (${pct(icmsDiffPct)})`} valor={formatBRL(icmsReais)} />
          <Linha label="Frete" valor={formatBRL(frete)} />
          <Linha label={`Custos operacionais (${pct(custosOp)})`} valor={formatBRL(custosOpReais)} />
          <Linha label={`Lucro (${pct(lucroEfetivo)})`} valor={formatBRL(lucroReais)} destaque />
          <Linha label={`Comissões (${pct(comissao)})`} valor={formatBRL(comissaoReais)} />
          <Linha label={`Imposto de saída (${pct(impostoSaida)})`} valor={formatBRL(impostoReais)} />
        </dl>

        {icmsOrigem > icmsAtual && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            O crédito de ICMS é maior que o ICMS atual — o ICMS aplicado foi tratado como 0%.
          </p>
        )}
        {!divisoresValidos && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {!divCOValido ? "Custos operacionais ≥ 100%" : "Comissões + imposto de saída ≥ 100%"} —
            impossível formar o preço. Reduza o percentual.
          </p>
        )}
      </div>
    </div>
  );
}
