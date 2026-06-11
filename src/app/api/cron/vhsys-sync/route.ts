import { NextRequest, NextResponse } from "next/server";
import { sincronizarEspelho, type ModoSync } from "@/lib/vhsys/sync";

// Polling de sincronização VHSYS → espelho Supabase.
//   GET /api/cron/vhsys-sync                → incremental (data_modificacao)
//   GET /api/cron/vhsys-sync?modo=completo  → reconciliação total (inclui lixeira)
// Protegida por CRON_SECRET (a Vercel envia "Authorization: Bearer <CRON_SECRET>"
// automaticamente nos cron jobs quando a env var existe).

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const modo: ModoSync =
    request.nextUrl.searchParams.get("modo") === "completo" ? "completo" : "incremental";

  const resultados = await sincronizarEspelho(modo);
  const comErro = resultados.filter((r) => r.erro);

  return NextResponse.json(
    { modo, resultados },
    { status: comErro.length > 0 ? 500 : 200 }
  );
}
