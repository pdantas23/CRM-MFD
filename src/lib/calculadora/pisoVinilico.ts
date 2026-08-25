// Cálculo de piso vinílico (Calculadora → card Piso Vinílico).
// Base: planilha "MEDIDAS DE PRODUTOS PARA PISO VINILICO" (Rufino + Tarkett).
//
// PISO — quantidade real = área ÷ m²/caixa (fracionário); recomendada =
// roundup(real × 1,1) → número fechado de caixas com +10% de folga (fórmula da
// planilha). Mantas Tarkett são vendidas em rolo (m²/rolo no lugar de m²/caixa).
//
// INSUMOS — por área do piso, pelo PIOR caso do rendimento (menor → não faltar):
// primer (por tipo de base), cola e massa autonivelante (por espessura).

import { roundup } from "./materiais";

export type MarcaId = "rufino" | "tarkett";
export type FormatoPiso = "regua" | "placa" | "manta";

export interface PisoVinilico {
  id: string;
  colecao: string;
  instalacao: string; // "Colado" | "Clicado"
  formato: FormatoPiso;
  dimensao: string;
  espessura: string;
  /** m²/caixa (régua/placa) ou m²/rolo (manta). */
  m2Caixa: number;
  pecasCaixa?: number;
  /** Uso: "Residencial", "Res. e Comercial" ou a classificação Tarkett. */
  uso: string;
  obs?: string;
}

export interface MarcaPiso {
  id: MarcaId;
  nome: string;
  pisos: PisoVinilico[];
}

export const FORMATO_LABEL: Record<FormatoPiso, string> = {
  regua: "Réguas",
  placa: "Placas",
  manta: "Mantas (rolo)",
};

