// POST /api/mcp — servidor MCP para IA externa (Streamable HTTP sem sessão,
// respostas em JSON). Consulta e altera margem; a única escrita é `alterar_margem`. Autenticado por "Authorization: Bearer <token>";
// o ambiente guarda só o SHA-256 do token (MCP_TOKEN_HASH). Trocar o hash revoga.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ErroFerramenta, FERRAMENTAS } from "@/lib/mcp/ferramentas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERSOES = ["2025-06-18", "2025-03-26"];
const MAX_POR_MINUTO = 60;

function tokenValido(authHeader: string | null): boolean {
  const esperado = process.env.MCP_TOKEN_HASH?.trim().toLowerCase();
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!esperado || !token) return false;
  const a = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Limite por instância: contém abuso de um token vazado, não é uma cota exata.
let janela = { inicio: 0, total: 0 };
function dentroDoLimite(): boolean {
  const agora = Date.now();
  if (agora - janela.inicio > 60_000) janela = { inicio: agora, total: 0 };
  janela.total += 1;
  return janela.total <= MAX_POR_MINUTO;
}

const resposta = (id: unknown, result: unknown) => NextResponse.json({ jsonrpc: "2.0", id, result });
const erroRpc = (id: unknown, code: number, message: string, status = 200) =>
  NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
const textoResultado = (texto: string, isError: boolean) => ({ content: [{ type: "text", text: texto }], isError });

export async function POST(req: NextRequest) {
  // Clientes MCP não são navegadores; Origin indica chamada vinda de uma página.
  if (req.headers.get("origin")) return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  if (!tokenValido(req.headers.get("authorization"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  if (!dentroDoLimite()) return NextResponse.json({ erro: "Muitas requisições." }, { status: 429 });

  let msg: { id?: unknown; method?: unknown; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return erroRpc(null, -32700, "JSON inválido.", 400);
  }
  if (!msg || typeof msg !== "object" || Array.isArray(msg) || typeof msg.method !== "string") {
    return erroRpc(msg?.id, -32600, "Requisição inválida.", 400);
  }

  const { id, method, params } = msg;
  if (id === undefined) return new NextResponse(null, { status: 202 }); // notificação

  switch (method) {
    case "initialize": {
      const pedida = params?.protocolVersion;
      return resposta(id, {
        protocolVersion: typeof pedida === "string" && VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: {} },
        serverInfo: { name: "crm-mfd", version: "1.0.0" },
      });
    }
    case "ping":
      return resposta(id, {});
    case "tools/list":
      return resposta(id, { tools: FERRAMENTAS.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })) });
    case "tools/call": {
      const ferramenta = FERRAMENTAS.find((f) => f.name === params?.name);
      if (!ferramenta) return erroRpc(id, -32602, "Ferramenta desconhecida.");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      console.info(`[mcp] ${ferramenta.name} ${JSON.stringify(args).slice(0, 200)}`);
      try {
        return resposta(id, textoResultado(JSON.stringify(await ferramenta.executar(args)), false));
      } catch (e) {
        if (e instanceof ErroFerramenta) return resposta(id, textoResultado(e.message, true));
        console.error(`[mcp] ${ferramenta.name} falhou`, e);
        return resposta(id, textoResultado("Falha interna ao consultar o CRM.", true));
      }
    }
    default:
      return erroRpc(id, -32601, "Método não suportado.");
  }
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
