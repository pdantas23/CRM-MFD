import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { redirect } from "next/navigation";
import { NovoOrcamentoPageForm } from "@/components/orcamentos/NovoOrcamentoPageForm";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage() {
  const supabase = await createClient();
  const { profile } = await getSessaoComProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin" && profile.role !== "vendedor") {
    redirect("/orcamentos");
  }

  // Carrega vendedores (somente para admin; vendedor usa o próprio id)
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

  // Estimativa do próximo número de orçamento (espelho local).
  // O número DEFINITIVO é atribuído pelo VHSYS no momento do salvamento.
  const { data: ultimoOrc } = await supabase
    .from("vhsys_orcamentos")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .single();
  const proximoNumero = (ultimoOrc?.numero ?? 0) + 1;

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dados do orçamento</h1>
      </div>
      <NovoOrcamentoPageForm
        profile={profile}
        vendedores={vendedores}
        proximoNumero={proximoNumero}
      />
    </div>
  );
}
