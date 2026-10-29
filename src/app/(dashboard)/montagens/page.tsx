import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin, ehFinanceiro, ehMontador } from "@/lib/auth/roles";
import { hojeISOSaoPaulo } from "@/lib/entregas/hoje";
import { carregarMontagens } from "@/lib/montagens/dados";
import { MontagensView } from "@/components/montagens/MontagensView";

export const dynamic = "force-dynamic";

export default async function MontagensPage() {
  const { profile } = await getSessaoComProfile();
  // Admin/superadmin e financeiro veem todos; o montador, só os próprios.
  if (!profile || !(ehAdmin(profile.role) || ehFinanceiro(profile.role) || ehMontador(profile.role))) {
    redirect("/entregas");
  }

  const { servicos, montadores } = await carregarMontagens(profile);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <MontagensView
        servicos={servicos}
        montadores={montadores}
        hoje={hojeISOSaoPaulo()}
        permissoes={{
          podeEditar: ehAdmin(profile.role),
          podePagar: ehAdmin(profile.role) || ehFinanceiro(profile.role),
          montador: ehMontador(profile.role),
        }}
      />
    </div>
  );
}
