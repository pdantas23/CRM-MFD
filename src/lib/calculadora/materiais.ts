// Cálculo de materiais por metragem (aba Calculadora → Quantidade de produtos).
//
// PAREDES — entram só pela ÁREA (m²); consumo por m² × área, arredondado por
// embalagem. A 222 (planilha da Modular) calcula 100% por m² (nunca usa
// pé-direito), então as ferragens seguem a 222; placa e massa seguem a Trevo
// (coincidem com a 222 na placa) e os parafusos usam o MAIOR coeficiente entre
// 222 e Trevo. Placa selecionável ST/RU (mesma dimensão 1,20×1,80 = 2,16 m²).
//
// FORROS — entram só pela ÁREA (m²), como na Trevo; consumo por m² da 222. A
// placa do Forro Aramado diverge da Trevo (222 = 1,14/m²; Trevo = 1,05 +
// nervura) — ver AVISO no tipo.

export interface ItemComposicao {
  nome: string;
  /** Consumo por m². */
  consumoM2: number;
  /** Divisor de embalagem/peça (1 = unidade direta). Ex.: rolo 150 m, balde 22 kg. */
  fator: number;
  unidade: string;
}

export type ModoEntrada = "parede" | "forro";

/**
 * Combinação de placas ST/RU de uma parede. O consumo total de placa é fixo por
 * tipo (simples 2,1/m²; dupla 4,2/m²) e aqui é repartido entre ST e RU. Cada
 * tipo é arredondado por conta própria (ST e RU são produtos distintos).
 */
export interface OpcaoPlaca {
  id: string;
  label: string;
  /** Consumo/m² de placa ST nesta combinação. */
  st: number;
  /** Consumo/m² de placa RU nesta combinação. */
  ru: number;
}

export interface TipoCalculo {
  id: string;
  nome: string;
  /** Descrição curta exibida no card da primeira vista. */
  descricao: string;
  /** Caminho da imagem do card (em /public). */
  img?: string;
  /** Só muda o rótulo do campo de área ("parede" vs "forro"); ambos entram por m². */
  entrada: ModoEntrada;
  /** Paredes: combinações ST/RU (dropdown). Placa vem daqui, não de `itens`. */
  opcoesPlaca?: OpcaoPlaca[];
  /** Itens fixos (sem a placa das paredes, que vem de `opcoesPlaca`). */
  itens: ItemComposicao[];
  aviso?: string;
}

// Placa arredonda para cima (nº de chapas inteiras), como na Trevo.
export function roundup(v: number): number {
  return Math.ceil(Math.round(v * 100) / 100);
}

