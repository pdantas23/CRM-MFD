import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehSuperadmin } from "@/lib/auth/roles";
import { listarUsuarios, listarVendedoresVhsys } from "@/lib/usuarios/acoes";
import { UsuariosClient } from "@/components/configuracoes/UsuariosClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const { profile } = await getSessaoComProfile();

  if (!profile || !ehSuperadmin(profile.role)) {
    redirect("/entregas");
  }

  const [resUsuarios, resVendedores] = await Promise.all([
    listarUsuarios(),
    listarVendedoresVhsys(),
  ]);

  const usuarios = resUsuarios.ok ? resUsuarios.usuarios : [];
  const vendedores = resVendedores.ok ? resVendedores.vendedores : [];
  const erroCarregamento = !resUsuarios.ok
    ? resUsuarios.erro
    : !resVendedores.ok
      ? resVendedores.erro
      : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gestão de usuários do sistema</p>
      </div>

      {erroCarregamento && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroCarregamento}
        </div>
      )}

      <UsuariosClient
        usuarios={usuarios}
        vendedores={vendedores}
        currentUserId={profile.id}
      />
    </div>
  );
}
