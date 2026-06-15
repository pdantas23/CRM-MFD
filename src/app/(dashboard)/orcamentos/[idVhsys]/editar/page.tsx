import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { NovoOrcamentoPageForm } from "@/components/orcamentos/NovoOrcamentoPageForm";
import type { IniciaisOrcamento } from "@/components/orcamentos/NovoOrcamentoPageForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { idVhsys: string };
}

export default async function EditarOrcamentoPage({ params }: PageProps) {
  const supabase = await createClient();
  const { profile } = await getSessaoComProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin" && profile.role !== "vendedor") {
    redirect("/orcamentos");
  }

  const idVhsys = Number(params.idVhsys);
  if (!Number.isInteger(idVhsys) || idVhsys <= 0) {
    notFound();
  }

  // Carrega o orçamento do espelho com RLS
  const { data: orc, error } = await supabase
    .from("vhsys_orcamentos")
    .select("*, dados")
    .eq("id_vhsys", idVhsys)
    .single();

  if (error || !orc) {
    notFound();
  }

  // Permissão: admin sempre; vendedor só se for o autor
  if (
    profile.role === "vendedor" &&
    profile.vendedor_id !== (orc as { vendedor_id_vhsys: number | null }).vendedor_id_vhsys
  ) {
    redirect("/orcamentos");
  }

  // Orçamento emitido não pode ser editado
  if ((orc as { pedido_emitido: boolean }).pedido_emitido) {
    redirect("/orcamentos");
  }

  // Carrega vendedores (somente para admin)
  const vendedores: { id_vhsys: number; nome: string }[] =
    profile.role === "admin"
      ? ((
          await supabase
            .from("vhsys_vendedores")
            .select("id_vhsys, nome")
            .eq("lixeira", false)
            .order("nome")
        ).data ?? [])
      : [];

  // Monta iniciais a partir das colunas e do dados jsonb
  const row = orc as {
    nome_cliente: string;
    cliente_id_vhsys: number | null;
    vendedor_id_vhsys: number | null;
    data_orcamento: string | null;
    validade: string | null;
    referencia: string | null;
    obs: string | null;
    numero: number;
    dados: Record<string, unknown> | null;
  };

  const dados = (row.dados ?? {}) as Record<string, unknown>;

  const iniciais: Partial<IniciaisOrcamento> = {
    nomeCliente: row.nome_cliente ?? "",
    idCliente: row.cliente_id_vhsys ?? undefined,
    vendedorId: row.vendedor_id_vhsys ?? undefined,
    dataOrcamento: row.data_orcamento ?? "",
    validade: row.validade ?? "",
    referencia: row.referencia ?? "",
    obs: row.obs ?? "",
    obsInterno: String(dados.obs_interno_pedido ?? ""),
    descontoReais: Number(dados.desconto_pedido) || 0,
    descontoPorc: Number(dados.desconto_pedido_porc) || 0,
    freteValor: Number(dados.frete_pedido) || 0,
    fretePor: dados.frete_por_pedido !== undefined && dados.frete_por_pedido !== null
      ? (String(dados.frete_por_pedido) as "" | "0" | "1" | "9")
      : "",
    transportadoraId: dados.id_transportadora ? Number(dados.id_transportadora) : undefined,
    transportadoraNome: String(dados.transportadora_pedido ?? ""),
    pesoBruto: Number(dados.peso_total_nota) || 0,
    pesoLiq: Number(dados.peso_total_nota_liq) || 0,
    prazoEntrega: dados.prazo_orcamento !== undefined && dados.prazo_orcamento !== null
      ? String(dados.prazo_orcamento)
      : "",
  };

  const numero = row.numero;

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Editar orçamento #{numero}
        </h1>
      </div>
      <NovoOrcamentoPageForm
        profile={profile}
        vendedores={vendedores}
        proximoNumero={numero}
        modoEdicao
        orcamentoIdVhsys={idVhsys}
        numeroExistente={numero}
        iniciais={iniciais}
      />
    </div>
  );
}
