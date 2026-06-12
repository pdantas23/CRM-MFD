import { createClient } from "@/lib/supabase/server";
import { PedidosView } from "@/components/pedidos/PedidosView";
import { COLUNAS_KANBAN, SITUACAO } from "@/lib/vhsys/fluxo";
import type {
  ClientePrefillRow,
  FinanceiroPedidoRow,
  PedidoKanban,
  PedidoRow,
  SituacaoRow,
} from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

// Limite de pedidos por coluna no Kanban
const LIMITE_POR_COLUNA = 50;

// Colunas mínimas para Kanban (excluindo dados jsonb)
const COLS_PEDIDO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, " +
  "vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, " +
  "data_pedido, prazo_entrega, referencia, obs, data_mod_vhsys, lixeira";

interface SearchParams {
  q?: string;
  vendedor?: string;
  data_de?: string;
  data_ate?: string;
  valor_min?: string;
  valor_max?: string;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createClient();

  // Determina se o usuário pode escrever (admin ou vendedor)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, vendedor_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const role = (profile as Profile | null)?.role;
  const podeEscrever = role === "admin" || role === "vendedor";
  const vendedorId = (profile as { vendedor_id?: number | null } | null)?.vendedor_id ?? null;

  const { data: situacoes } = await supabase
    .from("vhsys_situacoes")
    .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
    .eq("entidade", "pedidos")
    .eq("lixeira", false)
    .order("ordem");

  // Parseia filtros da URL — A2: sanear q (cap 100 chars, escape aspas simples)
  const qRaw = searchParams?.q?.trim() ?? "";
  const q = qRaw.slice(0, 100).replace(/'/g, "''");
  const vendedorFiltro = searchParams?.vendedor ?? "";
  const dataDe = searchParams?.data_de ?? "";
  const dataAte = searchParams?.data_ate ?? "";
  const valorMinStr = searchParams?.valor_min ?? "";
  const valorMaxStr = searchParams?.valor_max ?? "";
  const valorMin = valorMinStr !== "" ? parseFloat(valorMinStr) : null;
  const valorMax = valorMaxStr !== "" ? parseFloat(valorMaxStr) : null;

  // Número de pedido: se q for inteiro positivo, filtra por numero
  const qNumero = /^\d+$/.test(q) ? parseInt(q, 10) : null;

  /** Aplica filtros comuns a uma query Supabase já encadeada (PostgrestFilterBuilder) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aplicarFiltros(query: any): any {
    let q2 = query;
    if (q !== "") {
      if (qNumero !== null) {
        q2 = q2.eq("numero", qNumero);
      } else {
        // Busca por nome_cliente ou vendedor_nome (ilike)
        q2 = q2.or(`nome_cliente.ilike.%${q}%,vendedor_nome.ilike.%${q}%`);
      }
    }
    if (vendedorFiltro !== "") {
      q2 = q2.eq("vendedor_id_vhsys", parseInt(vendedorFiltro, 10));
    }
    if (dataDe !== "") q2 = q2.gte("data_pedido", dataDe);
    if (dataAte !== "") q2 = q2.lte("data_pedido", dataAte);
    if (valorMin !== null && !isNaN(valorMin)) q2 = q2.gte("valor_total", valorMin);
    if (valorMax !== null && !isNaN(valorMax)) q2 = q2.lte("valor_total", valorMax);
    // C2: vendedor sem vendedor_id nunca deve ver dados alheios
    if (role === "vendedor") {
      // Se vendedor_id é NULL o perfil está mal configurado — retorna zero resultados
      // usando um eq impossível em vez de omitir o filtro silenciosamente.
      q2 = q2.eq("vendedor_id_vhsys", vendedorId ?? -1);
    }
    return q2;
  }

  // Queries paralelas por coluna com limit 50 cada
  const colunasAtivas = COLUNAS_KANBAN.filter((id) => id !== SITUACAO.ENTREGUE);

  const consultasColunas = colunasAtivas.map((situacaoId) =>
    aplicarFiltros(
      supabase
        .from("vhsys_pedidos")
        .select(COLS_PEDIDO)
        .eq("lixeira", false)
        .eq("situacao_id", situacaoId)
        .order("data_pedido", { ascending: false })
        .limit(LIMITE_POR_COLUNA)
    )
  );

  const consultaEntregues = aplicarFiltros(
    supabase
      .from("vhsys_pedidos")
      .select(COLS_PEDIDO)
      .eq("lixeira", false)
      .eq("situacao_id", SITUACAO.ENTREGUE)
      .order("data_mod_vhsys", { ascending: false })
      .limit(LIMITE_POR_COLUNA)
  );

  // Executa tudo em paralelo
  const resultados = await Promise.all([...consultasColunas, consultaEntregues]);

  // Mapeia quantos chegaram no limite (para mostrar botão "Carregar mais")
  const atingiuLimitePorSituacao: Record<number, boolean> = {};
  colunasAtivas.forEach((id, idx) => {
    atingiuLimitePorSituacao[id] = (resultados[idx].data?.length ?? 0) >= LIMITE_POR_COLUNA;
  });
  atingiuLimitePorSituacao[SITUACAO.ENTREGUE] =
    (resultados[resultados.length - 1].data?.length ?? 0) >= LIMITE_POR_COLUNA;

  const pedidos: PedidoRow[] = resultados.flatMap(
    (r) => (r.data ?? []) as unknown as PedidoRow[]
  );

  const pedidoIds = pedidos.map((p) => p.id);
  const clienteIds = Array.from(
    new Set(pedidos.map((p) => p.cliente_id_vhsys).filter((x): x is number => !!x))
  );

  const [{ data: financeiro }, { data: clientes }, { data: entregasVinculadas }] =
    await Promise.all([
      pedidoIds.length
        ? supabase
            .from("vhsys_pedidos_financeiro")
            .select("*")
            .in("pedido_id", pedidoIds)
        : Promise.resolve({ data: [] as FinanceiroPedidoRow[] }),
      clienteIds.length
        ? supabase
            .from("vhsys_clientes")
            .select("id_vhsys, cnpj_cpf, bairro, endereco, numero")
            .in("id_vhsys", clienteIds)
        : Promise.resolve({ data: [] as ClientePrefillRow[] }),
      pedidoIds.length
        ? supabase.from("entregas").select("pedido_id").in("pedido_id", pedidoIds)
        : Promise.resolve({ data: [] as { pedido_id: string | null }[] }),
    ]);

  const financeiroPorPedido = new Map(
    (financeiro ?? []).map((f: FinanceiroPedidoRow) => [f.pedido_id, f])
  );
  const clientePorId = new Map(
    (clientes ?? []).map((c: ClientePrefillRow) => [c.id_vhsys, c])
  );
  const comEntrega = new Set(
    (entregasVinculadas ?? []).map((e) => e.pedido_id).filter(Boolean)
  );

  const kanban: PedidoKanban[] = pedidos.map((p) => ({
    ...p,
    financeiro: financeiroPorPedido.get(p.id) ?? null,
    cliente: p.cliente_id_vhsys ? clientePorId.get(p.cliente_id_vhsys) ?? null : null,
    entregaRegistrada: comEntrega.has(p.id),
  }));

  // Lista de vendedores para o filtro (apenas admin/entregador vêem o dropdown)
  const { data: vendedores } =
    role !== "vendedor"
      ? await supabase
          .from("vhsys_vendedores")
          .select("id_vhsys, nome")
          .order("nome")
      : { data: [] };

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
      />
    </div>
  );
}
