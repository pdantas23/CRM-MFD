import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { redirect } from "next/navigation";
import { NovoOrcamentoPageForm } from "@/components/orcamentos/NovoOrcamentoPageForm";
import { iniciarRequest, medir, emitirLog } from "@/lib/perf/boot";
import { ehAdmin } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage() {
  const perfCtx = iniciarRequest("/orcamentos/novo");
  const supabase = await createClient();
  const { profile } = await getSessaoComProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!ehAdmin(profile.role) && profile.role !== "vendedor") {
    redirect("/orcamentos");
  }

  // Vendedores (só admin) e estimativa do próximo número rodam em paralelo —
  // são independentes; o número DEFINITIVO é atribuído pelo VHSYS ao salvar.
  const [[vendedores, msVendedores], [ultimoOrcResult, msUltimoOrc]] =
    await Promise.all([
      medir(async () => {
        if (!ehAdmin(profile.role)) return [];
        const result = await supabase
          .from("vhsys_vendedores")
          .select("id_vhsys, nome")
          .eq("lixeira", false)
          .order("nome");
        return (result.data ?? []) as { id_vhsys: number; nome: string }[];
      }),
      medir(async () =>
        supabase
          .from("vhsys_orcamentos")
          .select("numero")
          .order("numero", { ascending: false })
          .limit(1)
          .single()
      ),
    ]);
  const { data: ultimoOrc } = ultimoOrcResult;
  const proximoNumero = (ultimoOrc?.numero ?? 0) + 1;

  emitirLog(
    perfCtx,
    { vendedores: msVendedores, ultimoOrc: msUltimoOrc },
    { source: "orcamentos/novo" }
  );

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
