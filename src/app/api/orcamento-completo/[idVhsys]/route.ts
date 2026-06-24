// GET /api/orcamento-completo/[idVhsys]
// Retorna os campos de CABEÇALHO do orçamento (que NÃO estão no OrcamentoRow
// enxuto — vivem no jsonb vhsys_orcamentos.dados) já normalizados para
// pré-popular o formulário de emissão de pedido.
//
// RLS: lê o espelho via createClient() (com RLS), de forma que a sessão do
// usuário determina o que pode ver. Sem sessão → 401; não encontrado → 404.
// Segue o mesmo padrão de /api/orcamento-parcelas/[idVhsys]/route.ts.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContaAtiva } from "@/lib/accounts/contexto";

export const dynamic = "force-dynamic";

/** Campos de cabeçalho do orçamento dentro do jsonb `dados`. */
interface DadosOrcamento {
  id_cliente?: number | string;
  nome_cliente?: string;
  vendedor_pedido_id?: number | string;
  vendedor_pedido?: string;
  data_pedido?: string;
  validade_orcamento?: string;
  prazo_orcamento?: number | string;
  referencia_pedido?: string;
  obs_pedido?: string;
  obs_interno_pedido?: string;
  desconto_pedido?: string;
  desconto_pedido_porc?: string;
  frete_pedido?: string;
  frete_por_pedido?: number | string;
  id_transportadora?: number | string;
  transportadora_pedido?: string;
  peso_total_nota?: string;
  peso_total_nota_liq?: string;
  [key: string]: unknown;
}

interface LinhaEspelho {
  dados: DadosOrcamento | null;
  cliente_id_vhsys: number | null;
  nome_cliente: string | null;
  vendedor_id_vhsys: number | null;
  vendedor_nome: string | null;
  referencia: string | null;
  obs: string | null;
}

/** Converte string decimal em number; ausente/inválido → 0. */
function numero(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Converte em id inteiro positivo ou null. */
function idOuNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Normaliza string; ausente → "". */
function texto(v: unknown): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return s.startsWith("0000-00-00") ? "" : s;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { idVhsys: string } }
) {
  const idVhsys = parseInt(params.idVhsys, 10);

  if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
    return NextResponse.json({ erro: "idVhsys inválido." }, { status: 400 });
  }

  // Consulta com RLS ativo — a sessão do usuário determina o que pode ver
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const conta = await getContaAtiva();
  const { data: espelho, error } = await supabase
    .from("vhsys_orcamentos")
    .select("dados, cliente_id_vhsys, nome_cliente, vendedor_id_vhsys, vendedor_nome, referencia, obs")
    .eq("conta_id", conta.id)
    .eq("id_vhsys", idVhsys)
    .single();

  if (error || !espelho) {
    return NextResponse.json({ erro: "Orçamento não encontrado." }, { status: 404 });
  }

  const linha = espelho as unknown as LinhaEspelho;
  const dados: DadosOrcamento = linha.dados ?? {};

  // frete_por é string ("","0","1","9") lida de frete_por_pedido
  const fretePor =
    dados.frete_por_pedido === undefined || dados.frete_por_pedido === null
      ? ""
      : String(dados.frete_por_pedido);

  const resposta = {
    id_cliente: idOuNull(dados.id_cliente) ?? linha.cliente_id_vhsys ?? null,
    nome_cliente: texto(dados.nome_cliente) || texto(linha.nome_cliente),
    vendedor_id: idOuNull(dados.vendedor_pedido_id) ?? linha.vendedor_id_vhsys ?? null,
    vendedor_nome: texto(dados.vendedor_pedido) || texto(linha.vendedor_nome),
    data_pedido: texto(dados.data_pedido),
    prazo_entrega: texto(dados.prazo_orcamento),
    referencia: texto(dados.referencia_pedido) || texto(linha.referencia),
    obs: texto(dados.obs_pedido) || texto(linha.obs),
    obs_interno: texto(dados.obs_interno_pedido),
    desconto_reais: numero(dados.desconto_pedido),
    desconto_porc: numero(dados.desconto_pedido_porc),
    frete_valor: numero(dados.frete_pedido),
    frete_por: fretePor,
    transportadora_id: idOuNull(dados.id_transportadora),
    transportadora_nome: texto(dados.transportadora_pedido),
    peso_bruto: numero(dados.peso_total_nota),
    peso_liq: numero(dados.peso_total_nota_liq),
  };

  return NextResponse.json(resposta);
}
