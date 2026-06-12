// Harness de medição de performance (regressão de tempo).
//
// `medir` roda warmups descartados + N execuções, descarta a 1ª (cold/JIT)
// e reporta MEDIANA (gatilho de regressão) e P95 (informativo), via
// performance.now(). Determinístico no sentido de não cachear nada — os
// cenários devem chamar o NÚCLEO CRU das ondas (carregar.ts), nunca a versão
// envolta em comCache, senão as execuções 2..N mediriam ~0ms.

/** Resultado consolidado de uma medição. */
export interface ResultadoMedicao {
  nome: string;
  /** Mediana em ms — gatilho de regressão. */
  mediana: number;
  /** P95 em ms — informativo. */
  p95: number;
  /** Todas as amostras contadas (já sem warmups nem a 1ª descartada). */
  amostras: number[];
}

export interface OpcoesMedir {
  /** Execuções contadas (a 1ª delas ainda é descartada). Default 11. */
  execucoes?: number;
  /** Chamadas de aquecimento, totalmente descartadas. Default 2. */
  warmup?: number;
}

function percentil(amostrasOrdenadas: number[], p: number): number {
  if (amostrasOrdenadas.length === 0) return 0;
  const idx = Math.min(
    amostrasOrdenadas.length - 1,
    Math.ceil((p / 100) * amostrasOrdenadas.length) - 1
  );
  return amostrasOrdenadas[Math.max(0, idx)];
}

function mediana(amostrasOrdenadas: number[]): number {
  const n = amostrasOrdenadas.length;
  if (n === 0) return 0;
  const meio = Math.floor(n / 2);
  return n % 2 === 0
    ? (amostrasOrdenadas[meio - 1] + amostrasOrdenadas[meio]) / 2
    : amostrasOrdenadas[meio];
}

/**
 * Mede o tempo de `fn` repetidamente.
 * - Roda `warmup` chamadas descartadas (aquece conexões/planos do Postgres).
 * - Roda `execucoes` chamadas medidas; DESCARTA a 1ª (ainda fria).
 * - Calcula mediana e p95 sobre as restantes.
 */
export async function medir(
  nome: string,
  fn: () => Promise<unknown>,
  opcoes: OpcoesMedir = {}
): Promise<ResultadoMedicao> {
  const execucoes = opcoes.execucoes ?? 11;
  const warmup = opcoes.warmup ?? 2;

  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  const brutas: number[] = [];
  for (let i = 0; i < execucoes; i++) {
    const t0 = performance.now();
    await fn();
    brutas.push(performance.now() - t0);
  }

  // Descarta a 1ª execução medida (efeito frio remanescente).
  const amostras = brutas.slice(1);
  const ordenadas = [...amostras].sort((a, b) => a - b);

  return {
    nome,
    mediana: mediana(ordenadas),
    p95: percentil(ordenadas, 95),
    amostras,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO DE CENÁRIO (a Fase 2 implementa os cenários seguindo isto)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Um cenário de performance.
 *
 * - `nome`     : rótulo único, casa com a chave em baseline.json.
 * - `preparar` : (opcional) setup único antes das medições (ex.: resolver ids).
 * - `rodar`    : a unidade medida. DEVE chamar o núcleo cru (carregar.ts),
 *                nunca a versão com comCache. Sem efeitos colaterais de escrita.
 * - `pular`    : (opcional) retorna true para marcar SKIPPED (ex.: RPC ausente).
 *                Cenários cuja `rodar` lança erro de "function not found"
 *                (PGRST202/42883) também são tratados como SKIPPED pelo compare.
 */
export interface Cenario {
  nome: string;
  preparar?: () => Promise<void>;
  rodar: () => Promise<void>;
  pular?: () => Promise<boolean> | boolean;
}

/*
EXEMPLO MÍNIMO (molde para a Fase 2 — comentado de propósito):

import { criarClienteTeste, escopoAdminTeste, filtrosDeURL } from "./client";
import { orcamentosOnda } from "@/lib/crm/carregar";

const supabase = criarClienteTeste();

export const exemploOrcamentos30d: Cenario = {
  nome: "orcamentos:lista:30d:admin",
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "orcamentos");
    await orcamentosOnda(supabase, filtros, escopoAdminTeste, 1, true);
  },
  // pular: () => false, // ative para condicionar (ex.: feature flag)
};
*/
