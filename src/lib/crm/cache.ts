// Cache in-memory leve para server components do CRM.
// Best-effort por instância — serverless pode ter N instâncias frias; TTL padrão 30s.
// A chave DEVE incluir escopo do usuário (role + vendedor_id) para evitar
// vazamento de dados entre usuários em instâncias quentes.

const DEFAULT_TTL_MS = 30_000;
const CAP_ENTRADAS = 200;

interface Entrada<T> {
  valor: T;
  expiraEm: number; // Date.now() + ttlMs
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, Entrada<any>>();

/** Retorna o valor cached se ainda válido; null se ausente ou expirado. */
export function cacheGet<T>(chave: string): T | null {
  const entrada = store.get(chave);
  if (!entrada) return null;
  if (Date.now() > entrada.expiraEm) {
    store.delete(chave);
    return null;
  }
  return entrada.valor as T;
}

/** Armazena valor com TTL. Descarta a entrada mais antiga se o cap for atingido. */
export function cacheSet<T>(chave: string, valor: T, ttlMs = DEFAULT_TTL_MS): void {
  if (store.size >= CAP_ENTRADAS && !store.has(chave)) {
    // Descarta o mais antigo (primeira chave inserida no Map).
    const primeiraChave = store.keys().next().value;
    if (primeiraChave !== undefined) store.delete(primeiraChave);
  }
  store.set(chave, { valor, expiraEm: Date.now() + ttlMs });
}

/**
 * Invalida entradas cujo prefixo coincide com o argumento.
 * Sem argumento, limpa todo o cache. Exportada para ações de escrita futuras.
 */
export function cacheInvalidate(prefixo?: string): void {
  if (!prefixo) {
    store.clear();
    return;
  }
  for (const chave of Array.from(store.keys())) {
    if (chave.startsWith(prefixo)) store.delete(chave);
  }
}

/**
 * Helper: retorna o valor em cache se disponível; caso contrário executa `fn`,
 * armazena o resultado e o retorna.
 */
export async function comCache<T>(
  chave: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cacheGet<T>(chave);
  if (cached !== null) return cached;
  const valor = await fn();
  cacheSet(chave, valor, ttlMs);
  return valor;
}
