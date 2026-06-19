import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { EntregaForm, type EntregaPrefill } from "@/components/entregas/EntregaForm";
import { ehAdmin } from "@/lib/auth/roles";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function paramString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function paramUuid(value: string | string[] | undefined): string | undefined {
  const s = paramString(value);
  return s && UUID_RE.test(s) ? s : undefined;
}

export default async function NovaEntregaPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const { profile } = await getSessaoComProfile();

  // Entregador não pode criar entregas; apenas admin e vendedor têm acesso
  const role = profile?.role;
  if (!ehAdmin(role) && role !== "vendedor") {
    redirect("/entregas");
  }

  // Pré-preenchimento opcional vindo da aba Pedidos (query params)
  const pedidoUuid = paramUuid(searchParams?.pedido_id);

  // A partir do pedido: id_vhsys (para a API) e o ORÇAMENTO de origem, resolvido
  // pela referência que o VHSYS grava no pedido (referencia "ORC-{id}" ou a obs
  // "Referência: Orçamento #N"). Assim a entrega criada via card já nasce com o
  // orçamento vinculado.
  let pedidoIdVhsys: number | undefined;
  let orcamentoNumero: number | undefined;
  if (pedidoUuid) {
    const { data: pedidoRow } = await supabase
      .from("vhsys_pedidos")
      .select("id_vhsys, obs, referencia")
      .eq("id", pedidoUuid)
      .single();
    const ped = pedidoRow as
      | { id_vhsys: number; obs: string | null; referencia: string | null }
      | null;
    pedidoIdVhsys = ped?.id_vhsys;

    const refMatch = ped?.referencia?.match(/^ORC-(\d+)$/i);
    const obsMatch = ped?.obs?.match(/or[çc]amento\s*#\s*(\d+)/i);
    if (refMatch) {
      // referencia guarda o id_vhsys do orçamento → buscar o número.
      const { data: orcRow } = await supabase
        .from("vhsys_orcamentos")
        .select("numero")
        .eq("id_vhsys", Number(refMatch[1]))
        .maybeSingle();
      orcamentoNumero = (orcRow as { numero: number } | null)?.numero;
    } else if (obsMatch) {
      orcamentoNumero = Number(obsMatch[1]);
    }
  }

  const prefill: EntregaPrefill = {
    nome_cliente: paramString(searchParams?.nome_cliente),
    cpf_cnpj: paramString(searchParams?.cpf_cnpj),
    numero_orcamento: paramString(searchParams?.numero_orcamento),
    bairro: paramString(searchParams?.bairro),
    endereco: paramString(searchParams?.endereco),
    pedido_id: pedidoUuid,
    pedido_id_vhsys: pedidoIdVhsys,
    orcamento_numero: orcamentoNumero,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nova Entrega</h1>
        <p className="mt-1 text-sm text-gray-500">Preencha os dados abaixo para registrar uma entrega</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <EntregaForm mode="create" prefill={prefill} />
      </div>
    </div>
  );
}
