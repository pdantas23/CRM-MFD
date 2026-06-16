/**
 * Instrumentação de boot/cold-start para Runtime Logs da Vercel.
 *
 * Técnica: módulos ES são avaliados UMA VEZ por instância serverless.
 * A primeira invocação de qualquer função que importe este módulo
 * acontece logo após o bootstrap da instância (cold start).
 * As invocações seguintes compartilham o mesmo módulo já carregado (warm).
 *
 * Compatível com Edge Runtime e Node.js Runtime — sem APIs exclusivas de
 * um ou de outro, sem dependências externas.
 */

// ── Estado de instância (avaliado uma única vez por lambda/edge worker) ───────
// BOOT_AT: timestamp de quando o módulo foi carregado pela primeira vez.
// Usado para calcular "idade da instância" (ms desde boot até a request atual).
const BOOT_AT = Date.now();
let requestCount = 0;

/** Detecta o runtime a partir das globals disponíveis. */
function detectRuntime(): string {
  if (typeof EdgeRuntime !== "undefined") return "edge";
  if (typeof process !== "undefined" && process.versions?.node) return "node";
  return "unknown";
}

const RUNTIME = detectRuntime();

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface PerfContext {
  /** "cold" se é a 1ª request nesta instância; "warm" caso contrário. */
  heat: "cold" | "warm";
  /** Número sequencial da request dentro desta instância (começa em 1). */
  reqN: number;
  /** Runtime detectado: "edge" | "node" | "unknown". */
  runtime: string;
  /** Timestamp de início da request (para calcular latências relativas). */
  startedAt: number;
  /** Pathname da URL (opcional; populado no middleware). */
  pathname?: string;
}

export interface TimingMap {
  [label: string]: number;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Registra o início de uma nova request e retorna um PerfContext.
 * Deve ser chamado uma vez por request no ponto de entrada (ex.: middleware).
 */
export function iniciarRequest(pathname?: string): PerfContext {
  requestCount += 1;
  return {
    heat: requestCount === 1 ? "cold" : "warm",
    reqN: requestCount,
    runtime: RUNTIME,
    startedAt: Date.now(),
    pathname,
  };
}

/**
 * Mede a duração de uma função async e retorna [resultado, duracaoMs].
 * Não captura exceções — a exceção propaga normalmente para o chamador.
 *
 * @example
 * const [user, ms] = await medir(() => supabase.auth.getUser());
 */
export async function medir<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = Date.now();
  const result = await fn();
  return [result, Date.now() - t0];
}

/**
 * Emite uma linha de log com prefixo `[perf-boot]` para os Runtime Logs
 * da Vercel. Inclui heat, reqN, runtime, pathname e todos os timings.
 *
 * Formato:
 *   [perf-boot] heat=cold reqN=1 rt=edge path=/login | getUser=42ms total=45ms
 */
export function emitirLog(
  ctx: PerfContext,
  timings: TimingMap,
  extra?: Record<string, string>
): void {
  const elapsedTotal = Date.now() - ctx.startedAt;

  const base = [
    `heat=${ctx.heat}`,
    `reqN=${ctx.reqN}`,
    `rt=${ctx.runtime}`,
    ctx.pathname ? `path=${ctx.pathname}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const timingStr = Object.entries(timings)
    .map(([k, v]) => `${k}=${v}ms`)
    .join(" ");

  const extraStr = extra
    ? Object.entries(extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";

  const parts = [base, timingStr, extraStr].filter(Boolean);

  // instanceAge: ms desde o boot do módulo até este log — útil para correlacionar
  // com cold start (instanceAge pequeno = instância recém-criada).
  const instanceAge = Date.now() - BOOT_AT;

  // total sempre ao final para facilitar grep de latência
  const linha = `[perf-boot] ${parts.join(" ")} instanceAge=${instanceAge}ms total=${elapsedTotal}ms`;

  console.log(linha);
}

// Garante que a declaração global de EdgeRuntime não quebre o TypeScript.
declare const EdgeRuntime: string | undefined;
