// Cliente HTTP da API VHSYS v2 — SERVER-ONLY.
// Contratos documentados em docs/vhsys/API_NOTES.md (specs em docs/vhsys/raw/).

import { AsyncLocalStorage } from "node:async_hooks";

const RETRIES = 3;
const BACKOFF_BASE_MS = 500;

// User-Agent enviado à API VHSYS. Genérico por padrão (não embute nome de empresa);
// sobrescrevível por ambiente para identificar a aplicação consumidora.
const USER_AGENT = process.env.APP_USER_AGENT ?? "CRM/0.1";

// ── Redação de segredos em logs/erros ───────────────────────────────────────
// Garante que tokens (headers access-token/secret-access-token) NUNCA apareçam
// em mensagens de erro, logs ou no corpo armazenado em VhsysApiError.
/** Mascara, em qualquer string, ocorrências dos tokens fornecidos. */
function redigirSegredos(texto: string, ...segredos: (string | undefined)[]): string {
  let out = texto;
  for (const s of segredos) {
    if (s && s.length >= 4) out = out.split(s).join("[REDACTED]");
  }
  return out;
}

export interface VhsysPaging {
  total_count: number;
  total: number;
  offset: number;
  limit: number;
  limit_max: number;
}

export interface VhsysEnvelope<T> {
  code: number | string;
  // /situacoes responde "sucesso" (pt-BR); os demais, "success"
  status: string;
  paging?: VhsysPaging;
  data: T;
}

export class VhsysApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "VhsysApiError";
  }
}

// Credenciais da conta VHSYS ativa, injetadas por requisição via AsyncLocalStorage.
// Permite que as funções livres (vhsysGet/vhsysPost/...) operem com as credenciais
// da conta resolvida sem precisar threadá-las por todas as assinaturas.
export interface VhsysTokens {
  accessToken: string;
  secretToken: string;
  apiBase: string;
}

const contextoTokens = new AsyncLocalStorage<VhsysTokens>();

/**
 * Executa `fn` com as credenciais da conta fornecida ativas no contexto.
 * Toda chamada VHSYS feita dentro de `fn` usará esses tokens.
 */
export function runComTokensVhsys<T>(tokens: VhsysTokens, fn: () => Promise<T>): Promise<T> {
  return contextoTokens.run(tokens, fn);
}

function config() {
  if (typeof window !== "undefined") {
    throw new Error("Cliente VHSYS não pode ser usado no browser (tokens server-side)");
  }
  // 1) Contexto da conta ativa (multi-conta) tem prioridade.
  const ctx = contextoTokens.getStore();
  if (ctx) {
    return { base: ctx.apiBase, accessToken: ctx.accessToken, secretToken: ctx.secretToken };
  }
  // 2) Fallback: env global (scripts de manutenção / operação single-conta legada).
  const base = process.env.VHSYS_API_BASE ?? "https://api.vhsys.com/v2";
  const accessToken = process.env.VHSYS_ACCESS_TOKEN;
  const secretToken = process.env.VHSYS_SECRET_ACCESS_TOKEN;
  if (!accessToken || !secretToken) {
    throw new Error(
      "Credenciais VHSYS ausentes: nenhuma conta ativa no contexto e " +
        "VHSYS_ACCESS_TOKEN / VHSYS_SECRET_ACCESS_TOKEN não definidos no ambiente"
    );
  }
  return { base, accessToken, secretToken };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// A API sinaliza "nenhum registro" com HTTP 403 + status:error e uma string
// em data ("Nenhum pedido encontrado!"). Isso é resultado vazio, não erro.
function isEmptyResult(httpStatus: number, body: VhsysEnvelope<unknown> | null): boolean {
  return (
    httpStatus === 403 &&
    body !== null &&
    body.status === "error" &&
    typeof body.data === "string" &&
    /nenhum|encontrad/i.test(body.data)
  );
}

export interface VhsysGetResult<T> {
  data: T[];
  paging: VhsysPaging | null;
}

/**
 * GET tipado contra a API VHSYS. Retorna sempre lista (resultado vazio → []).
 * Retry com backoff exponencial para 429/5xx/erros de rede.
 */
export async function vhsysGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<VhsysGetResult<T>> {
  const { base, accessToken, secretToken } = config();

  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          "access-token": accessToken,
          "secret-access-token": secretToken,
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      });
    } catch (err) {
      lastError = err;
      continue; // erro de rede → retry
    }

    if (res.status === 429 || res.status >= 500) {
      lastError = new VhsysApiError(`VHSYS HTTP ${res.status}`, res.status, null);
      continue; // throttle/instabilidade → retry
    }

    const body = (await res.json().catch(() => null)) as VhsysEnvelope<unknown> | null;

    if (isEmptyResult(res.status, body)) {
      return { data: [], paging: null };
    }

    // Alguns subpaths inexistentes respondem HTTP 200 com code 404 no corpo
    const okCode = body && (Number(body.code) === 200 || Number(body.code) === 201);
    const okStatus = body && (body.status === "success" || body.status === "sucesso");
    if (!res.ok || !body || !okCode || !okStatus) {
      throw new VhsysApiError(
        `VHSYS GET ${path} falhou (HTTP ${res.status}, code ${body?.code})`,
        res.status,
        body
      );
    }

    const data = Array.isArray(body.data) ? (body.data as T[]) : [body.data as T];
    return { data, paging: body.paging ?? null };
  }

  throw lastError instanceof Error
    ? lastError
    : new VhsysApiError("VHSYS: falha após retries", 0, lastError);
}

