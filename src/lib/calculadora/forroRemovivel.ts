// Forro modular removível (placa removível sobre grelha de perfis T).
// Consumos da planilha da Modular; a estrutura metálica é a mesma para todos os
// materiais — só a placa muda de nome/tamanho. Cálculo por ÁREA (m²).
//
// Material: EPS, Boreal, Mineral ou Forro Vinil (só o nome). O MINERAL é vendido
// em caixa fechada de 12 placas; os demais, por placa.
// Tamanho: 1,25 × 0,625 m (retangular) ou 0,625 × 0,625 m (quadrada). O perfil
// TERCIÁRIO (0,625 m) existe SÓ na placa quadrada.
// Primário vendido em barra de 3 m. O regulador segue a planilha: pendural a
// cada 1,2 m, contado sobre o primário em barras de 3,125 m (valor da planilha,
// separado da barra de 3 m). Arame = reguladores ÷ 11 (rolos). Parafuso/bucha da
// cantoneira.

import { roundup } from "./materiais";

export interface VariantePlaca {
  id: string;
  label: string;
  /** Placas por caixa fechada (só Mineral); ausente = vendido por placa. */
  placasPorCaixa?: number;
}

export const VARIANTES: VariantePlaca[] = [
  { id: "eps", label: "EPS" },
  { id: "boreal", label: "Boreal" },
  { id: "mineral", label: "Mineral", placasPorCaixa: 12 },
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

  const placasNec = a / tam.areaPlaca; // placas necessárias (fracionário)
  const primario = roundup((a * 0.8) / 3); // T principal a cada 1,25 m (barra 3 m — o que se compra)
  const secundario = roundup((a * 1.6) / 1.25); // T secundário 1,25 m
  const terciario = tam.terciario ? roundup((a * 0.8) / 0.625) : 0; // T 0,625 m (só quadrada)
  const cantoneira = roundup((a * 0.6) / 3); // borda, barra 3 m
  // Regulador como na planilha: pendural a cada 1,2 m, contado sobre o primário
  // reconstruído em barras de 3,125 m (independe da barra de 3 m que se compra).
  const regulador = roundup((roundup((a * 0.8) / 3.125) * 3.125) / 1.2);
  const arame = roundup(regulador / 11); // rolos (arredondado p/ cima)
  const parafuso = cantoneira * 4; // 4 fixações por barra de cantoneira
  const bucha = parafuso; // par com o parafuso

  // Placa: Mineral em caixa fechada (12 placas); os demais, por placa.
  const placa: ItemForro = mat.placasPorCaixa
    ? {
        nome: `Placa ${mat.label} ${tam.label}`,
        quantidade: roundup(placasNec / mat.placasPorCaixa),
        unidade: `caixa(s) (${mat.placasPorCaixa} placas)`,
      }
    : { nome: `Placa ${mat.label} ${tam.label}`, quantidade: roundup(placasNec), unidade: "placa(s)" };

  const itens: ItemForro[] = [
    placa,
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
