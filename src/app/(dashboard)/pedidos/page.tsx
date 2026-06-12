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

// Pedidos do fluxo ativo entram todos; "Entregue" (777) é limitado aos
// mais recentes para não inflar o quadro com o histórico inteiro.
const LIMITE_ENTREGUES = 50;

export default async function PedidosPage() {
  const supabase = await createClient();

  // Determina se o usuário é admin para exibir controles de escrita
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = (profile as Profile | null)?.role === "admin";

  const { data: situacoes } = await supabase
    .from("vhsys_situacoes")
    .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
    .eq("entidade", "pedidos")
    .eq("lixeira", false)
    .order("ordem");

  const colunasAtivas = COLUNAS_KANBAN.filter((id) => id !== SITUACAO.ENTREGUE);

  // Colunas explícitas — exclui `dados` (jsonb volumoso) e demais não usados
  // pelo Kanban/modal (frete, desconto, data_cad_vhsys, sincronizado_em).
  const COLS_PEDIDO =
    "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, " +
    "vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, " +
    "data_pedido, prazo_entrega, referencia, obs, data_mod_vhsys, lixeira";

  const [{ data: ativos }, { data: entregues }] = await Promise.all([
    supabase
      .from("vhsys_pedidos")
      .select(COLS_PEDIDO)
      .eq("lixeira", false)
      .in("situacao_id", colunasAtivas)
      .order("data_pedido", { ascending: false }),
    supabase
      .from("vhsys_pedidos")
      .select(COLS_PEDIDO)
      .eq("lixeira", false)
      .eq("situacao_id", SITUACAO.ENTREGUE)
      .order("data_mod_vhsys", { ascending: false })
      .limit(LIMITE_ENTREGUES),
  ]);

  const pedidos: PedidoRow[] = [
    ...((ativos ?? []) as unknown as PedidoRow[]),
    ...((entregues ?? []) as unknown as PedidoRow[]),
  ];
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Espelho do VHSYS — situações e valores sincronizados.
          {isAdmin && " Abra um pedido para mover sua situação."}
        </p>
      </div>

      <PedidosView
        situacoes={(situacoes ?? []) as SituacaoRow[]}
        pedidos={kanban}
        isAdmin={isAdmin}
      />
    </div>
  );
}
