// Cliente HTTP da API VHSYS v2 — SERVER-ONLY.
// Contratos documentados em docs/vhsys/API_NOTES.md (specs em docs/vhsys/raw/).

const RETRIES = 3;
const BACKOFF_BASE_MS = 500;

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

function config() {
  if (typeof window !== "undefined") {
    throw new Error("Cliente VHSYS não pode ser usado no browser (tokens server-side)");
  }
  const base = process.env.VHSYS_API_BASE ?? "https://api.vhsys.com/v2";
  const accessToken = process.env.VHSYS_ACCESS_TOKEN;
  const secretToken = process.env.VHSYS_SECRET_ACCESS_TOKEN;
  if (!accessToken || !secretToken) {
    throw new Error("VHSYS_ACCESS_TOKEN / VHSYS_SECRET_ACCESS_TOKEN ausentes no ambiente");
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
          "User-Agent": "MFD-CRM/0.1",
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

/** Formata Date no formato aceito por data_modificacao ("YYYY-MM-DD HH:MM:SS"). */
export function formatarDataModificacao(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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
