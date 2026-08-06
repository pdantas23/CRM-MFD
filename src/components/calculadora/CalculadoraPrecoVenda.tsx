"use client";
// Calculadora de preço de venda × margem de lucro (bidirecional).
// Fórmula: PV = [(P × (1 + ICMS) × (1 + COM)) + F] × (1 + L)
//  - P    = preço de custo do produto
//  - ICMS = diferença: max(0, atual − crédito de ICMS da origem)
//  - COM  = comissões (% total)
//  - F    = frete
//  - L    = lucro (%)
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

export function CalculadoraPrecoVenda() {
  const [precoCusto, setPrecoCusto] = useState(0);
  const [icmsOrigem, setIcmsOrigem] = useState(0);
  const [icmsAtual, setIcmsAtual] = useState(0);
  const [frete, setFrete] = useState(0);
  const [comissao, setComissao] = useState(0);
  const [lucro, setLucro] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  // Qual campo o usuário está definindo; o outro é calculado.
  const [modo, setModo] = useState<"lucro" | "pv">("lucro");

  // ICMS da fórmula = diferencial (atual − crédito da origem), nunca negativo.
  const icmsDiffPct = Math.max(0, icmsAtual - icmsOrigem);
  const custoTributado = precoCusto * (1 + icmsDiffPct / 100) * (1 + comissao / 100);
  const baseComFrete = custoTributado + frete;

  // Direto (modo=lucro): PV = base × (1 + L). Inverso (modo=pv): L = PV/base − 1.
  const lucroEfetivo =
    modo === "lucro" ? lucro : baseComFrete > 0 ? (precoVenda / baseComFrete - 1) * 100 : 0;
  const pvEfetivo = modo === "lucro" ? baseComFrete * (1 + lucro / 100) : precoVenda;
  const lucroReais = pvEfetivo - baseComFrete;

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
          <div className="flex justify-between">
            <dt className="text-gray-500">ICMS aplicado (atual − crédito)</dt>
            <dd className="font-medium text-gray-800">{pct(icmsDiffPct)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Custo com ICMS + comissões</dt>
            <dd className="font-medium text-gray-800">{formatBRL(custoTributado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">+ Frete</dt>
            <dd className="font-medium text-gray-800">{formatBRL(frete)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Lucro ({pct(lucroEfetivo)})</dt>
            <dd className="font-medium text-green-700">{formatBRL(lucroReais)}</dd>
          </div>
        </dl>

        {icmsOrigem > icmsAtual && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            O crédito de ICMS é maior que o ICMS atual — o ICMS aplicado foi tratado como 0%.
          </p>
        )}
      </div>
    </div>
  );
}
