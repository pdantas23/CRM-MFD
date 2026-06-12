// Motor de comparação de performance: roda os cenários registrados, mede a
// mediana de cada um e compara com baseline.json.
//
// Gatilhos:
//   - mediana > baseline × 1.25  → REGRESSÃO (exit 1).
//   - +10% a +25%                → WARN (não falha).
//   - cenário ausente no baseline (ou baseline vazio/ausente) → ESTABELECER
//     (registra sem falhar — é assim que o baseline nasce no 1º run).
//   - cenário PULADO (pular()=true ou erro "function not found"/PGRST202/42883)
//     → SKIPPED (não falha).
//
// Saídas: tabela markdown no stdout + JSON em tests/perf/.last-run.json.
// Flag --update-baseline regrava baseline.json com as medianas atuais.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { medir, type Cenario } from "./harness";
import { cenarios } from "./cenarios";

const DIR = __dirname;
const CAMINHO_BASELINE = resolve(DIR, "baseline.json");
const CAMINHO_LAST_RUN = resolve(DIR, ".last-run.json");

const LIMITE_REGRESSAO = 1.25; // +25% → falha
const LIMITE_WARN = 1.1; // +10% → warn

export type StatusCenario =
  | "ESTABELECER"
  | "OK"
  | "WARN"
  | "REGRESSAO"
  | "SKIPPED";

export interface LinhaResultado {
  nome: string;
  baseline: number | null;
  atual: number | null;
  deltaMs: number | null;
  deltaPct: number | null;
  status: StatusCenario;
  motivo?: string;
}

type Baseline = Record<string, number>;

function lerBaseline(): Baseline {
  if (!existsSync(CAMINHO_BASELINE)) return {};
  try {
    const txt = readFileSync(CAMINHO_BASELINE, "utf8").trim();
    if (!txt) return {};
    return JSON.parse(txt) as Baseline;
  } catch {
    return {};
  }
}

/** Erro indica RPC/função inexistente no banco → SKIPPED, não falha. */
function ehFuncaoAusente(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("pgrst202") ||
    msg.includes("42883") ||
    msg.includes("function not found") ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  );
}

async function executarCenario(
  cenario: Cenario,
  baseline: Baseline
): Promise<LinhaResultado> {
  // Pulo explícito declarado pelo cenário.
  if (cenario.pular) {
    try {
      if (await cenario.pular()) {
        return base(cenario.nome, baseline, "SKIPPED", "pular() = true");
      }
    } catch (err) {
      return base(cenario.nome, baseline, "SKIPPED", `pular() lançou: ${msg(err)}`);
    }
  }

  try {
    if (cenario.preparar) await cenario.preparar();
    const r = await medir(cenario.nome, cenario.rodar);
    return classificar(cenario.nome, baseline, r.mediana);
  } catch (err) {
    if (ehFuncaoAusente(err)) {
      return base(cenario.nome, baseline, "SKIPPED", `função ausente: ${msg(err)}`);
    }
    // Erro real de execução → REGRESSAO sinalizada (não silencia).
    return base(cenario.nome, baseline, "REGRESSAO", `erro: ${msg(err)}`);
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function base(
  nome: string,
  baseline: Baseline,
  status: StatusCenario,
  motivo?: string
): LinhaResultado {
  const b = nome in baseline ? baseline[nome] : null;
  return { nome, baseline: b, atual: null, deltaMs: null, deltaPct: null, status, motivo };
}

function classificar(nome: string, baseline: Baseline, atual: number): LinhaResultado {
  const b = nome in baseline ? baseline[nome] : null;
  if (b === null || b <= 0) {
    return { nome, baseline: b, atual, deltaMs: null, deltaPct: null, status: "ESTABELECER" };
  }
  const deltaMs = atual - b;
  const deltaPct = (atual / b - 1) * 100;
  let status: StatusCenario = "OK";
  if (atual > b * LIMITE_REGRESSAO) status = "REGRESSAO";
  else if (atual > b * LIMITE_WARN) status = "WARN";
  return { nome, baseline: b, atual, deltaMs, deltaPct, status };
}

function ms(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

function pct(v: number | null): string {
  if (v === null) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(1)}%`;
}

/** Tabela markdown legível para stdout e comentário de PR. */
export function tabelaMarkdown(linhas: LinhaResultado[]): string {
  const head =
    "| Cenário | Baseline (ms) | Atual (ms) | Δ ms | Δ % | Status |\n" +
    "| --- | ---: | ---: | ---: | ---: | --- |";
  if (linhas.length === 0) {
    return `${head}\n| _(nenhum cenário registrado — Fase 2 pendente)_ |  |  |  |  |  |`;
  }
  const body = linhas
    .map(
      (l) =>
        `| ${l.nome} | ${ms(l.baseline)} | ${ms(l.atual)} | ${ms(l.deltaMs)} | ${pct(
          l.deltaPct
        )} | ${l.status}${l.motivo ? ` (${l.motivo})` : ""} |`
    )
    .join("\n");
  return `${head}\n${body}`;
}

export interface ResultadoCompare {
  linhas: LinhaResultado[];
  /** true se houver ao menos uma REGRESSAO (exit 1). */
  regrediu: boolean;
}

/** Executa todos os cenários e devolve o resultado consolidado. */
export async function rodarCompare(
  lista: Cenario[] = cenarios
): Promise<ResultadoCompare> {
  const baseline = lerBaseline();
  const linhas: LinhaResultado[] = [];
  for (const c of lista) {
    linhas.push(await executarCenario(c, baseline));
  }
  const regrediu = linhas.some((l) => l.status === "REGRESSAO");
  return { linhas, regrediu };
}

/** Regrava baseline.json com as medianas atuais (uso manual). */
function regravarBaseline(linhas: LinhaResultado[]): void {
  const novo: Baseline = lerBaseline();
  for (const l of linhas) {
    if (l.atual !== null) novo[l.nome] = Number(l.atual.toFixed(2));
  }
  writeFileSync(CAMINHO_BASELINE, `${JSON.stringify(novo, null, 2)}\n`, "utf8");
}

/** Persiste o último run em JSON para inspeção/CI. */
function persistirLastRun(linhas: LinhaResultado[]): void {
  writeFileSync(
    CAMINHO_LAST_RUN,
    `${JSON.stringify({ geradoEm: new Date().toISOString(), linhas }, null, 2)}\n`,
    "utf8"
  );
}

/** Entrypoint CLI (tsx tests/perf/compare.ts [--update-baseline]). */
export async function main(): Promise<void> {
  const atualizar = process.argv.includes("--update-baseline");
  const { linhas, regrediu } = await rodarCompare();

  persistirLastRun(linhas);
  console.log(tabelaMarkdown(linhas));

  if (atualizar) {
    regravarBaseline(linhas);
    console.log("\nbaseline.json atualizado com as medianas atuais.");
    return; // ao atualizar baseline, não falhamos por regressão
  }

  if (regrediu) {
    console.error("\nRegressão de performance detectada (> baseline × 1.25).");
    process.exit(1);
  }
}

// Execução direta via tsx (não quando importado pelo Vitest).
const ehEntrypointDireto =
  typeof require !== "undefined" && require.main === module;
if (ehEntrypointDireto) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
