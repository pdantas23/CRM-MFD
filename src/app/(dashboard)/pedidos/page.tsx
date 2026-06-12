import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { PedidosView } from "@/components/pedidos/PedidosView";
import { PerfMarks } from "@/components/pedidos/PerfMarks";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { type Escopo } from "@/lib/crm/metricas";
import { pedidosOnda0, pedidosOnda1, pedidosOnda2 } from "@/lib/crm/carregar";
import { cacheGet, comCache } from "@/lib/crm/cache";
import { traced, mark } from "@/lib/perf/trace";
import type {
  PedidoKanban,
  SituacaoRow,
} from "@/lib/types/pedidos";

export const dynamic = "force-dynamic";

// ── Observabilidade ─────────────────────────────────────────────────────────
// NÃO setamos o header Server-Timing aqui: um Server Component do App Router
// não consegue escrever headers da resposta (a página já está sendo
// renderizada/streamed quando os dados chegam). Middleware tampouco serve — ele
// roda ANTES da página e desconhece a duração das ondas. A observabilidade
// equivalente vem de (1) um console.log estruturado server-side abaixo (visível
// nos logs de função da Vercel) e (2) marcas de User Timing no cliente
// (<PerfMarks />). Caminho limpo no futuro: medir num route handler dedicado.

export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  // Tag de trace por-passo (ver src/lib/perf/trace.ts). Os logs [perf-trace
  // /pedidos] expõem a duração de CADA query/marco no terminal do servidor.
  const traceTag = "/pedidos";
  mark(traceTag, "rsc-entry");

  const t0 = performance.now();
  const supabase = await createClient();

  const { profile } = await traced(traceTag, "auth:getSessaoComProfile", () =>
    getSessaoComProfile()
  );
  const tAuthProfile = performance.now();

  const role = profile?.role;
  const podeEscrever = role === "admin" || role === "vendedor";
  const vendedorId = profile?.vendedor_id ?? null;

  const escopo: Escopo = { role: role ?? "", vendedorId };
  const filtros = parseFiltros(searchParams, "pedidos");

  // ── Onda 0 (apenas quando "só com saldo" ligado) ──────────────────────────
  // O recorte de saldo precisa dos números com saldo>0 ANTES do kanban (para
  // o .in() das colunas), então essa varredura é inevitável nesse cenário.
  // Com o toggle desligado, NENHUM lote de 1000 roda — a RPC cobre as métricas.
  const onda0 = filtros.soComSaldo
    ? await pedidosOnda0(supabase, filtros, escopo, traceTag)
    : null;
  const numerosSaldo = onda0?.numerosSaldo ?? null;
  const dadosPedidos = onda0?.dadosPedidos ?? null;
  const tOnda0 = performance.now();

  // Chave de cache inclui rota, filtros, página-kanban e escopo do usuário
  // (obrigatório para não vazar dados entre usuários em instâncias quentes).
  const chavePedidos = `pedidos|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}`;

  // ── Onda 1: situações, vendedores, métricas e o kanban em UM Promise.all ──
  // Núcleo cru extraído em carregar.ts; aqui apenas envolvido em comCache.
  // Métricas: com toggle ligado reusa os dados pré-carregados (sem nova ida);
  // com desligado, a RPC agrega num único roundtrip (fallback de lotes se a
  // function não existir). dadosPedidos === null → RPC; senão → in-memory.
  // Detecção de cache hit/miss: leitura barata e sem efeito (além da expiração
  // natural) ANTES da chamada. Se já há valor válido, comCache devolverá ele.
  const cacheHit = cacheGet(chavePedidos) !== null;
  const onda1 = await comCache(chavePedidos, 30_000, () =>
    pedidosOnda1(supabase, filtros, escopo, dadosPedidos, numerosSaldo, traceTag)
  );
  const tOnda1 = performance.now();

  const situacoes = onda1.situacoes;
  const vendedores = onda1.vendedores;
  const metricas = onda1.metricas;
  const pedidos = onda1.pedidos;
  const atingiuLimitePorSituacao = onda1.atingiuLimitePorSituacao;

  // ── Onda 2: financeiro + clientes + entregas dos cards visíveis ───────────
  const { financeiro, clientes, entregasVinculadas } = await pedidosOnda2(
    supabase,
    pedidos,
    traceTag
  );
  const tOnda2 = performance.now();

  const financeiroPorPedido = new Map(financeiro.map((f) => [f.pedido_id, f]));
  const clientePorId = new Map(clientes.map((c) => [c.id_vhsys, c]));
  const comEntrega = new Set(
    entregasVinculadas.map((e) => e.pedido_id).filter(Boolean)
  );

  const kanban: PedidoKanban[] = pedidos.map((p) => ({
    ...p,
    financeiro: financeiroPorPedido.get(p.id) ?? null,
    cliente: p.cliente_id_vhsys ? clientePorId.get(p.cliente_id_vhsys) ?? null : null,
    entregaRegistrada: comEntrega.has(p.id),
  }));
  mark(traceTag, "kanban-montado");

  // Nonce de filtro: identidade dos dados que MUDA a cada troca de filtro
  // (len + primeiros ids). Passado ao <PerfMarks> para disparar o marcador
  // client `render-done` em CADA soft navigation. Só medição — não afeta a UI.
  const filterNonce = `${kanban.length}:${kanban
    .slice(0, 5)
    .map((p) => p.id)
    .join(",")}`;

  // ── Timings server-side (wall clock) ────────────────────────────────────────
  // Custo desprezível, sempre ligado. Logs de função são invisíveis ao usuário.
  // SEM PII: apenas durações, role e flags booleanas (nada de nome/id de cliente).
  const round = (ms: number) => Math.round(ms);
  const perf = {
    authProfile: round(tAuthProfile - t0),
    onda0: round(filtros.soComSaldo ? tOnda0 - tAuthProfile : 0),
    onda1: round(tOnda1 - tOnda0),
    onda2: round(tOnda2 - tOnda1),
    serverTotal: round(tOnda2 - t0),
    cache: cacheHit ? "hit" : "miss",
  };
  // eslint-disable-next-line no-console
  console.log(
    `[perf /pedidos] auth_profile=${perf.authProfile}ms onda0=${perf.onda0}ms ` +
      `onda1=${perf.onda1}ms onda2=${perf.onda2}ms server_total=${perf.serverTotal}ms ` +
      `cache=${perf.cache} role=${role ?? "none"} soSaldo=${filtros.soComSaldo}`
  );

  // Instante em que TODOS os dados estão prontos. O gap entre este marco e o fim
  // do Download medido no browser indica custo de RENDER/serialização do RSC.
  mark(traceTag, "data-ready (antes do return)");

  return (
    <div className="p-8">
      <PerfMarks
        server={{
          authProfile: perf.authProfile,
          onda0: perf.onda0,
          onda1: perf.onda1,
          onda2: perf.onda2,
          serverTotal: perf.serverTotal,
          cache: perf.cache,
        }}
        filterNonce={filterNonce}
        filterCount={kanban.length}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Espelho do VHSYS — situações e valores sincronizados.
          {podeEscrever && " Abra um pedido para mover sua situação."}
        </p>
      </div>

      <PedidosView
        situacoes={(situacoes ?? []) as SituacaoRow[]}
        pedidos={kanban}
        podeEscrever={podeEscrever}
        atingiuLimitePorSituacao={atingiuLimitePorSituacao}
        vendedores={(vendedores ?? []) as { id_vhsys: number; nome: string }[]}
        mostrarFiltroVendedor={role !== "vendedor"}
        filtros={filtros}
        metricas={metricas}
      />
    </div>
  );
}