export const VHSYS_LIMIT_MAX = 250;

/**
 * Percorre todas as páginas de uma listagem (limit máx. 250 + offset),
 * usando paging.total_count como condição de parada.
 */
export async function vhsysGetTodos<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T[]> {
  const todos: T[] = [];
  let offset = 0;
  // trava de segurança: 400 páginas = 100k registros
  for (let page = 0; page < 400; page++) {
    const { data, paging } = await vhsysGet<T>(path, {
      ...params,
      limit: VHSYS_LIMIT_MAX,
      offset,
    });
    todos.push(...data);
    if (!paging || todos.length >= paging.total || data.length === 0) break;
    offset += VHSYS_LIMIT_MAX;
    // pausa de cortesia entre páginas (limite observado: x-ratelimit-limit 10000)
    await sleep(150);
  }
  return todos;
}

/**
 * Formata Date no formato aceito por data_modificacao ("YYYY-MM-DD HH:MM:SS").
 * A API VHSYS interpreta este campo no horário de Brasília (America/Sao_Paulo):
 * os timestamps data_mod_pedido nos exemplos reais (capturado em 2026-06-11)
 * são coerentes com BRT (UTC-3), sem sufixo de fuso — não UTC.
 */
export function formatarDataModificacao(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  // en-CA produz "YYYY-MM-DD, HH:MM:SS" — normalizar para "YYYY-MM-DD HH:MM:SS"
  return fmt.format(d).replace(", ", " ");
}

/** Corrige encoding duplo (UTF-8 lido como latin1) — ex.: "separaÃ§Ã£o" → "separação". */
export function corrigirEncoding(s: string): string {
  if (!/[ÃÂ]/.test(s)) return s;
  try {
    return Buffer.from(s, "latin1").toString("utf8");
  } catch {
    return s;
  }
}

// ── Funções de ESCRITA ─────────────────────────────────────────────────────
// Sem retry automático: mutações são 1 tentativa, timeout 15 s.
// Em escrita, HTTP 403 é ERRO real (não "lista vazia") — lança VhsysApiError.

const TIMEOUT_ESCRITA_MS = 15_000;

function headersEscrita(accessToken: string, secretToken: string): Record<string, string> {
  return {
    "access-token": accessToken,
    "secret-access-token": secretToken,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  };
}

async function vhsysEscrever<T>(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  // Aceita qualquer objeto serializável (não apenas Record<string, unknown>)
  body?: object
): Promise<T> {
  const { base, accessToken, secretToken } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_ESCRITA_MS);

  let res: Response;
  try {
    res = await fetch(base + path, {
      method,
      headers: headersEscrita(accessToken, secretToken),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    // Defesa em profundidade: caso a mensagem de rede ecoe algum token, mascara.
    const msgSeguro = redigirSegredos(msg, accessToken, secretToken);
    throw new VhsysApiError(`VHSYS ${method} ${path} — erro de rede: ${msgSeguro}`, 0, err);
  }
  clearTimeout(timer);

  const parsed = (await res.json().catch(() => null)) as VhsysEnvelope<unknown> | null;
  const okCode = parsed && (Number(parsed.code) === 200 || Number(parsed.code) === 201);
  const okStatus = parsed && (parsed.status === "success" || parsed.status === "sucesso");

  if (!res.ok || !parsed || !okCode || !okStatus) {
    throw new VhsysApiError(
      `VHSYS ${method} ${path} falhou (HTTP ${res.status}, code ${parsed?.code}): ${
        typeof parsed?.data === "string" ? parsed.data : JSON.stringify(parsed?.data)
      }`,
      res.status,
      parsed
    );
  }

  return parsed.data as T;
}

/**
 * POST tipado contra a API VHSYS — sem retry.
 * Lança VhsysApiError se a resposta não for code 200/201 + status success.
 */
export function vhsysPost<T>(path: string, body: object): Promise<T> {
  return vhsysEscrever<T>("POST", path, body);
}

/** PUT tipado contra a API VHSYS — sem retry. */
export function vhsysPut<T>(path: string, body: object): Promise<T> {
  return vhsysEscrever<T>("PUT", path, body);
}

/**
 * DELETE contra a API VHSYS — sem retry.
 * Retorna os dados do envelope (normalmente { id_ped } ou similar).
 */
export function vhsysDelete<T>(path: string): Promise<T> {
  return vhsysEscrever<T>("DELETE", path);
}
