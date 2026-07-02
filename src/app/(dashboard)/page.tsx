import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehAdmin, ehFinanceiro } from "@/lib/auth/roles";

export default async function DashboardPage() {
  const { profile } = await getSessaoComProfile();

  // Financeiro opera a tela de Pedidos (aprovação de pagamento).
  if (profile && ehFinanceiro(profile.role)) {
    redirect("/pedidos");
  }
  // Dashboard é exclusivo do admin (métricas do sistema — implementação futura).
  // Demais roles caem direto na operação de entregas.
  if (profile && !ehAdmin(profile.role)) {
    redirect("/entregas");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Métricas do sistema</p>
      </div>

      <div className="card px-6 py-16 text-center text-sm text-gray-500">
        Métricas do sistema em breve.
      </div>
    </div>
  );
}