export const MARCAS: MarcaPiso[] = [
  {
    id: "rufino",
    nome: "Rufino",
    pisos: [
      // Réguas
      { id: "ruf-sofisticato-col-reg", colecao: "Sofisticato", instalacao: "Colado", formato: "regua", dimensao: "17,78 × 121,92 cm", espessura: "2 mm", m2Caixa: 3.9, pecasCaixa: 18, uso: "Residencial", obs: "Garantia 10 anos Res." },
      { id: "ruf-sofisticato-cli-reg", colecao: "Sofisticato", instalacao: "Clicado", formato: "regua", dimensao: "22,90 × 122,00 cm", espessura: "4,5 mm", m2Caixa: 2.79, pecasCaixa: 10, uso: "Residencial", obs: "3,5 mm + 1 mm manta IXPE" },
      { id: "ruf-nobile-col-reg", colecao: "Nobile", instalacao: "Colado", formato: "regua", dimensao: "17,78 × 121,92 cm", espessura: "2 mm", m2Caixa: 3.9, pecasCaixa: 18, uso: "Res. e Comercial", obs: "Garantia 10 Res / 5 Com" },
      { id: "ruf-nobile-cli-reg", colecao: "Nobile", instalacao: "Clicado", formato: "regua", dimensao: "22,9 × 122,22 cm", espessura: "5 mm", m2Caixa: 2.23, pecasCaixa: 8, uso: "Res. e Comercial", obs: "4 mm + 1 mm manta IXPE" },
      { id: "ruf-bravo-col-reg", colecao: "Bravo", instalacao: "Colado", formato: "regua", dimensao: "17,78 × 121,92 cm", espessura: "3 mm", m2Caixa: 2.6, pecasCaixa: 12, uso: "Res. e Comercial", obs: "Garantia 10 Res / Com" },
      // Placas
      { id: "ruf-sofisticato-col-pla", colecao: "Sofisticato", instalacao: "Colado", formato: "placa", dimensao: "45,72 × 45,72 cm", espessura: "2 mm", m2Caixa: 5.02, pecasCaixa: 24, uso: "Residencial", obs: "Garantia 10 anos Res." },
      { id: "ruf-nobile-col-pla", colecao: "Nobile", instalacao: "Colado", formato: "placa", dimensao: "91,44 × 91,44 cm", espessura: "2 mm", m2Caixa: 10.03, pecasCaixa: 12, uso: "Res. e Comercial", obs: "Garantia 10 Res / 5 Com" },
      { id: "ruf-bravo-col-pla", colecao: "Bravo", instalacao: "Colado", formato: "placa", dimensao: "91,44 × 91,44 cm", espessura: "3 mm", m2Caixa: 6.69, pecasCaixa: 8, uso: "Res. e Comercial", obs: "Garantia 10 Res / 5 Com" },
    ],
  },
  {
    id: "tarkett",
    nome: "Tarkett",
    // Caixas: fichas técnicas oficiais Tarkett (Injoy 07.23, Ambienta, Piemonte/
    // Solare JAN25, Essence, Eclipse) + varejo onde não havia PDF. Injoy = 4,09
    // (embalagem oficial atual, 16 réguas). Mantas: m²/rolo = largura × compr.
    pisos: [
      // Réguas (caixa)
      { id: "tar-injoy-reg", colecao: "Injoy", instalacao: "Colado", formato: "regua", dimensao: "208 × 1230 mm", espessura: "2 mm", m2Caixa: 4.09, pecasCaixa: 16, uso: "Res 23", obs: "Capa de uso 0,15 mm · 16 réguas/cx" },
      { id: "tar-essence30-reg", colecao: "Essence 30", instalacao: "Colado", formato: "regua", dimensao: "208 × 1230 mm", espessura: "2,5 mm", m2Caixa: 4.09, pecasCaixa: 16, uso: "Res 23 / Com 31", obs: "Capa de uso 0,30 mm · 16 réguas/cx" },
      { id: "tar-piemonte-reg", colecao: "Piemonte", instalacao: "Colado", formato: "regua", dimensao: "208,5 × 1230 mm", espessura: "2 mm", m2Caixa: 5.13, pecasCaixa: 20, uso: "Res 23", obs: "Capa de uso 0,15 mm · 20 réguas/cx" },
      { id: "tar-recanto-reg", colecao: "Recanto / DOMA", instalacao: "Colado", formato: "regua", dimensao: "208,5 × 1230 mm", espessura: "2 mm", m2Caixa: 5.13, pecasCaixa: 20, uso: "Res 23", obs: "Capa de uso 0,15 mm · 20 réguas/cx" },
      { id: "tar-recanto-trigo-reg", colecao: "Recanto / DOMA (Trigo)", instalacao: "Colado", formato: "regua", dimensao: "104,5 × 600,3 mm", espessura: "2 mm", m2Caixa: 3.89, uso: "Res 23", obs: "Layout espinha de peixe" },
      { id: "tar-ambienta-reg", colecao: "Ambienta", instalacao: "Colado", formato: "regua", dimensao: "208 × 1230 mm", espessura: "3 mm", m2Caixa: 3.58, pecasCaixa: 14, uso: "Res 23 / Com 33 / Ind 42", obs: "Design / Series / Make it · capa 0,55 mm" },
      { id: "tar-ambienta-xl-reg", colecao: "Ambienta Design XL", instalacao: "Colado", formato: "regua", dimensao: "228 × 1830 mm", espessura: "3 mm", m2Caixa: 3.34, pecasCaixa: 8, uso: "Res 23 / Com 33 / Ind 42", obs: "Capa de uso 0,50 mm" },
      { id: "tar-ambienta-tech-reg", colecao: "Ambienta Tech", instalacao: "Clicado", formato: "regua", dimensao: "181 × 1520 mm", espessura: "5 mm", m2Caixa: 2.2, pecasCaixa: 8, uso: "Res 23 / Com 32", obs: "SPC click · capa 0,50 mm" },
      { id: "tar-essence-tech-reg", colecao: "Essence Tech", instalacao: "Clicado", formato: "regua", dimensao: "228 × 1220 mm", espessura: "4,5 mm", m2Caixa: 2.78, pecasCaixa: 10, uso: "Res 23 / Com", obs: "SPC click · capa 0,30 mm" },
      // Placas (caixa)
      { id: "tar-injoy-pla", colecao: "Injoy", instalacao: "Colado", formato: "placa", dimensao: "920 × 920 mm", espessura: "2 mm", m2Caixa: 4.23, pecasCaixa: 5, uso: "Res 23", obs: "Capa de uso 0,15 mm · 5 placas/cx" },
      { id: "tar-essence30-pla", colecao: "Essence 30", instalacao: "Colado", formato: "placa", dimensao: "920 × 920 mm", espessura: "2,5 mm", m2Caixa: 4.23, pecasCaixa: 5, uso: "Res 23 / Com 31", obs: "Capa 0,30 mm · varejo (a confirmar)" },
      { id: "tar-ambienta-stone-92", colecao: "Ambienta Stone", instalacao: "Colado", formato: "placa", dimensao: "920 × 920 mm", espessura: "3 mm", m2Caixa: 3.38, pecasCaixa: 4, uso: "Res 23 / Com 33 / Ind 42", obs: "Capa de uso 0,55 mm" },
      { id: "tar-ambienta-stone-60", colecao: "Ambienta Stone", instalacao: "Colado", formato: "placa", dimensao: "600 × 600 mm", espessura: "3 mm", m2Caixa: 3.6, pecasCaixa: 10, uso: "Res 23 / Com 33 / Ind 42", obs: "Capa de uso 0,55 mm" },
      { id: "tar-solare-92", colecao: "Solare", instalacao: "Colado", formato: "placa", dimensao: "920 × 920 mm", espessura: "3 mm", m2Caixa: 3.38, pecasCaixa: 4, uso: "Res 23 / Com 33", obs: "Capa de uso 0,55 mm" },
      { id: "tar-paviflex-thru", colecao: "Paviflex Thru", instalacao: "Colado", formato: "placa", dimensao: "30,5 × 30,5 cm", espessura: "2 mm", m2Caixa: 4.09, pecasCaixa: 44, uso: "Res. e Comercial", obs: "Homogênea (alto tráfego) · 44 placas/cx" },
      // Mantas (rolo)
      { id: "tar-iq-optima", colecao: "iQ Optima", instalacao: "Colado", formato: "manta", dimensao: "2 × 25 m", espessura: "2 mm", m2Caixa: 50, uso: "Res 23 / Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-iq-granit", colecao: "iQ Granit", instalacao: "Colado", formato: "manta", dimensao: "2 × 25 m", espessura: "2 mm", m2Caixa: 50, uso: "Res 23 / Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-iq-surface", colecao: "iQ Surface", instalacao: "Colado", formato: "manta", dimensao: "2 × 23 m", espessura: "2 mm", m2Caixa: 46, uso: "Res 23 / Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-iq-eminent", colecao: "iQ Eminent", instalacao: "Colado", formato: "manta", dimensao: "2 × 23 m", espessura: "2 mm", m2Caixa: 46, uso: "Res 23 / Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-iq-toro-sc", colecao: "iQ Toro SC", instalacao: "Colado", formato: "manta", dimensao: "2 × 23 m", espessura: "2 mm", m2Caixa: 46, uso: "Com 34 / Ind 43", obs: "Homogênea condutiva" },
      { id: "tar-eclipse-premium", colecao: "Eclipse Premium", instalacao: "Colado", formato: "manta", dimensao: "2 × 23 m", espessura: "2 mm", m2Caixa: 46, uso: "Res 23 / Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-vylon-plus", colecao: "Vylon Plus", instalacao: "Colado", formato: "manta", dimensao: "2 × 20 m", espessura: "2 mm", m2Caixa: 40, uso: "Com 34 / Ind 43", obs: "Homogênea" },
      { id: "tar-standard-plus", colecao: "Standard Plus", instalacao: "Colado", formato: "manta", dimensao: "2 × 23 m", espessura: "2 mm", m2Caixa: 46, uso: "Res 23 / Com 34 / Ind 43", obs: "Da planilha (a confirmar)" },
      { id: "tar-imagine", colecao: "Imagine", instalacao: "Colado", formato: "manta", dimensao: "2 × 25 m", espessura: "2,4 mm", m2Caixa: 50, uso: "Res 23 / Com 32", obs: "Da planilha (a confirmar)" },
    ],
  },
];

