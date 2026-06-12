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

  // Parâmetros de filtro vindos da URL — cap 100 chars no servidor
  const buscaRaw = paramStr(searchParams?.q);
  const busca = buscaRaw ? buscaRaw.slice(0, 100) : undefined;
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

  // Query count-only separada (head:true) — contagem exata sem trafegar linhas
  let countQuery = supabase
    .from("vhsys_orcamentos")
    .select("*", { count: "exact", head: true })
    .eq("lixeira", false);

  // Busca: se inteiro, filtra por numero exato; caso contrário ilike
  if (busca) {
    const qNumero = /^\d+$/.test(busca) ? parseInt(busca, 10) : null;
    if (qNumero !== null) {
      countQuery = countQuery.eq("numero", qNumero);
    } else {
      const escapado = busca.replace(/'/g, "''");
      countQuery = countQuery.or(
        `nome_cliente.ilike.%${escapado}%,vendedor_nome.ilike.%${escapado}%`
      );
    }
  }

  if (filtroSituacao) countQuery = countQuery.eq("situacao_id", Number(filtroSituacao));

  if (profile?.role === "vendedor" && profile.vendedor_id) {
    countQuery = countQuery.eq("vendedor_id_vhsys", profile.vendedor_id);
  } else if (filtroVendedor) {
    countQuery = countQuery.eq("vendedor_id_vhsys", Number(filtroVendedor));
  }

  if (filtroPedidoEmitido === "true") countQuery = countQuery.eq("pedido_emitido", true);
  if (filtroPedidoEmitido === "false") countQuery = countQuery.eq("pedido_emitido", false);
  if (dataInicio) countQuery = countQuery.gte("data_orcamento", dataInicio);
  if (dataFim) countQuery = countQuery.lte("data_orcamento", dataFim);

  // Monta query de dados sem count
  let queryDados = supabase
    .from("vhsys_orcamentos")
    .select(COLUNAS_ORCAMENTO)
    .eq("lixeira", false)
    .order("data_orcamento", { ascending: false })
    .order("numero", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (busca) {
    const qNumero = /^\d+$/.test(busca) ? parseInt(busca, 10) : null;
    if (qNumero !== null) {
      queryDados = queryDados.eq("numero", qNumero);
    } else {
      const escapado = busca.replace(/'/g, "''");
      queryDados = queryDados.or(
        `nome_cliente.ilike.%${escapado}%,vendedor_nome.ilike.%${escapado}%`
      );
    }
  }

  if (filtroSituacao) queryDados = queryDados.eq("situacao_id", Number(filtroSituacao));

  // Filtro de vendedor: admin filtra por qualquer vendedor, vendedor vê só o próprio
  if (profile?.role === "vendedor" && profile.vendedor_id) {
    queryDados = queryDados.eq("vendedor_id_vhsys", profile.vendedor_id);
  } else if (filtroVendedor) {
    queryDados = queryDados.eq("vendedor_id_vhsys", Number(filtroVendedor));
  }

  if (filtroPedidoEmitido === "true") queryDados = queryDados.eq("pedido_emitido", true);
  if (filtroPedidoEmitido === "false") queryDados = queryDados.eq("pedido_emitido", false);
  if (dataInicio) queryDados = queryDados.gte("data_orcamento", dataInicio);
  if (dataFim) queryDados = queryDados.lte("data_orcamento", dataFim);

  const [{ count: totalExato }, { data: orcamentos }] = await Promise.all([
    countQuery,
    queryDados,
  ]);

  const lista = (orcamentos ?? []) as OrcamentoRow[];

  // Contagem exata via query head:true
  const totalRegistros = totalExato ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / POR_PAGINA));

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
          Espelho VHSYS · {totalRegistros} registros
        </p>
      </div>

      <OrcamentosClient
        orcamentos={lista}
        situacoes={situacoes}
        vendedores={vendedores}
        profile={profile}
        totalAproximado={totalRegistros}
        pagina={pagina}
        totalPaginas={totalPaginas}
      />
    </div>
  );
}
