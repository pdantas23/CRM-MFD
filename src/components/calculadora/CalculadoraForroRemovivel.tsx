"use client";
// Forro modular removível: área (m²) + material da placa + tamanho → materiais.
// O material (EPS/Boreal/Mineral/Vinil) só muda o nome; o tamanho define a placa
// e se há perfil terciário (só na placa quadrada 0,625 × 0,625).

import { useState } from "react";
import { InputValor } from "@/components/ui/InputValor";
import { VARIANTES, TAMANHOS, calcularForroRemovivel } from "@/lib/calculadora/forroRemovivel";
import { imprimirOrcamentoPdf } from "@/lib/calculadora/orcamentoPdf";
import { BotaoGerarOrcamento } from "./BotaoGerarOrcamento";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

export function CalculadoraForroRemovivel() {
  const [area, setArea] = useState(0);
  const [materialId, setMaterialId] = useState(VARIANTES[0].id);
  const [tamanhoId, setTamanhoId] = useState(TAMANHOS[0].id);

  const material = VARIANTES.find((v) => v.id === materialId) ?? VARIANTES[0];
  const tamanho = TAMANHOS.find((t) => t.id === tamanhoId) ?? TAMANHOS[0];
  const itens = calcularForroRemovivel(area, materialId, tamanhoId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Entradas */}
      <div className="card space-y-4 p-6">
        <Campo label="Área do forro (m²)">
          <InputValor value={area} onChange={setArea} className="w-full" cinzaSeZero />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Material da placa">
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="input-base w-full"
            >
              {VARIANTES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Tamanho da placa">
            <select
              value={tamanhoId}
              onChange={(e) => setTamanhoId(e.target.value)}
              className="input-base w-full"
            >
              {TAMANHOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
          Grelha de perfis T. O perfil terciário (0,625 m) entra só na placa quadrada
          0,625 × 0,625 m. Reguladores, arame e parafuso/bucha derivam dos perfis.
        </p>
      </div>

      {/* Resultado */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-500">Materiais estimados</p>
          {area > 0 && (
            <div className="flex gap-2">
              <BotaoGerarOrcamento
                itens={itens.map((m) => ({
                  descricao: m.nome,
                  quantidade: m.quantidade,
                  unidade: m.unidade,
                }))}
              />
              <button
                type="button"
                onClick={() =>
                  imprimirOrcamentoPdf({
                    titulo: "Forro Removível",
                    composicao: `${material.label} · ${tamanho.label}`,
                    area,
                    itens,
                  })
                }
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                PDF
              </button>
            </div>
          )}
        </div>
        {area > 0 ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {itens.map((m) => (
              <li key={m.nome} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-gray-700">{m.nome}</span>
                <span className="whitespace-nowrap font-semibold text-gray-900">
                  {m.quantidade} <span className="font-normal text-gray-400">{m.unidade}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-400">Informe a área para ver os materiais.</p>
        )}
      </div>
    </div>
  );
}
