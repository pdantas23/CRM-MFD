// Forro modular removível (placa removível sobre grelha de perfis T).
// Consumos da planilha da Modular; a estrutura metálica é a mesma para todos os
// materiais — só a placa muda de nome e tamanho. Cálculo por ÁREA (m²).
//
// Material da placa: EPS, Boreal, Mineral ou Forro Vinil (só muda o nome).
// Tamanho: 1,25 × 0,625 m (retangular) ou 0,625 × 0,625 m (quadrada). O perfil
// TERCIÁRIO (0,625 m) existe SÓ na placa quadrada. Reguladores, arame e
// parafuso/bucha derivam dos perfis e da cantoneira.

import { roundup } from "./materiais";

export interface VariantePlaca {
  id: string;
  label: string;
}

export const VARIANTES: VariantePlaca[] = [
  { id: "eps", label: "EPS" },
  { id: "boreal", label: "Boreal" },
  { id: "mineral", label: "Mineral" },
  { id: "vinil", label: "Forro Vinil" },
];

export interface TamanhoPlaca {
  id: string;
  label: string;
  /** Área da placa em m² (para dividir a área da obra). */
  areaPlaca: number;
  /** Placa quadrada usa o perfil terciário (0,625 m). */
  terciario: boolean;
}

export const TAMANHOS: TamanhoPlaca[] = [
  { id: "125x625", label: "1,25 × 0,625 m", areaPlaca: 0.78125, terciario: false },
  { id: "625x625", label: "0,625 × 0,625 m", areaPlaca: 0.390625, terciario: true },
];

export interface ItemForro {
  nome: string;
  quantidade: number;
  unidade: string;
}

/** Materiais por área (m²). O terciário só entra na placa 0,625 × 0,625. */
export function calcularForroRemovivel(
  area: number,
  materialId: string,
  tamanhoId: string,
): ItemForro[] {
  const mat = VARIANTES.find((v) => v.id === materialId) ?? VARIANTES[0];
  const tam = TAMANHOS.find((t) => t.id === tamanhoId) ?? TAMANHOS[0];
  const a = area > 0 ? area : 0;

  const placa = roundup(a / tam.areaPlaca);
  const primario = roundup((a * 0.8) / 3); // T principal a cada 1,25 m (barra 3 m)
  const secundario = roundup((a * 1.6) / 1.25); // T secundário 1,25 m
  const terciario = tam.terciario ? roundup((a * 0.8) / 0.625) : 0; // T 0,625 m (só quadrada)
  const cantoneira = roundup((a * 0.6) / 3); // borda, barra 3 m
  const regulador = roundup((primario * 3) / 1.2); // pendural a cada 1,2 m do primário
  const arame = roundup(regulador / 22);
  const parafuso = cantoneira * 4; // 4 fixações por barra de cantoneira
  const bucha = parafuso; // par com o parafuso

  const itens: ItemForro[] = [
    { nome: `Placa ${mat.label} ${tam.label}`, quantidade: placa, unidade: "placa(s)" },
    { nome: "Perfil primário (3 m)", quantidade: primario, unidade: "barra(s)" },
    { nome: "Perfil secundário (1,25 m)", quantidade: secundario, unidade: "barra(s)" },
  ];
  if (tam.terciario) {
    itens.push({ nome: "Perfil terciário (0,625 m)", quantidade: terciario, unidade: "barra(s)" });
  }
  itens.push(
    { nome: "Cantoneira de borda (3 m)", quantidade: cantoneira, unidade: "barra(s)" },
    { nome: "Regulador / pendural", quantidade: regulador, unidade: "un" },
    { nome: "Arame galvanizado", quantidade: arame, unidade: "rolo(s)" },
    { nome: "Parafuso", quantidade: parafuso, unidade: "un" },
    { nome: "Bucha", quantidade: bucha, unidade: "un" },
  );
  return itens;
}
