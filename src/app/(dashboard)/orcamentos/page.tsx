import { createClient } from "@/lib/supabase/server";
import { OrcamentosClient } from "@/components/orcamentos/OrcamentosClient";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

// Colunas explícitas — NÃO inclui dados (jsonb) para evitar tráfego desnecessário
const COLUNAS_ORCAMENTO =
  "id, id_vhsys, numero, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, vendedor_nome, valor_total, situacao_id, status_base, origem_situacao, pedido_emitido, data_orcamento, validade, referencia, obs, lixeira";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileData } = user
    ? await supabase.from("profiles").select("role, vendedor_id").eq("id", user.id).single()
    : { data: null };
  const profile = profileData as Profile | null;

  // Parâmetros de filtro vindos da URL
  const busca = paramStr(searchParams?.q);
  const filtroSituacao = paramStr(searchParams?.situacao);
  const filtroVendedor = paramStr(searchParams?.vendedor);
  const filtroPedidoEmitido = paramStr(searchParams?.pedido_emitido);
  const dataInicio = paramStr(searchParams?.data_de);
  const dataFim = paramStr(searchParams?.data_ate);
  const pagina = Math.max(1, Number(paramStr(searchParams?.pagina) ?? "1") || 1);

  // Situações de orçamento + vendedores em paralelo
  const [situacoesRes, vendedoresRes] = await Promise.all([
    supabase
      .from("vhsys_situacoes")
      .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
      .eq("entidade", "orcamentos")
      .eq("lixeira", false)
      .order("ordem"),
    // Vendedores só para admin (para filtro e seleção no novo orçamento)
    profile?.role === "admin"
      ? supabase
          .from("vhsys_vendedores")
          .select("id_vhsys, nome")
          .eq("lixeira", false)
          .order("nome")
      : { data: [] },
  ]);

  const situacoes = ((situacoesRes.data ?? []) as SituacaoRow[]);
  const vendedores = ((vendedoresRes.data ?? []) as { id_vhsys: number; nome: string }[]);

  // Monta query com filtros explícitos (sem coluna dados)
  let query = supabase
    .from("vhsys_orcamentos")
    .select(COLUNAS_ORCAMENTO, { count: "planned" })
    .eq("lixeira", false)
    .order("data_orcamento", { ascending: false })
    .order("numero", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  // Busca em uma linha: nome_cliente, numero (cast) ou vendedor_nome
  if (busca) {
    const escapado = busca.replace(/'/g, "''");
    query = query.or(
      `nome_cliente.ilike.%${escapado}%,vendedor_nome.ilike.%${escapado}%`
    );
  }

  if (filtroSituacao) query = query.eq("situacao_id", Number(filtroSituacao));

  // Filtro de vendedor: admin filtra por qualquer vendedor, vendedor vê só o próprio
  if (profile?.role === "vendedor" && profile.vendedor_id) {
    query = query.eq("vendedor_id_vhsys", profile.vendedor_id);
  } else if (filtroVendedor) {
    query = query.eq("vendedor_id_vhsys", Number(filtroVendedor));
  }

  if (filtroPedidoEmitido === "true") query = query.eq("pedido_emitido", true);
  if (filtroPedidoEmitido === "false") query = query.eq("pedido_emitido", false);
  if (dataInicio) query = query.gte("data_orcamento", dataInicio);
  if (dataFim) query = query.lte("data_orcamento", dataFim);

  const { data: orcamentos, count } = await query;
  const lista = (orcamentos ?? []) as OrcamentoRow[];

  // count "planned" é estimado — exibido como "~N"
  const totalAproximado = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalAproximado / POR_PAGINA));

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Perfil não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Espelho VHSYS · ~{totalAproximado} registros
        </p>
      </div>

      <OrcamentosClient
        orcamentos={lista}
        situacoes={situacoes}
        vendedores={vendedores}
        profile={profile}
        totalAproximado={totalAproximado}
        pagina={pagina}
        totalPaginas={totalPaginas}
      />
    </div>
  );
}
