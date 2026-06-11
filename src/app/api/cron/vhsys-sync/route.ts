import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sincronizarEspelho, type ModoSync } from "@/lib/vhsys/sync";

// Polling de sincronização VHSYS → espelho Supabase.
//
// Modos disponíveis (em ordem de precedência):
//   1. ?modo=completo            → reconciliação total (inclui lixeira)
//   2. header x-vercel-cron-schedule presente e horário noturno (UTC 3 h)
//      → completo automaticamente (usado pelo cron diário no plano Pro com dois agendamentos)
//   3. padrão                    → incremental (data_modificacao)
//
// Configuração vercel.json (Hobby — 1 cron/dia):
//   { "path": "/api/cron/vhsys-sync", "schedule": "0 6 * * *" }   ← 03:00 BRT (UTC-3)
//
// Configuração vercel.json (Pro — 2 crons):
//   { "path": "/api/cron/vhsys-sync",              "schedule": "*/10 * * * *" }  ← incremental
//   { "path": "/api/cron/vhsys-sync?modo=completo","schedule": "0 6 * * *"    }  ← diário completo
//
// Protegida por CRON_SECRET (a Vercel envia "Authorization: Bearer <CRON_SECRET>"
// automaticamente nos cron jobs quando a env var existe).

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

  // Modo explícito via query string tem prioridade máxima.
  // Fallback: o cron diário noturno (schedule "0 6 * * *") é reconhecido pelo
  // header x-vercel-cron-schedule e executa reconciliação completa.
  const scheduleHeader = request.headers.get("x-vercel-cron-schedule");
  const modoQuery = request.nextUrl.searchParams.get("modo");
  const modo: ModoSync =
    modoQuery === "completo" || scheduleHeader === "0 6 * * *" ? "completo" : "incremental";

  try {
    const resultados = await sincronizarEspelho(modo);
    const comErro = resultados.filter((r) => r.erro);
    return NextResponse.json(
      { modo, resultados },
      { status: comErro.length > 0 ? 500 : 200 }
    );
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
