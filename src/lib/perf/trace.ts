// Helper de TRACE por-passo do caminho RSC de /pedidos e /orcamentos.
//
// Objetivo: medir a duração de CADA query individual e de marcos de alto nível,
// SEM otimizar nem mudar comportamento — apenas adicionar medição/log.
//
// Os logs saem no terminal do servidor (`npm run start` / logs de função) no
// formato estável `[perf-trace <tag>] <label> dur=<ms>ms ts=<epoch>`, fáceis de
// filtrar com grep. `tag` distingue a rota ("/pedidos" ou "/orcamentos"), já que
// carregar.ts/metricas.ts são compartilhados entre as duas.

/**
 * Mede `performance.now()` antes/depois de `fn()` e loga a duração.
 * Retorna o resultado de `fn()`. Em erro, loga (com a duração até a falha) e
 * re-lança — não engole exceções, não altera o fluxo de dados.
 */
export async function traced<T>(
  tag: string,
  label: string,
  // Aceita thenables (ex.: query builders do Supabase, que são PromiseLike
  // mas não Promise nativa) sem precisar de cast no chamador.
  fn: () => PromiseLike<T>
): Promise<T> {
  const inicio = performance.now();
  try {
    const resultado = await fn();
    const dur = performance.now() - inicio;
    // eslint-disable-next-line no-console
    console.log(
      `[perf-trace ${tag}] ${label} dur=${dur.toFixed(1)}ms ts=${Date.now()}`
    );
    return resultado;
  } catch (err) {
    const dur = performance.now() - inicio;
    // eslint-disable-next-line no-console
    console.log(
      `[perf-trace ${tag}] ${label} ERRO dur=${dur.toFixed(1)}ms ts=${Date.now()}`
    );
    throw err;
  }
}

/**
 * Loga um marco instantâneo (sem duração) — para pontos como "entrada do RSC"
 * ou "antes do return". Formato: `[perf-trace <tag>] <label> ts=<epoch>`.
 */
export function mark(tag: string, label: string): void {
  // eslint-disable-next-line no-console
  console.log(`[perf-trace ${tag}] ${label} ts=${Date.now()}`);
}
