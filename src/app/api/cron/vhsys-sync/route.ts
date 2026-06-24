import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sincronizarEspelho, type ModoSync } from "@/lib/vhsys/sync";
import { listarContasAtivas, getTokensPorSlug } from "@/lib/accounts/repo";
import { atualizarNomeEmpresa } from "@/lib/vhsys/empresa";

// Polling de sincronização VHSYS → espelho Supabase, para TODAS as contas ativas.
//
// Modo (via query string):
//   ?modo=completo → reconciliação total (inclui lixeira)
//   (sem o parâmetro) → incremental (data_modificacao)
//
// Configuração vercel.json (Hobby — 1 cron/dia, reconciliação completa):
//   { "path": "/api/cron/vhsys-sync?modo=completo", "schedule": "0 6 * * *" }  ← 03:00 BRT
//
// Configuração vercel.json (Pro — 2 crons):
//   { "path": "/api/cron/vhsys-sync",               "schedule": "*/10 * * * *" }  ← incremental
//   { "path": "/api/cron/vhsys-sync?modo=completo", "schedule": "0 6 * * *"    }  ← diário completo
//
// Cada conta é sincronizada EM SÉRIE (rate-limit VHSYS). Protegida por CRON_SECRET
// (a Vercel envia "Authorization: Bearer <CRON_SECRET>" automaticamente).

export const maxDuration = 300;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bearerValido(authHeader: string | null, secret: string): boolean {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;
  // timingSafeEqual exige buffers de mesmo comprimento — checar antes para
  // evitar erro de runtime sem vazar timing sobre qual parte diverge.
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !bearerValido(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Modo explícito via query string. O cron de reconciliação completa usa o
  // path "/api/cron/vhsys-sync?modo=completo" (configurado em vercel.json);
  // sem o parâmetro, roda incremental.
  const modo: ModoSync =
    request.nextUrl.searchParams.get("modo") === "completo" ? "completo" : "incremental";

  try {
    // Sincroniza TODAS as contas ativas EM SÉRIE (evita estourar o rate-limit
    // da VHSYS rodando múltiplas contas em paralelo).
    const contas = await listarContasAtivas();
    const porConta: Array<{ conta: string; resultados: unknown[]; erro?: string }> = [];

    for (const conta of contas) {
      try {
        const tokens = await getTokensPorSlug(conta.slug);
        if (!tokens) {
          porConta.push({ conta: conta.slug, resultados: [], erro: "credenciais ausentes" });
          continue;
        }
        const resultados = await sincronizarEspelho(modo, {
          id: conta.id,
          slug: conta.slug,
          tokens,
        });
        // Atualiza o nome da empresa (cacheado em accounts) a partir do VHSYS.
        await atualizarNomeEmpresa({ id: conta.id, tokens });
        porConta.push({ conta: conta.slug, resultados });
      } catch (err) {
        porConta.push({
          conta: conta.slug,
          resultados: [],
          erro: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const comErro = porConta.some(
      (c) => c.erro || (c.resultados as { erro?: string }[]).some((r) => r.erro)
    );
    return NextResponse.json({ modo, contas: porConta }, { status: comErro ? 500 : 200 });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
