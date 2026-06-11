import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntregaForm, type EntregaPrefill } from "@/components/entregas/EntregaForm";
import type { Profile } from "@/lib/types/database";

function paramString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function NovaEntregaPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if ((profile as Profile | null)?.role !== "admin") {
    redirect("/entregas");
  }

  // Pré-preenchimento opcional vindo da aba Pedidos (query params)
  const prefill: EntregaPrefill = {
    nome_cliente: paramString(searchParams?.nome_cliente),
    cpf_cnpj: paramString(searchParams?.cpf_cnpj),
    numero_orcamento: paramString(searchParams?.numero_orcamento),
    bairro: paramString(searchParams?.bairro),
    endereco: paramString(searchParams?.endereco),
    pedido_id: paramString(searchParams?.pedido_id),
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
