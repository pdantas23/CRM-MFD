import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sincronizarEspelho, type ModoSync } from "@/lib/vhsys/sync";
import { listarContasAtivas, getTokensPorSlug } from "@/lib/accounts/repo";
import { atualizarNomeEmpresa } from "@/lib/vhsys/empresa";
import { mapComLimite } from "@/lib/concorrencia";

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

// Contas processadas em paralelo. Cada conta usa credenciais VHSYS PRÓPRIAS
// (empresas distintas → rate-limits independentes), então a paralelização entre
// contas não soma no mesmo bucket VHSYS; o limite existe só para não esgotar
// conexões Supabase / memória da função.
const LIMITE_CONTAS = 3;

type ResultadoConta = { conta: string; resultados: unknown[]; erro?: string };

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

  const inicio = Date.now();
  try {
    // Sincroniza as contas ativas em PARALELO com concorrência limitada. Cada
    // conta tem credenciais VHSYS próprias (rate-limits separados), então a
    // paralelização não estoura o rate-limit da VHSYS.
    const contas = await listarContasAtivas();
    console.info(`[cron vhsys-sync] início modo=${modo} contas=${contas.length}`);

    const porConta: ResultadoConta[] = await mapComLimite(
      contas,
      LIMITE_CONTAS,
      async (conta): Promise<ResultadoConta> => {
        try {
          const tokens = await getTokensPorSlug(conta.slug);
          if (!tokens) {
            console.error(`[cron vhsys-sync] conta=${conta.slug} credenciais ausentes`);
            return { conta: conta.slug, resultados: [], erro: "credenciais ausentes" };
          }
          const resultados = await sincronizarEspelho(modo, {
            id: conta.id,
            slug: conta.slug,
            tokens,
          });
          // Atualiza o nome da empresa (cacheado em accounts) a partir do VHSYS.
          await atualizarNomeEmpresa({ id: conta.id, tokens });

          // Erros por entidade não estouram exceção (sync.ts os coleta em cada
          // ResultadoEntidade) — logamos cada um para diagnóstico nos logs Vercel.
          const errosEntidade = (resultados as { entidade: string; erro?: string }[]).filter(
            (r) => r.erro
          );
          for (const e of errosEntidade) {
            console.error(
              `[cron vhsys-sync] conta=${conta.slug} entidade=${e.entidade} erro: ${e.erro}`
            );
          }
          if (!errosEntidade.length) {
            console.info(
              `[cron vhsys-sync] conta=${conta.slug} ok (${resultados.length} entidades)`
            );
          }
          return { conta: conta.slug, resultados };
        } catch (err) {
          const mensagem = err instanceof Error ? err.message : String(err);
          console.error(`[cron vhsys-sync] conta=${conta.slug} FALHOU: ${mensagem}`);
          return { conta: conta.slug, resultados: [], erro: mensagem };
        }
      }
    );

    // Classificação por conta:
    //  - FALHA TOTAL: nem chegou a sincronizar (c.erro) OU todas as entidades
    //    falharam. É o único caso que conta como "conta falha".
    //  - ERRO PARCIAL: sincronizou, mas alguma entidade falhou (ex.: um endpoint
    //    do VHSYS intermitente/instável). NÃO derruba o cron — a sincronização
    //    das demais entidades vale, e o motivo fica nos logs e no corpo.
    const falhouPorCompleto = (c: ResultadoConta): boolean => {
      if (c.erro) return true;
      const ents = c.resultados as { erro?: string }[];
      return ents.length > 0 && ents.every((r) => r.erro);
    };
    const temAlgumErro = (c: ResultadoConta): boolean =>
      Boolean(c.erro) || (c.resultados as { erro?: string }[]).some((r) => r.erro);

    const contasFalhaTotal = porConta.filter(falhouPorCompleto).length;
    const contasErroParcial = porConta.filter(
      (c) => temAlgumErro(c) && !falhouPorCompleto(c)
    ).length;

    // Só devolve 500 (alerta real) se TODAS as contas falharam por completo.
    const todasFalharam = contas.length > 0 && contasFalhaTotal === contas.length;
    const status = todasFalharam ? 500 : 200;
    const ms = Date.now() - inicio;
    console.info(
      `[cron vhsys-sync] fim modo=${modo} contas=${contas.length} ` +
        `ok=${contas.length - contasFalhaTotal} falhaTotal=${contasFalhaTotal} ` +
        `erroParcial=${contasErroParcial} status=${status} ${ms}ms`
    );
    return NextResponse.json(
      {
        modo,
        ok: contas.length - contasFalhaTotal,
        falhaTotal: contasFalhaTotal,
        erroParcial: contasErroParcial,
        contas: porConta,
      },
      { status }
    );
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(`[cron vhsys-sync] FALHA GERAL modo=${modo}: ${mensagem}`);
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