export const TIPOS: TipoCalculo[] = [
  {
    id: "parede-simples",
    nome: "Parede Simples",
    descricao: "1 chapa em cada face",
    img: "/calculadora/parede-simples.png",
    entrada: "parede",
    // Total de placa = 2,1/m² (2 chapas, 1 por face); cada chapa = 1,05/m².
    opcoesPlaca: [
      { id: "st-st", label: "ST em cada face", st: 2.1, ru: 0 },
      { id: "st-ru", label: "1 chapa ST e 1 RU em cada face", st: 1.05, ru: 1.05 },
      { id: "ru-ru", label: "1 RU em cada face", st: 0, ru: 2.1 },
    ],
    itens: [
      { nome: "Montante (3 m)", consumoM2: 2.5, fator: 3, unidade: "peça(s)" }, // 222
      { nome: "Guia (3 m)", consumoM2: 0.9, fator: 3, unidade: "peça(s)" }, // 222
      { nome: "Massa pronta", consumoM2: 0.94, fator: 22, unidade: "balde(s) 22 kg" }, // Trevo
      { nome: "Fita para junta", consumoM2: 2.8, fator: 150, unidade: "rolo(s) 150 m" }, // 222
      { nome: "Parafuso TA 25", consumoM2: 22, fator: 1, unidade: "un" }, // maior(222 22, Trevo 22)
      { nome: "Parafuso S7", consumoM2: 2, fator: 1, unidade: "un" }, // maior(222 2, Trevo 2)
    ],
  },
  {
    id: "parede-dupla",
    nome: "Parede Dupla",
    descricao: "2 chapas em cada face",
    img: "/calculadora/parede-dupla.jpg",
    entrada: "parede",
    // Total de placa = 4,2/m² (4 chapas, 2 por face); cada chapa = 1,05/m².
    opcoesPlaca: [
      { id: "2st-2st", label: "2 ST em cada face", st: 4.2, ru: 0 },
      { id: "stru-2st", label: "1 ST + 1 RU em uma face e 2 ST na outra", st: 3.15, ru: 1.05 },
      { id: "stru-stru", label: "1 ST + 1 RU em cada face", st: 2.1, ru: 2.1 },
    ],
    itens: [
      { nome: "Montante (3 m)", consumoM2: 2.5, fator: 3, unidade: "peça(s)" }, // 222
      { nome: "Guia (3 m)", consumoM2: 0.9, fator: 3, unidade: "peça(s)" }, // 222
      { nome: "Massa pronta", consumoM2: 1.88, fator: 22, unidade: "balde(s) 22 kg" }, // Trevo (separativa)
      { nome: "Fita para junta", consumoM2: 3, fator: 150, unidade: "rolo(s) 150 m" }, // 222 = Trevo
      { nome: "Lã de PET", consumoM2: 1.05, fator: 30, unidade: "rolo(s)" }, // 222
      { nome: "Parafuso TA 25", consumoM2: 13, fator: 1, unidade: "un" }, // maior(222 10, Trevo 13)
      { nome: "Parafuso TA 35", consumoM2: 29, fator: 1, unidade: "un" }, // maior(222 29, Trevo 22)
      { nome: "Parafuso S7", consumoM2: 2, fator: 1, unidade: "un" }, // maior(222 2, Trevo 2)
    ],
  },
  {
    id: "forro-aramado",
    nome: "Forro Aramado",
    descricao: "Forro aramado “H”",
    img: "/calculadora/forro-aramado.png",
    entrada: "forro",
    aviso:
      "Placa do Forro Aramado: usando o consumo da 222 (1,14/m²). O método da Trevo " +
      "seria 1,05/m² + nervura — avise se quiser trocar.",
    itens: [
      { nome: "Placa ST 12,5 (0,60 × 2,00)", consumoM2: 1.14, fator: 1.2, unidade: "placa(s)" },
      { nome: "Fita para junta", consumoM2: 2.8, fator: 150, unidade: "rolo(s) 150 m" },
      { nome: 'Junção "H"', consumoM2: 4.3, fator: 1, unidade: "un" },
      { nome: "Gesso em pó", consumoM2: 3.8, fator: 40, unidade: "saco(s) 40 kg" },
      { nome: "Parafuso S7", consumoM2: 4.3, fator: 1, unidade: "un" },
      { nome: "Arame galvanizado nº 16", consumoM2: 0.05, fator: 1, unidade: "kg" },
      { nome: "Massa pronta", consumoM2: 0.47, fator: 30, unidade: "balde(s) 30 kg" },
      { nome: "Sisal", consumoM2: 0.08, fator: 1, unidade: "kg" },
      { nome: "Broca SDS Plus (S7)", consumoM2: 0.05, fator: 1, unidade: "un" },
    ],
  },
  {
    id: "forro-estruturado",
    nome: "Forro Estruturado",
    descricao: "Forro estruturado F530",
    img: "/calculadora/forro-estruturado.png",
    entrada: "forro",
    itens: [
      { nome: "Placa ST BR 12,5mm", consumoM2: 1.05, fator: 2.16, unidade: "placa(s)" },
      { nome: "Fita para junta", consumoM2: 1.4, fator: 150, unidade: "rolo(s) 150 m" },
      { nome: "Massa pronta", consumoM2: 0.47, fator: 30, unidade: "balde(s) 30 kg" },
      { nome: "Canaleta S47 (3 m)", consumoM2: 2, fator: 3, unidade: "perfil(is)" },
      { nome: "Tabica S 40×48 (3 m)", consumoM2: 0.9, fator: 3, unidade: "tabica(s)" },
      { nome: "Regulador / Pendural S47", consumoM2: 1.8, fator: 1, unidade: "un" },
      { nome: "União S47", consumoM2: 0.3, fator: 1, unidade: "un" },
      { nome: "Parafuso TA 25", consumoM2: 13, fator: 1, unidade: "un" },
      { nome: "Parafuso S7", consumoM2: 2, fator: 1, unidade: "un" },
      { nome: "Arame galvanizado nº 16", consumoM2: 1.8, fator: 14, unidade: "kg" },
    ],
  },
];

export interface ResultadoItem {
  nome: string;
  quantidade: number;
  unidade: string;
}

/**
 * Quantidade por item = roundup(área × consumo/m² ÷ fator de embalagem).
 * Nas paredes, a placa vem da combinação ST/RU escolhida (`opcaoPlacaId`); ST e
 * RU são arredondados separadamente (produtos distintos) e listados primeiro.
 */
export function calcularMateriais(
  tipo: TipoCalculo,
  area: number,
  opcaoPlacaId?: string,
): ResultadoItem[] {
  const placas: ItemComposicao[] = [];
  if (tipo.opcoesPlaca) {
    const op =
      tipo.opcoesPlaca.find((o) => o.id === opcaoPlacaId) ?? tipo.opcoesPlaca[0];
    if (op.st > 0)
      placas.push({ nome: "Placa ST BR 12,5mm", consumoM2: op.st, fator: 2.16, unidade: "placa(s)" });
    if (op.ru > 0)
      placas.push({ nome: "Placa RU BR 12,5mm", consumoM2: op.ru, fator: 2.16, unidade: "placa(s)" });
  }

  return [...placas, ...tipo.itens].map((i) => ({
    nome: i.nome,
    quantidade: area > 0 ? roundup((area * i.consumoM2) / i.fator) : 0,
    unidade: i.unidade,
  }));
}
