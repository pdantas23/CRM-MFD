// Utilitário de concorrência controlada (SERVER-ONLY na prática, mas puro).
//
// Executa `fn` sobre cada item com no máximo `limite` execuções SIMULTÂNEAS,
// preservando a ordem dos resultados (resultados[i] corresponde a itens[i]).
// Usado para paralelizar chamadas de rede (VHSYS/Supabase) sem rodar tudo de
// uma vez — evita estourar rate-limit / esgotar conexões que um Promise.all
// cru causaria.

export async function mapComLimite<T, R>(
  itens: readonly T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function worker() {
    // Cada worker puxa o próximo índice livre até a fila esvaziar.
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  }

  const n = Math.max(1, Math.min(limite, itens.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return resultados;
}
