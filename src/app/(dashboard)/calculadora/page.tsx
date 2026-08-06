import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin } from "@/lib/auth/roles";
import { CalculadoraView } from "@/components/calculadora/CalculadoraView";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const { profile } = await getSessaoComProfile();
  const role = profile?.role;
  // Acesso: admin (inclui superadmin via ehAdmin) e vendedor.
  if (!ehAdmin(role) && role !== "vendedor") {
    redirect("/entregas");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calculadora</h1>
        <p className="mt-1 text-sm text-gray-500">Precificação e planejamento de materiais</p>
      </div>

      <CalculadoraView />
    </div>
  );
}
