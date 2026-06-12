import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { PedidosView } from "@/components/pedidos/PedidosView";
import { parseFiltros, type SearchParamsLike } from "@/lib/crm/filtros";
import { type Escopo } from "@/lib/crm/metricas";
import { pedidosOnda0, pedidosOnda1, pedidosOnda2 } from "@/lib/crm/carregar";
import { comCache } from "@/lib/crm/cache";
import type {
  PedidoKanban,
  SituacaoRow,
} from "@/lib/types/pedidos";

export const dynamic = "force-dynamic";

export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const supabase = await createClient();

  const { profile } = await getSessaoComProfile();

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
    ? await pedidosOnda0(supabase, filtros, escopo)
    : null;
  const numerosSaldo = onda0?.numerosSaldo ?? null;
  const dadosPedidos = onda0?.dadosPedidos ?? null;

  // Chave de cache inclui rota, filtros, página-kanban e escopo do usuário
  // (obrigatório para não vazar dados entre usuários em instâncias quentes).
  const chavePedidos = `pedidos|${escopo.role}|${escopo.vendedorId ?? ""}|${JSON.stringify(filtros)}`;

  // ── Ondas 1+2 juntas no mesmo comCache ────────────────────────────────────
  // Cache hit pula AMBAS as ondas (kanban + financeiro/clientes/entregas).
  // Métricas: com toggle ligado reusa os dados pré-carregados (sem nova ida);
  // com desligado, a RPC agrega num único roundtrip (fallback de lotes se a
  // function não existir). dadosPedidos === null → RPC; senão → in-memory.
  const { onda1, onda2 } = await comCache(chavePedidos, 30_000, async () => {
    const onda1 = await pedidosOnda1(supabase, filtros, escopo, dadosPedidos, numerosSaldo);
    const onda2 = await pedidosOnda2(supabase, onda1.pedidos);
    return { onda1, onda2 };
  });

  const situacoes = onda1.situacoes;
  const vendedores = onda1.vendedores;
  const metricas = onda1.metricas;
  const pedidos = onda1.pedidos;
  const atingiuLimitePorSituacao = onda1.atingiuLimitePorSituacao;

  // ── Onda 2: financeiro + clientes + entregas (resultado do cache) ─────────
  const { financeiro, clientes, entregasVinculadas } = onda2;

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

  return (
    <div className="p-8">
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