export interface ResultadoPiso {
  real: number; // caixas (ou rolos) fracionário
  recomendada: number; // fechado, +10%
  areaCoberta: number; // recomendada × m²/embalagem
  unidade: string; // "caixa(s)" | "rolo(s)"
}

/** Real = área ÷ m²/embalagem; recomendada = roundup(real × 1,1). */
export function calcularPiso(piso: PisoVinilico, area: number): ResultadoPiso {
  const real = area > 0 && piso.m2Caixa > 0 ? area / piso.m2Caixa : 0;
  const recomendada = real > 0 ? roundup(real * 1.1) : 0;
  return {
    real,
    recomendada,
    areaCoberta: recomendada * piso.m2Caixa,
    unidade: piso.formato === "manta" ? "rolo(s)" : "caixa(s)",
  };
}

// ── Insumos ──────────────────────────────────────────────────────────────────

export interface OpcaoRendimento {
  id: string;
  label: string;
  /** m² por embalagem; 0 = não usar. */
  rendimento: number;
}

// Primer — pior caso (menor rendimento da faixa) por tipo de base.
export const BASES_PRIMER: OpcaoRendimento[] = [
  { id: "poroso", label: "Contrapiso (poroso)", rendimento: 25 }, // faixa 25–35
  { id: "frio", label: "Piso frio / cerâmica / porcelanato", rendimento: 40 }, // faixa 40–60
];

