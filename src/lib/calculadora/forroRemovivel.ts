// Forro modular removível (placa 62,5 × 125 sobre perfis T). Base: planilha
// "CALCULO DE FORRO REMOVÍVEL" (aba MINERAL). Cálculo por ÁREA (m²).
//
// A estrutura (perfis, cantoneira, reguladores…) é IDÊNTICA para todas as
// variantes — mineral, isopor, gesso modular e Ecophon só mudam o nome da placa.
// Reguladores, arame e parafusos derivam dos perfis (não da área direta).

import { roundup } from "./materiais";

export interface VariantePlaca {
  id: string;
  label: string;
  nomePlaca: string;
}

export const VARIANTES: VariantePlaca[] = [
  { id: "mineral", label: "Fibra mineral", nomePlaca: "Placa mineral 62,5 × 125 cm" },
  { id: "isopor", label: "Isopor", nomePlaca: "Placa isopor 62,5 × 125 cm" },
  { id: "gesso", label: "Gesso modular", nomePlaca: "Placa gesso modular 62,5 × 125 cm" },
  { id: "ecophon", label: "Ecophon", nomePlaca: "Placa Ecophon 62,5 × 125 cm" },
];

export interface ItemForro {
  nome: string;
  quantidade: number;
  unidade: string;
}

/** Materiais por área (m²), como na aba MINERAL. Variante só troca o nome da placa. */
export function calcularForroRemovivel(area: number, varianteId: string): ItemForro[] {
  const v = VARIANTES.find((x) => x.id === varianteId) ?? VARIANTES[0];
  const a = area > 0 ? area : 0;

  const placa = roundup(a / 0.781); // placa 0,625 × 1,25 = 0,781 m²
  const principal = roundup((a * 0.8) / 3.125); // T principal a cada 1,25 m (barra 3,125 m)
  const secundario = roundup((a * 1.6) / 1.25); // T secundário 1,25 m
  const transversal = roundup((a * 0.8) / 0.625); // T 0,625 m
  const cantoneira = roundup((a * 0.6) / 3); // borda, barra 3 m
  const regulador = roundup((principal * 3.125) / 1.2); // pendural a cada 1,2 m do principal
  const arame = roundup(regulador / 22);
  const parafuso = cantoneira * 4; // 4 fixações por barra de cantoneira

  return [
    { nome: v.nomePlaca, quantidade: placa, unidade: "placa(s)" },
    { nome: "Perfil T principal (3,125 m)", quantidade: principal, unidade: "barra(s)" },
    { nome: "Perfil T secundário (1,25 m)", quantidade: secundario, unidade: "barra(s)" },
    { nome: "Perfil T secundário (0,625 m)", quantidade: transversal, unidade: "barra(s)" },
    { nome: "Cantoneira de borda (3 m)", quantidade: cantoneira, unidade: "barra(s)" },
    { nome: "Regulador / pendural", quantidade: regulador, unidade: "un" },
    { nome: "Arame galvanizado", quantidade: arame, unidade: "rolo(s)" },
    { nome: "Parafuso / bucha", quantidade: parafuso, unidade: "un" },
  ];
}
