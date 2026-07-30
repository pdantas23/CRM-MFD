// Seções de negócio da tela de Fornecedores. Fixas por ora; a associação
// fornecedor→seção é configurável (tabela fornecedor_secoes).

export const SECOES_FORNECEDOR = [
  { chave: "drywall", label: "Drywall" },
  { chave: "piso_vinilico", label: "Piso Vinílico" },
  { chave: "solucao_acustica", label: "Solução Acústica" },
] as const;

export type SecaoChave = (typeof SECOES_FORNECEDOR)[number]["chave"];

/** Chaves válidas (para validar entrada e filtrar arrays vindos do banco). */
export const CHAVES_SECAO: readonly string[] = SECOES_FORNECEDOR.map((s) => s.chave);

export const LABEL_SECAO: Record<string, string> = Object.fromEntries(
  SECOES_FORNECEDOR.map((s) => [s.chave, s.label])
);

/** Chave sintética da seção "Outros" (fornecedores sem seção). Não é persistida. */
export const SECAO_OUTROS = "outros";
