// Cálculo de piso vinílico (Calculadora → card Piso Vinílico).
// Base: planilha "MEDIDAS DE PRODUTOS PARA PISO VINILICO" (Rufino + Tarkett).
//
// PISO — régua/placa (vendidos em caixa) são calculados em m², mas o resultado
// fecha em CAIXAS INTEIRAS: caixas = roundup((área × 1,1) ÷ m²/caixa) e o m²
// recomendado = caixas × m²/caixa (ex.: 200 m² de Ambienta 3,58 → 62 cx →
// 221,96 m²). Mantas Tarkett continuam em rolo (m²/rolo): real = área ÷ m²/rolo,
// recomendada = roundup(real × 1,1) rolos fechados.
//
// INSUMOS — por área do piso, pelo PIOR caso do rendimento (menor → não faltar):
// primer (por tipo de base), cola e massa autonivelante (por espessura).

import { roundup } from "./materiais";

export type MarcaId = "rufino" | "tarkett";
export type FormatoPiso = "regua" | "placa" | "manta";

export interface PisoVinilico {
  id: string;
  colecao: string;
  instalacao: string; // "Colado" | "Clicado" | "Autoportante"
  formato: FormatoPiso;
  dimensao: string;
  espessura?: string; // opcional (a planilha Tarkett não traz espessura)
  /** m²/caixa (régua/placa) ou m²/rolo (manta). */
  m2Caixa: number;
  pecasCaixa?: number;
  /** Uso: "Residencial", "Res. e Comercial" ou a classificação Tarkett. */
  uso: string;
  obs?: string;
  /** Agrupamento na planilha Tarkett (ex.: "LVT ESSENCE + INJOY", "CARPETE EM PLACA"). */
  categoria?: string;
  // ── Dados da planilha Tarkett (para a calculadora de preço) ──────────────────
  icmsIncluso?: number; // % de ICMS já embutido no preço da planilha
  kgCaixa?: number; // peso por caixa/rolo
  fretePorM2?: number; // R$/m²
  precoSugerido?: number; // R$ (coluna de preço da planilha)
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
    // Gerado da planilha de preços Tarkett (coluna m2/CAIXA). frete/m², ICMS
    // incluso e preço vêm das colunas homônimas (para a calculadora de preço).
    // Espessura não consta na planilha — fica só onde já era conhecida.
    pisos: [
      // ── LVT SPC + AMBIENTA ──
      { id: "tar-ambienta-tech-regua-18-1x152cm", colecao: "Ambienta Tech", instalacao: "Clicado", formato: "regua", dimensao: "18,1x152cm", espessura: "5 mm", m2Caixa: 2.2, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 4, kgCaixa: 17.8, fretePorM2: 12.22, precoSugerido: 276.1 },
      { id: "tar-ambienta-tech-regua-9-6x61cm", colecao: "Ambienta Tech", instalacao: "Clicado", formato: "regua", dimensao: "9,6x61cm", espessura: "5 mm", m2Caixa: 1.873, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 4, kgCaixa: 15, fretePorM2: 12.09, precoSugerido: 276.1 },
      { id: "tar-ambienta-tech-placa-30-48x60-96", colecao: "Ambienta Tech", instalacao: "Clicado", formato: "placa", dimensao: "30,48x60,96", espessura: "5 mm", m2Caixa: 2.23, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 4, kgCaixa: 18, fretePorM2: 12.19, precoSugerido: 276.1 },
      { id: "tar-essence-tech-regua-22-8x122cm", colecao: "Essence Tech", instalacao: "Clicado", formato: "regua", dimensao: "22,8x122cm", espessura: "4,5 mm", m2Caixa: 2.78, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 4, kgCaixa: 20, fretePorM2: 10.86, precoSugerido: 227.28 },
      { id: "tar-design-placa-92x92cm", colecao: "Design", instalacao: "Colado", formato: "placa", dimensao: "92x92cm", espessura: "3 mm", m2Caixa: 3.38, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 17.4, fretePorM2: 7.77, precoSugerido: 260.69 },
      { id: "tar-design-0-7mm-regua-20-8x123cm", colecao: "Design - 0,7mm", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 19, fretePorM2: 8.01, precoSugerido: 226.52 },
      { id: "tar-design-regua-20-8x123cm", colecao: "Design", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.4, fretePorM2: 7.76, precoSugerido: 205.93 },
      { id: "tar-make-it-placa-92x92cm", colecao: "Make It", instalacao: "Colado", formato: "placa", dimensao: "92x92cm", espessura: "3 mm", m2Caixa: 3.38, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 17.4, fretePorM2: 7.77, precoSugerido: 260.69 },
      { id: "tar-make-it-placa-60x60cm", colecao: "Make It", instalacao: "Colado", formato: "placa", dimensao: "60x60cm", espessura: "3 mm", m2Caixa: 3.6, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.5, fretePorM2: 7.76, precoSugerido: 237.85 },
      { id: "tar-make-it-regua-20-8x123cm", colecao: "Make It", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.4, fretePorM2: 7.76, precoSugerido: 227.37 },
      { id: "tar-stone-xl-placa-92x92cm", colecao: "Stone XL", instalacao: "Colado", formato: "placa", dimensao: "92x92cm", espessura: "3 mm", m2Caixa: 3.38, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 17.4, fretePorM2: 7.77, precoSugerido: 236.99 },
      { id: "tar-stone-0-7mm-placa-60x60cm", colecao: "Stone - 0,7mm", instalacao: "Colado", formato: "placa", dimensao: "60x60cm", espessura: "3 mm", m2Caixa: 3.6, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 19.3, fretePorM2: 8.1, precoSugerido: 226.06 },
      { id: "tar-stone-regua-regua-20-8x123cm", colecao: "Stone Régua", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.4, fretePorM2: 7.76, precoSugerido: 205.93 },
      { id: "tar-stone-placa-60x60cm", colecao: "Stone", instalacao: "Colado", formato: "placa", dimensao: "60x60cm", espessura: "3 mm", m2Caixa: 3.6, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.5, fretePorM2: 7.76, precoSugerido: 205.41 },
      { id: "tar-series-0-7mm-regua-20-8x123cm", colecao: "Series - 0,7mm", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 19, fretePorM2: 8.01, precoSugerido: 226.52 },
      { id: "tar-series-0-7mm-regua-18-4x95cm", colecao: "Series - 0,7mm", instalacao: "Colado", formato: "regua", dimensao: "18,4x95cm", espessura: "3 mm", m2Caixa: 3.32, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.9, fretePorM2: 8.6, precoSugerido: 226.52 },
      { id: "tar-series-regua-20-8x123cm", colecao: "Series", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "3 mm", m2Caixa: 3.58, uso: "Res. e Comercial", categoria: "LVT SPC + AMBIENTA", icmsIncluso: 7, kgCaixa: 18.4, fretePorM2: 7.76, precoSugerido: 205.93 },
      // ── LVT ESSENCE + INJOY ──
      { id: "tar-essence-30-placa-92x92cm", colecao: "Essence 30", instalacao: "Colado", formato: "placa", dimensao: "92x92cm", espessura: "2,5 mm", m2Caixa: 4.23, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 19.7, fretePorM2: 7.03, precoSugerido: 196.15 },
      { id: "tar-essence-30-placa-60x60cm", colecao: "Essence 30", instalacao: "Colado", formato: "placa", dimensao: "60x60cm", espessura: "2,5 mm", m2Caixa: 3.96, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 18.5, fretePorM2: 7.05, precoSugerido: 178.69 },
      { id: "tar-essence-30-regua-18-1x152cm", colecao: "Essence 30", instalacao: "Colado", formato: "regua", dimensao: "18,1x152cm", espessura: "2,5 mm", m2Caixa: 3.12, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 14.4, fretePorM2: 6.97, precoSugerido: 178.69 },
      { id: "tar-essence-30-regua-20-8x123cm", colecao: "Essence 30", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "2,5 mm", m2Caixa: 4.09, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 18.2, fretePorM2: 6.72, precoSugerido: 146.2 },
      { id: "tar-recanto-doma-regua-10-4x60cm", colecao: "Recanto DOMA", instalacao: "Colado", formato: "regua", dimensao: "10,4x60cm", espessura: "2 mm", m2Caixa: 3.89, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 15, fretePorM2: 5.82, precoSugerido: 138.61 },
      { id: "tar-recanto-doma-regua-20-8x123cm", colecao: "Recanto DOMA", instalacao: "Colado", formato: "regua", dimensao: "20,8x123cm", espessura: "2 mm", m2Caixa: 5.13, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 19.75, fretePorM2: 5.81, precoSugerido: 120.53 },
      { id: "tar-injoy-placa-92x92cm", colecao: "Injoy", instalacao: "Colado", formato: "placa", dimensao: "92x92cm", espessura: "2 mm", m2Caixa: 4.23, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 16.5, fretePorM2: 5.89, precoSugerido: 150.68 },
      { id: "tar-injoy-regua-20-85x123cm", colecao: "Injoy", instalacao: "Colado", formato: "regua", dimensao: "20,85x123cm", espessura: "2 mm", m2Caixa: 5.13, uso: "Res. e Comercial", categoria: "LVT ESSENCE + INJOY", icmsIncluso: 7, kgCaixa: 19.75, fretePorM2: 5.81, precoSugerido: 109.57 },
      // ── PAVIFLEX ──
      { id: "tar-thru-placa-30-5x30-5cm", colecao: "Thru", instalacao: "Colado", formato: "placa", dimensao: "30,5x30,5cm", espessura: "2 mm", m2Caixa: 6.51, uso: "Res. e Comercial", categoria: "PAVIFLEX", icmsIncluso: 4, kgCaixa: 28.5, fretePorM2: 6.61, precoSugerido: 134.86 },
      { id: "tar-thru-placa-30-5x30-5cm-2", colecao: "Thru", instalacao: "Colado", formato: "placa", dimensao: "30,5x30,5cm", espessura: "2 mm", m2Caixa: 4.09, uso: "Res. e Comercial", categoria: "PAVIFLEX", icmsIncluso: 4, kgCaixa: 16.7, fretePorM2: 6.17, precoSugerido: 118.66 },
      { id: "tar-fit-placa-30-5x30-5cm", colecao: "Fit", instalacao: "Colado", formato: "placa", dimensao: "30,5x30,5cm", espessura: "2 mm", m2Caixa: 4.09, uso: "Res. e Comercial", categoria: "PAVIFLEX", icmsIncluso: 4, kgCaixa: 16.7, fretePorM2: 6.17, precoSugerido: 118.66 },
      // ── MANTAS RESIDENCIAIS ──
      { id: "tar-imagine-manta-2x25m", colecao: "Imagine", instalacao: "Colado", formato: "manta", dimensao: "2x25m", espessura: "2,4 mm", m2Caixa: 50, uso: "Residencial", categoria: "MANTAS RESIDENCIAIS", icmsIncluso: 4, kgCaixa: 92.5, fretePorM2: 2.79, precoSugerido: 195.06 },
      { id: "tar-imagine-manta-2x25m-2", colecao: "Imagine", instalacao: "Colado", formato: "manta", dimensao: "2x25m", espessura: "2,4 mm", m2Caixa: 50, uso: "Residencial", categoria: "MANTAS RESIDENCIAIS", icmsIncluso: 4, kgCaixa: 79, fretePorM2: 2.39, precoSugerido: 162.5 },
      { id: "tar-decorflex-manta-2x30m", colecao: "Decorflex", instalacao: "Colado", formato: "manta", dimensao: "2x30m", espessura: "1,5 mm", m2Caixa: 60, uso: "Residencial", obs: "cód. 5337", categoria: "MANTAS RESIDENCIAIS", icmsIncluso: 4, kgCaixa: 66, fretePorM2: 1.66, precoSugerido: 87.63 },
      { id: "tar-decorflex-manta-2x35m", colecao: "Decorflex", instalacao: "Colado", formato: "manta", dimensao: "2x35m", espessura: "1,5 mm", m2Caixa: 70, uso: "Residencial", obs: "cód. 5087/6519", categoria: "MANTAS RESIDENCIAIS", kgCaixa: 77 },
      { id: "tar-decorflex-manta-2x42m", colecao: "Decorflex", instalacao: "Colado", formato: "manta", dimensao: "2x42m", espessura: "1,5 mm", m2Caixa: 84, uso: "Residencial", obs: "cód. 5334", categoria: "MANTAS RESIDENCIAIS", kgCaixa: 92.4 },
      // ── MANTAS COMERCIAIS ──
      { id: "tar-iq-toro-manta-2x23m", colecao: "iQ Toro", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 153.4, fretePorM2: 5.04, precoSugerido: 495.43 },
      { id: "tar-iq-optima-manta-2x25m", colecao: "iQ Optima", instalacao: "Colado", formato: "manta", dimensao: "2x25m", espessura: "2 mm", m2Caixa: 50, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 132.5, fretePorM2: 4, precoSugerido: 356.95 },
      { id: "tar-iq-surface-manta-2x23m", colecao: "iQ Surface", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 128.8, fretePorM2: 4.23, precoSugerido: 356.95 },
      { id: "tar-iq-granit-manta-2x25m", colecao: "iQ Granit", instalacao: "Colado", formato: "manta", dimensao: "2x25m", espessura: "2 mm", m2Caixa: 50, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 137.5, fretePorM2: 4.15, precoSugerido: 356.95 },
      { id: "tar-iq-eminent-manta-2x23m", colecao: "iQ Eminent", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 126.5, fretePorM2: 4.15, precoSugerido: 356.95 },
      { id: "tar-eclipse-premium-manta-2x23m", colecao: "Eclipse Premium", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 155.94, fretePorM2: 5.12, precoSugerido: 294.75 },
      { id: "tar-standard-plus-manta-2x23m", colecao: "Standard Plus", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 171.534, fretePorM2: 5.63, precoSugerido: 188.64 },
      { id: "tar-vylon-plus-manta-2x20m", colecao: "Vylon Plus", instalacao: "Colado", formato: "manta", dimensao: "2x20m", espessura: "2 mm", m2Caixa: 40, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 167.2, fretePorM2: 6.31, precoSugerido: 188.64 },
      { id: "tar-flourish-manta-2x23m", colecao: "Flourish", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 142.6, fretePorM2: 4.68, precoSugerido: 276.86 },
      { id: "tar-safetred-universal-plus-manta-2x20m", colecao: "Safetred Universal Plus", instalacao: "Colado", formato: "manta", dimensao: "2x20m", m2Caixa: 40, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 134, fretePorM2: 5.06, precoSugerido: 350 },
      { id: "tar-acoustic-manta-2x23m", colecao: "Acoustic", instalacao: "Colado", formato: "manta", dimensao: "2x23m", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 115, fretePorM2: 3.78, precoSugerido: 276.86 },
      { id: "tar-wood-fiber-mineral-concrete-manta-2x25m", colecao: "Wood/Fiber/Mineral/Concrete", instalacao: "Colado", formato: "manta", dimensao: "2x25m", m2Caixa: 50, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 132.5, fretePorM2: 4, precoSugerido: 252.83 },
      { id: "tar-wood-agrego-grafito-manta-2x23m", colecao: "Wood/Agrego/Grafito", instalacao: "Colado", formato: "manta", dimensao: "2x23m", espessura: "2 mm", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 138, fretePorM2: 4.53, precoSugerido: 252.83 },
      { id: "tar-colormatch-uni-manta-2x23m", colecao: "Colormatch/Uni", instalacao: "Colado", formato: "manta", dimensao: "2x23m", m2Caixa: 46, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 138, fretePorM2: 4.53, precoSugerido: 225.13 },
      { id: "tar-trainning-manta-2x20-5m", colecao: "TRAINNING", instalacao: "Colado", formato: "manta", dimensao: "2x20,5m", m2Caixa: 41, uso: "Comercial", categoria: "MANTAS COMERCIAIS", icmsIncluso: 4, kgCaixa: 173.43, fretePorM2: 6.39, precoSugerido: 474.15 },
      // ── MANTAS COMERCIAIS - Sob Encomenda ──
      { id: "tar-aquarele-wall-hfs-manta-2x35m", colecao: "AQUARELE WALL HFS", instalacao: "Colado", formato: "manta", dimensao: "2x35m", m2Caixa: 70, uso: "Comercial (sob encomenda)", categoria: "MANTAS COMERCIAIS - Sob Encomenda", icmsIncluso: 4, kgCaixa: 105, fretePorM2: 2.27, precoSugerido: 175.1 },
      { id: "tar-protect-wall-1-5mm-manta-2x20m", colecao: "PROTECT WALL 1,5mm", instalacao: "Colado", formato: "manta", dimensao: "2x20m", m2Caixa: 40, uso: "Comercial (sob encomenda)", categoria: "MANTAS COMERCIAIS - Sob Encomenda", icmsIncluso: 4, kgCaixa: 96, fretePorM2: 3.62, precoSugerido: 246.13 },
      { id: "tar-protect-wall-1-5mm-manta-2x20m-2", colecao: "PROTECT WALL 1,5mm", instalacao: "Colado", formato: "manta", dimensao: "2x20m", m2Caixa: 40, uso: "Comercial (sob encomenda)", categoria: "MANTAS COMERCIAIS - Sob Encomenda", icmsIncluso: 4, kgCaixa: 96, fretePorM2: 3.62, precoSugerido: 289.25 },
      { id: "tar-linoleum-veneto-xf-manta-2x30m", colecao: "LINOLEUM VENETO XF", instalacao: "Colado", formato: "manta", dimensao: "2x30m", m2Caixa: 60, uso: "Comercial (sob encomenda)", categoria: "MANTAS COMERCIAIS - Sob Encomenda", icmsIncluso: 4, kgCaixa: 180, fretePorM2: 4.53, precoSugerido: 216.78 },
      // ── AUTOPORTANTE ──
      { id: "tar-set-base-acustica-placa-91-44x91-44cm", colecao: "SET BASE ACÚSTICA", instalacao: "Autoportante", formato: "placa", dimensao: "91,44x91,44cm", m2Caixa: 2.51, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.51, fretePorM2: 1.51, precoSugerido: 548.45 },
      { id: "tar-set-base-acustica-placa-60-96x60-96cm", colecao: "SET BASE ACÚSTICA", instalacao: "Autoportante", formato: "placa", dimensao: "60,96x60,96cm", m2Caixa: 1.858, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 1.858, fretePorM2: 1.51, precoSugerido: 548.45 },
      { id: "tar-set-base-acustica-regua-22-86x121-92cm", colecao: "SET BASE ACÚSTICA", instalacao: "Autoportante", formato: "regua", dimensao: "22,86x121,92cm", m2Caixa: 1.393, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 1.393, fretePorM2: 1.51 },
      { id: "tar-id-square-regua-120x20cm", colecao: "ID SQUARE", instalacao: "Autoportante", formato: "regua", dimensao: "120x20cm", m2Caixa: 2.88, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.88, fretePorM2: 1.51, precoSugerido: 494.03 },
      { id: "tar-id-square-placa-50x50cm", colecao: "ID SQUARE", instalacao: "Autoportante", formato: "placa", dimensao: "50x50cm", m2Caixa: 3, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 3, fretePorM2: 1.51, precoSugerido: 442.26 },
      { id: "tar-id-square-regua-120x20cm-2", colecao: "ID SQUARE", instalacao: "Autoportante", formato: "regua", dimensao: "120x20cm", m2Caixa: 2.88, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.88, fretePorM2: 1.51, precoSugerido: 437.18 },
      { id: "tar-id-square-regua-100x25cm", colecao: "ID SQUARE", instalacao: "Autoportante", formato: "regua", dimensao: "100x25cm", m2Caixa: 3, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 3, fretePorM2: 1.51, precoSugerido: 437.18 },
      { id: "tar-set-placa-91-44x91-44cm", colecao: "SET", instalacao: "Autoportante", formato: "placa", dimensao: "91,44x91,44cm", m2Caixa: 2.51, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.51, fretePorM2: 1.51, precoSugerido: 448.71 },
      { id: "tar-set-placa-60-96x60-96cm", colecao: "SET", instalacao: "Autoportante", formato: "placa", dimensao: "60,96x60,96cm", m2Caixa: 2.23, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.23, fretePorM2: 1.51, precoSugerido: 448.71 },
      { id: "tar-set-placa-30-48x60-96cm", colecao: "SET", instalacao: "Autoportante", formato: "placa", dimensao: "30,48x60,96cm", m2Caixa: 1.672, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 1.672, fretePorM2: 1.51, precoSugerido: 448.71 },
      { id: "tar-set-regua-22-86x121-92cm", colecao: "SET", instalacao: "Autoportante", formato: "regua", dimensao: "22,86x121,92cm", m2Caixa: 1.672, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 1.672, fretePorM2: 1.51, precoSugerido: 448.71 },
      { id: "tar-flow-placa-92x92cm", colecao: "FLOW", instalacao: "Autoportante", formato: "placa", dimensao: "92x92cm", m2Caixa: 2.539, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 4, kgCaixa: 2.539, fretePorM2: 1.51, precoSugerido: 361.85 },
      { id: "tar-flow-regua-20-8x123cm", colecao: "FLOW", instalacao: "Autoportante", formato: "regua", dimensao: "20,8x123cm", m2Caixa: 2.558, uso: "Comercial", categoria: "AUTOPORTANTE", icmsIncluso: 7, kgCaixa: 2.558, fretePorM2: 1.51, precoSugerido: 361.85 },
      // ── CARPETE EM PLACA ──
      { id: "tar-desert-ecobase-placa-50x50cm", colecao: "Desert Ecobase", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 19.5, fretePorM2: 5.89, precoSugerido: 392.34 },
      { id: "tar-desert-placa-50x50cm", colecao: "Desert", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 19.5, fretePorM2: 5.89, precoSugerido: 392.34 },
      { id: "tar-essence-structure-placa-50x50cm", colecao: "Essence Structure", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 20.5, fretePorM2: 6.19, precoSugerido: 331.23 },
      { id: "tar-essence-maze-placa-50x50cm", colecao: "Essence Maze", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 20.5, fretePorM2: 6.19, precoSugerido: 328.75 },
      { id: "tar-essence-roots-placa-50x50cm", colecao: "Essence Roots", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 20, fretePorM2: 6.04, precoSugerido: 319.63 },
      { id: "tar-essence-stripe-placa-50x50cm", colecao: "Essence Stripe", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 20, fretePorM2: 6.04, precoSugerido: 301.77 },
      { id: "tar-essence-pure-placa-50x50cm", colecao: "Essence Pure", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 19.3, fretePorM2: 5.83, precoSugerido: 297.2 },
      { id: "tar-essence-placa-50x50cm", colecao: "Essence", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 19.3, fretePorM2: 5.83, precoSugerido: 297.2 },
      { id: "tar-duo-placa-50x50cm", colecao: "Duo", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 19, fretePorM2: 5.74, precoSugerido: 193.1 },
      { id: "tar-core-placa-50x50cm", colecao: "Core", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 18.5, fretePorM2: 5.59, precoSugerido: 227.17 },
      { id: "tar-core-regua-100x25cm", colecao: "Core", instalacao: "Colado", formato: "regua", dimensao: "100x25cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 18.5, fretePorM2: 5.59, precoSugerido: 227.17 },
      { id: "tar-dots-placa-50x50cm", colecao: "Dots", instalacao: "Colado", formato: "placa", dimensao: "50x50cm", m2Caixa: 5, uso: "Comercial", categoria: "CARPETE EM PLACA", icmsIncluso: 4, kgCaixa: 18.6, fretePorM2: 5.62, precoSugerido: 192.54 },
      // ── Fora da planilha Tarkett atual (mantidos do cadastro anterior) ──
      { id: "tar-piemonte-reg", colecao: "Piemonte", instalacao: "Colado", formato: "regua", dimensao: "208,5 × 1230 mm", espessura: "2 mm", m2Caixa: 5.13, pecasCaixa: 20, uso: "Res 23", obs: "Capa de uso 0,15 mm · 20 réguas/cx", categoria: "Fora da planilha atual" },
      { id: "tar-ambienta-xl-reg", colecao: "Ambienta Design XL", instalacao: "Colado", formato: "regua", dimensao: "228 × 1830 mm", espessura: "3 mm", m2Caixa: 3.34, pecasCaixa: 8, uso: "Res 23 / Com 33 / Ind 42", obs: "Capa de uso 0,50 mm", categoria: "Fora da planilha atual" },
      { id: "tar-solare-92", colecao: "Solare", instalacao: "Colado", formato: "placa", dimensao: "920 × 920 mm", espessura: "3 mm", m2Caixa: 3.38, pecasCaixa: 4, uso: "Res 23 / Com 33", obs: "Capa de uso 0,55 mm", categoria: "Fora da planilha atual" },
    ],
  },
];

