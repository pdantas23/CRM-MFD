"use client";
// Calculadora de quantidade de produtos. Primeira vista = cards por tipo; ao
// escolher um, abre a calculadora. Drywall (paredes/forros) entra por área (m²)
// e usa a planilha 222/Trevo; o card Piso Vinílico abre sua própria interface
// (sub-abas Piso e Insumos).

import { Fragment, useState } from "react";
import { InputValor } from "@/components/ui/InputValor";
import { TIPOS, calcularMateriais, type TipoCalculo } from "@/lib/calculadora/materiais";
import { imprimirOrcamentoPdf } from "@/lib/calculadora/orcamentoPdf";
import { CalculadoraPisoVinilico } from "./CalculadoraPisoVinilico";
import { CalculadoraForroRemovivel } from "./CalculadoraForroRemovivel";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

// Placeholder do card enquanto não há foto (ícone por modo de entrada).
function IconeTipo({ entrada }: { entrada: TipoCalculo["entrada"] }) {
  return (
    <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {entrada === "parede" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 9h16M4 14h16M9 4v5m6 0v5M9 14v6m6-6v6" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM4 9h16M4 13h16M4 17h16M9 5v14m6-14v14" />
      )}
    </svg>
  );
}

// Card clicável da grade (tipo de drywall, forro removível ou piso vinílico).
function CardCalc({
  img,
  cover,
  iconeEntrada,
  nome,
  descricao,
  onClick,
}: {
  img?: string;
  cover?: boolean;
  iconeEntrada?: TipoCalculo["entrada"];
  nome: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card group overflow-hidden text-left transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300"
    >
      <div className="flex h-40 items-center justify-center bg-gray-50">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={nome}
            className={cover ? "h-full w-full object-cover" : "h-full w-full object-contain p-3"}
          />
        ) : iconeEntrada ? (
          <IconeTipo entrada={iconeEntrada} />
        ) : null}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 group-hover:text-primary-600">{nome}</p>
        <p className="mt-0.5 text-sm text-gray-500">{descricao}</p>
      </div>
    </button>
  );
}

export function CalculadoraQuantidade() {
  const [sel, setSel] = useState<TipoCalculo | "piso" | "removivel" | null>(null);

  // ── Primeira vista: cards por tipo ──────────────────────────────────────────
  if (!sel) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {TIPOS.map((t) => (
          <Fragment key={t.id}>
            {/* Forro Removível entra antes do Forro Aramado */}
            {t.id === "forro-aramado" && (
              <CardCalc
                img="/calculadora/forro-removivel.png"
                nome="Forro Removível"
                descricao="Mineral, isopor, gesso ou Ecophon"
                onClick={() => setSel("removivel")}
              />
            )}
            <CardCalc
              img={t.img}
              iconeEntrada={t.entrada}
              nome={t.nome}
              descricao={t.descricao}
              onClick={() => setSel(t)}
            />
          </Fragment>
        ))}

        <CardCalc
          img="/calculadora/piso-vinilico.jpg"
          cover
          nome="Piso Vinílico"
          descricao="Tarkett e Rufino · piso e insumos"
          onClick={() => setSel("piso")}
        />
      </div>
    );
  }

  // ── Detalhe do card escolhido ───────────────────────────────────────────────
  const titulo = sel === "piso" ? "Piso Vinílico" : sel === "removivel" ? "Forro Removível" : sel.nome;
  const subtitulo =
    sel === "piso"
      ? "Quantidade de piso e insumos"
      : sel === "removivel"
        ? "Forro modular removível sobre perfis T"
        : sel.descricao;
  return (
    <div>
      <button
        type="button"
        onClick={() => setSel(null)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </button>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
        <p className="text-sm text-gray-500">{subtitulo}</p>
      </div>

      {sel === "piso" ? (
        <CalculadoraPisoVinilico />
      ) : sel === "removivel" ? (
        <CalculadoraForroRemovivel />
      ) : (
        <FormularioTipo tipo={sel} />
      )}
    </div>
  );
}

function FormularioTipo({ tipo }: { tipo: TipoCalculo }) {
  const isParede = tipo.entrada === "parede";
  const [area, setArea] = useState(0); // área em m² (parede ou forro)
  const [opcaoPlaca, setOpcaoPlaca] = useState(tipo.opcoesPlaca?.[0]?.id ?? "");

  const materiais = calcularMateriais(tipo, area, opcaoPlaca);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Entradas */}
      <div className="card space-y-4 p-6">
        <Campo label={isParede ? "Área da parede (m²)" : "Área do forro (m²)"}>
          <InputValor value={area} onChange={setArea} className="w-full" cinzaSeZero />
        </Campo>

        {tipo.opcoesPlaca && (
          <Campo label="Composição das placas">
            <select
              value={opcaoPlaca}
              onChange={(e) => setOpcaoPlaca(e.target.value)}
              className="input-base w-full"
            >
              {tipo.opcoesPlaca.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Campo>
        )}

        {tipo.aviso && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">{tipo.aviso}</p>
        )}
      </div>

      {/* Resultado */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-gray-500">Materiais estimados</p>
          {area > 0 && (
            <button
              type="button"
              onClick={() =>
                imprimirOrcamentoPdf({
                  titulo: tipo.nome,
                  composicao: tipo.opcoesPlaca?.find((o) => o.id === opcaoPlaca)?.label,
                  area,
                  itens: materiais,
                })
              }
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
              </svg>
              Baixar PDF
            </button>
          )}
        </div>
        {area > 0 ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {materiais.map((m) => (
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
