// Suíte HTTP de performance (medição de TTFB end-to-end via servidor Next).
//
// GATING: só executa quando PERF_BASE_URL está definido (ex.:
//   PERF_BASE_URL=http://localhost:3000 npx tsx tests/perf/http.ts
// apontando para `npm run start` já rodando). Sem essa variável → exit 0, sem
// erro — o job server-side e o loop local nunca disparam a suíte por engano.
//
// TTFB medido: performance.now() antes do fetch, subtraído do momento em que
// o primeiro byte do corpo está disponível. Para obter o primeiro byte do corpo
// usamos response.body.getReader().read() — um chunk de 1 byte já é suficiente.
// Se o servidor redirecionar (ex.: middleware de auth redireciona /pedidos para
// /login), o TTFB medido é o da resposta HTTP final da cadeia de redirecionamentos
// que o fetch segue automaticamente (seguindo redirecionamentos por padrão).
// Portanto o tempo inclui N round-trips de redirect + o corpo da página de destino.
// Isso é documentado — não é um bug, é o comportamento real que o usuário sente.
//
// AUTH: se PERF_AUTH_COOKIE estiver definido, é enviado como header Cookie em
// todas as requisições. Isso permite autenticar e medir a rota real em vez do
// redirect para login. Exemplo:
//   PERF_AUTH_COOKIE="sb-xxxx-auth-token=..." npx tsx tests/perf/http.ts
// O cookie não é obrigatório; sem ele o TTFB medido inclui o redirect para login.
//
// Integração com compare.ts: os resultados são comparados com o mesmo
// baseline.json (chaves prefixadas com "http:"). O script pode ser invocado
// diretamente (tsx tests/perf/http.ts) — ele usa rodarCompare() com a lista
// filtrada de cenários HTTP.

import { medir, type Cenario } from "./harness";
import { rodarCompare, tabelaMarkdown } from "./compare";

const BASE = process.env.PERF_BASE_URL?.replace(/\/$/, "");
const AUTH_COOKIE = process.env.PERF_AUTH_COOKIE ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: mede o TTFB de uma URL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mede o TTFB (time-to-first-byte) de uma URL via fetch.
 *
 * Técnica: performance.now() antes do fetch → await response (headers chegaram)
 * → getReader().read() para receber o 1º chunk do corpo. O tempo medido
 * inclui DNS + TCP + TLS + processamento do servidor + envio do 1º chunk.
 * Em rotas autenticadas sem cookie de sessão, inclui redirect(s) para login.
 */
async function medirTtfb(url: string): Promise<void> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
  };
  if (AUTH_COOKIE) headers["Cookie"] = AUTH_COOKIE;

  const resp = await fetch(url, {
    headers,
    redirect: "follow",
  });

  // Drena o 1º chunk do corpo para garantir que o primeiro byte chegou.
  if (resp.body) {
    const reader = resp.body.getReader();
    await reader.read();
    reader.cancel().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cenários HTTP (só criados quando PERF_BASE_URL está definido)
// ─────────────────────────────────────────────────────────────────────────────

function criarCenariosHttp(base: string): Cenario[] {
  const rotas = [
    { nome: "http:ttfb:pedidos", path: "/pedidos" },
    { nome: "http:ttfb:orcamentos", path: "/orcamentos" },
    { nome: "http:ttfb:entregas", path: "/entregas" },
  ];

  return rotas.map(({ nome, path }) => ({
    nome,
    async rodar() {
      await medirTtfb(`${base}${path}`);
    },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrypoint (tsx tests/perf/http.ts)
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!BASE) {
    console.log(
      "[perf:http] PERF_BASE_URL não definido — suíte HTTP pulada (no-op). " +
        "Defina PERF_BASE_URL=http://localhost:3000 para habilitar.\n" +
        "Dica: PERF_AUTH_COOKIE='<cookie>' para autenticar (opcional — sem ele " +
        "o TTFB inclui o redirect para a página de login)."
    );
    return;
  }

  console.log(`[perf:http] Medindo TTFB contra ${BASE} …`);
  if (AUTH_COOKIE) {
    console.log("[perf:http] AUTH_COOKIE presente — requisições autenticadas.");
  } else {
    console.log(
      "[perf:http] PERF_AUTH_COOKIE não definido — TTFB pode incluir redirect para login."
    );
  }

  const cenariosHttp = criarCenariosHttp(BASE);
  const { linhas, regrediu } = await rodarCompare(cenariosHttp);

  console.log(`\n${tabelaMarkdown(linhas)}\n`);

  if (regrediu) {
    console.error("[perf:http] Regressão de TTFB detectada (> baseline × 1.25).");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