// Massa autonivelante — rendimento por espessura de nivelamento (m²/saco 20 kg).
export const NIVELAMENTOS: OpcaoRendimento[] = [
  { id: "0", label: "Não nivelar", rendimento: 0 },
  { id: "2", label: "2 mm", rendimento: 5.5 },
  { id: "3", label: "3 mm", rendimento: 3.7 },
  { id: "4", label: "4 mm", rendimento: 2.7 },
  { id: "5", label: "5 mm", rendimento: 2.2 },
  { id: "6", label: "6 mm", rendimento: 1.85 },
  { id: "7", label: "7 mm", rendimento: 1.58 },
  { id: "8", label: "8 mm", rendimento: 1.38 },
  { id: "9", label: "9 mm", rendimento: 1.23 },
  { id: "10", label: "10 mm", rendimento: 1.1 },
];

const COLA_RENDIMENTO = 12; // m²/galão 4 kg (pior caso da faixa 12–15)

export interface ResultadoInsumo {
  nome: string;
  quantidade: number;
  unidade: string;
  detalhe: string;
}

/** Quantidade = roundup(área ÷ rendimento). Autonivelante só se houver espessura. */
export function calcularInsumos(area: number, baseId: string, nivelId: string): ResultadoInsumo[] {
  const base = BASES_PRIMER.find((b) => b.id === baseId) ?? BASES_PRIMER[0];
  const nivel = NIVELAMENTOS.find((n) => n.id === nivelId) ?? NIVELAMENTOS[0];
  const q = (rend: number) => (area > 0 && rend > 0 ? roundup(area / rend) : 0);

  const itens: ResultadoInsumo[] = [
    { nome: "Primer", quantidade: q(base.rendimento), unidade: "galão(ões) 3,6 L", detalhe: `${base.label} · ${base.rendimento} m²/gl` },
    { nome: "Cola", quantidade: q(COLA_RENDIMENTO), unidade: "galão(ões) 4 kg", detalhe: `${COLA_RENDIMENTO} m²/gl` },
  ];
  if (nivel.rendimento > 0)
    itens.push({
      nome: "Massa autonivelante",
      quantidade: q(nivel.rendimento),
      unidade: "saco(s) 20 kg",
      detalhe: `Nivelamento ${nivel.label} · ${nivel.rendimento} m²/sc`,
    });
  return itens;
}