export interface ResultadoPiso {
  manta: boolean; // manta → resultado em rolo; régua/placa → em m²
  recomendada: number; // qtd recomendada na unidade principal (m² fechado em caixas p/ caixa, rolos p/ manta)
  unidade: string; // unidade principal: "m²" | "rolo(s)"
  real: number; // medida-base: área (caixa) ou rolos fracionário (manta)
  realUnidade: string; // "m²" | "rolo(s)"
  referencia: number; // caixa: nº de caixas fechadas; manta: área coberta (m²)
  refUnidade: string; // "caixa(s)" | "m²"
}

// Régua/placa: resultado em m² fechado em caixas inteiras (caixas = roundup(área
// × 1,1 ÷ m²/caixa); m² = caixas × m²/caixa). Manta: rolos fechados (real = área
// ÷ m²/rolo).
export function calcularPiso(piso: PisoVinilico, area: number): ResultadoPiso {
  if (piso.formato === "manta") {
    const real = area > 0 && piso.m2Caixa > 0 ? area / piso.m2Caixa : 0;
    const rolos = real > 0 ? roundup(real * 1.1) : 0;
    return {
      manta: true,
      recomendada: rolos,
      unidade: "rolo(s)",
      real,
      realUnidade: "rolo(s)",
      referencia: rolos * piso.m2Caixa,
      refUnidade: "m²",
    };
  }
  const caixas = area > 0 && piso.m2Caixa > 0 ? roundup((area * 1.1) / piso.m2Caixa) : 0;
  return {
    manta: false,
    recomendada: caixas * piso.m2Caixa, // m² de caixas fechadas
    unidade: "m²",
    real: area,
    realUnidade: "m²",
    referencia: caixas,
    refUnidade: "caixa(s)",
  };
}

