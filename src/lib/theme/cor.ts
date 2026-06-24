// Deriva a escala de tons (50→900) da cor primária de uma conta a partir de um
// hex, sem dependência externa. Cada tom é devolvido como "R G B" (canais
// separados) para casar com as CSS variables consumidas pelo Tailwind:
//   primary-600 → rgb(var(--color-primary-600) / <alpha-value>)

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Converte "#RRGGBB" (ou "#RGB") em {r,g,b}. Fallback p/ azul em hex inválido. */
function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 26, g: 115, b: 232 }; // #1a73e8
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Mistura uma cor com um alvo (branco/preto) por um fator t ∈ [0,1]. */
function mix(c: RGB, alvo: RGB, t: number): RGB {
  return {
    r: Math.round(c.r * (1 - t) + alvo.r * t),
    g: Math.round(c.g * (1 - t) + alvo.g * t),
    b: Math.round(c.b * (1 - t) + alvo.b * t),
  };
}

const BRANCO: RGB = { r: 255, g: 255, b: 255 };
const PRETO: RGB = { r: 0, g: 0, b: 0 };

// Fator de mistura por tom: positivo = clareia (mistura branco),
// negativo = escurece (mistura preto). 600 é a cor base (fator 0).
const FATORES: Record<string, number> = {
  "50": 0.92,
  "100": 0.82,
  "200": 0.7,
  "300": 0.55,
  "400": 0.32,
  "500": 0.12,
  "600": 0,
  "700": -0.14,
  "800": -0.28,
  "900": -0.42,
};

function rgbStr(c: RGB): string {
  return `${c.r} ${c.g} ${c.b}`;
}

/**
 * Recebe um hex (#1a73e8) e devolve as CSS variables da escala primária:
 * { '--color-primary-50': '235 241 253', ..., '--color-primary-900': '...' }.
 */
export function deriveScale(hex: string): Record<string, string> {
  const base = hexToRgb(hex);
  const vars: Record<string, string> = {};
  for (const [tom, fator] of Object.entries(FATORES)) {
    const cor = fator === 0 ? base : mix(base, fator > 0 ? BRANCO : PRETO, Math.abs(fator));
    vars[`--color-primary-${tom}`] = rgbStr(cor);
  }
  return vars;
}
