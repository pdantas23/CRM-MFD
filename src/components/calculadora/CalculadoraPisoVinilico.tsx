"use client";
// Piso vinílico numa única visão: entradas (área, marca, piso, base e
// nivelamento) à esquerda; resultado (quantidade de piso + insumos) à direita.
// A área da obra alimenta o piso e os insumos ao mesmo tempo.

import { useState } from "react";
import { InputValor } from "@/components/ui/InputValor";
import {
  MARCAS,
  FORMATO_LABEL,
  calcularPiso,
  calcularInsumos,
  BASES_PRIMER,
  NIVELAMENTOS,
  type FormatoPiso,
  type MarcaId,
  type PisoVinilico,
} from "@/lib/calculadora/pisoVinilico";
import { imprimirOrcamentoPisoPdf } from "@/lib/calculadora/orcamentoPdf";

function fmt(n: number, casas = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

export function CalculadoraPisoVinilico() {
  const [area, setArea] = useState(0);
  const [marcaId, setMarcaId] = useState<MarcaId>("rufino");
  const [pisoId, setPisoId] = useState("");
  const [baseId, setBaseId] = useState(BASES_PRIMER[0].id);
  const [nivelId, setNivelId] = useState(NIVELAMENTOS[0].id);

  const marca = MARCAS.find((m) => m.id === marcaId) ?? MARCAS[0];
  const piso = marca.pisos.find((p) => p.id === pisoId) ?? marca.pisos[0];

  const resultado = piso ? calcularPiso(piso, area) : null;
  const insumos = calcularInsumos(area, baseId, nivelId);

  function baixarPdf() {
    if (!piso || !resultado || area <= 0) return;
    imprimirOrcamentoPisoPdf({
      marca: marca.nome,
      piso: `${piso.colecao} ${piso.instalacao}`,
      formato: FORMATO_LABEL[piso.formato].replace(" (rolo)", ""),
      dimensao: piso.dimensao,
      espessura: piso.espessura,
      m2Caixa: piso.m2Caixa,
      uso: piso.uso,
      area,
      unidade: resultado.unidade,
      real: resultado.real,
      recomendada: resultado.recomendada,
      areaCoberta: resultado.areaCoberta,
      insumos,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Entradas */}
      <div className="card space-y-4 p-6">
        <Campo label="Área da obra (m²)">
          <InputValor value={area} onChange={setArea} className="w-full" cinzaSeZero />
        </Campo>

        <Campo label="Marca">
          <select
            value={marcaId}
            onChange={(e) => {
              setMarcaId(e.target.value as MarcaId);
              setPisoId(""); // volta ao primeiro piso da nova marca
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

        <Campo label="Piso">
          <select
            value={piso?.id ?? ""}
            onChange={(e) => setPisoId(e.target.value)}
            className="input-base w-full"
          >
            {(["regua", "placa", "manta"] as FormatoPiso[]).map((f) => {
              const grupo = marca.pisos.filter((p) => p.formato === f);
              if (!grupo.length) return null;
              return (
                <optgroup key={f} label={FORMATO_LABEL[f]}>
                  {grupo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.colecao} {p.instalacao} — {p.espessura} · {fmt(p.m2Caixa)} m²/
                      {p.formato === "manta" ? "rolo" : "cx"} · {p.uso}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </Campo>

        {piso && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo</dt>
              <dd className="font-medium text-gray-800">{FORMATO_LABEL[piso.formato].replace(" (rolo)", "")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Espessura</dt>
              <dd className="font-medium text-gray-800">{piso.espessura}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{piso.formato === "manta" ? "m²/rolo" : "m²/caixa"}</dt>
              <dd className="font-medium text-gray-800">{fmt(piso.m2Caixa)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Uso</dt>
              <dd className="font-medium text-gray-800">{piso.uso}</dd>
            </div>
            <div className="col-span-2 flex justify-between">
              <dt className="text-gray-500">Dimensão</dt>
              <dd className="font-medium text-gray-800">{piso.dimensao}</dd>
            </div>
            {piso.obs && <div className="col-span-2 text-xs text-gray-400">{piso.obs}</div>}
          </dl>
        )}

        {/* Insumos — mesmas entradas de área */}
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700">Insumos</p>
          <Campo label="Base do contrapiso (primer)">
            <select value={baseId} onChange={(e) => setBaseId(e.target.value)} className="input-base w-full">
              {BASES_PRIMER.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} · {b.rendimento} m²/gl
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Nivelamento (massa autonivelante)">
            <select value={nivelId} onChange={(e) => setNivelId(e.target.value)} className="input-base w-full">
              {NIVELAMENTOS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                  {n.rendimento > 0 ? ` · ${n.rendimento} m²/sc` : ""}
                </option>
              ))}
            </select>
          </Campo>

          <p className="text-xs text-gray-400">
            Rendimentos pelo pior caso (não faltar). Silicone e massa PVA ficam por conta do rodapé/parede.
          </p>
        </div>
      </div>

      {/* Resultado: piso + insumos juntos */}
      <div className="card p-6">
        {area > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={baixarPdf}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
              Baixar PDF
            </button>
          </div>
        )}
        <div className="space-y-5">
          <ResultadoPisoView area={area} piso={piso} />
          <div className="border-t border-gray-100 pt-5">
            <ResultadoInsumosView area={area} baseId={baseId} nivelId={nivelId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultadoPisoView({ area, piso }: { area: number; piso?: PisoVinilico }) {
  if (!piso) return <p className="text-sm text-gray-400">Nenhum piso disponível para esta marca.</p>;
  const r = calcularPiso(piso, area);
  return (
    <>
      <p className="text-sm font-medium text-gray-500">
        Quantidade de {piso.formato === "manta" ? "rolos" : "caixas"}
      </p>
      {area > 0 ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary-700">{r.recomendada}</span>
            <span className="text-sm text-gray-500">{r.unidade} · recomendado</span>
          </div>
          <dl className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Quantidade real (calculada)</dt>
              <dd className="font-medium text-gray-800">{fmt(r.real)} {r.unidade}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Quantidade recomendada (+10%)</dt>
              <dd className="font-semibold text-gray-900">{r.recomendada} {r.unidade}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Área coberta</dt>
              <dd className="font-medium text-gray-800">{fmt(r.areaCoberta)} m²</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-400">Informe a área da obra para ver a quantidade.</p>
      )}
    </>
  );
}

function ResultadoInsumosView({ area, baseId, nivelId }: { area: number; baseId: string; nivelId: string }) {
  const itens = calcularInsumos(area, baseId, nivelId);
  return (
    <>
      <p className="text-sm font-medium text-gray-500">Insumos estimados</p>
      {area > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100">
          {itens.map((i) => (
            <li key={i.nome} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                <span className="text-gray-700">{i.nome}</span>
                <span className="block text-xs text-gray-400">{i.detalhe}</span>
              </span>
              <span className="whitespace-nowrap font-semibold text-gray-900">
                {i.quantidade} <span className="font-normal text-gray-400">{i.unidade}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-400">Informe a área da obra para ver os insumos.</p>
      )}
    </>
  );
}