function fmtM2(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Texto discriminado da quantidade de piso, para a observação do orçamento:
// área calculada, recomendado (+10%) e o equivalente em caixas/rolos (nº e m²).
export function observacaoPiso(marca: string, piso: PisoVinilico, area: number, r: ResultadoPiso): string {
  const maisDez = area * 1.1; // +10% cru, antes de fechar em embalagem
  const emb = piso.formato === "manta" ? "rolo" : "cx";
  // recomendada/referencia trocam de papel entre manta (rolos/m²) e caixa (m²/caixas).
  const qtdeEmb = r.manta ? r.recomendada : r.referencia; // nº de embalagens
  const totalM2 = r.manta ? r.referencia : r.recomendada; // m² cobertos por elas
  return [
    `Piso vinílico — ${piso.colecao} ${piso.instalacao}${piso.espessura ? " " + piso.espessura : ""} (${marca})`,
    `• Área calculada: ${fmtM2(area)} m²`,
    `• Recomendado (+10%): ${fmtM2(maisDez)} m²`,
    `• Equivalente em ${r.manta ? "rolos" : "caixas"}: ${qtdeEmb} ${r.manta ? "rolo(s)" : "caixa(s)"}` +
      ` = ${fmtM2(totalM2)} m² (${fmtM2(piso.m2Caixa)} m²/${emb})`,
  ].join("\n");
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
