import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { contasDoUsuario } from "@/lib/accounts/contexto";
import { selecionarConta } from "@/lib/accounts/acoes";
import { ehOwner } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function SelecionarContaPage() {
  const { user, profile } = await getSessaoComProfile();
  if (!user) redirect("/login");

  // Owner não seleciona conta operacional — vai ao gerenciamento.
  if (profile && ehOwner(profile.role)) redirect("/gerenciamento");

  const contas = await contasDoUsuario(user.id);

  // Sem contas cadastradas → nada a selecionar (operador precisa rodar o seed).
  if (contas.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md p-8 text-center text-sm text-gray-600">
          Nenhuma conta VHSYS configurada. Rode <code>scripts/seed-accounts.ts</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">Escolha a conta</h1>
        <p className="mb-8 text-center text-sm text-gray-500">
          Selecione com qual conta deseja operar.
        </p>

        <div className="space-y-3">
          {contas.map((conta) => (
            <form key={conta.id} action={selecionarConta.bind(null, conta.slug)}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: conta.themeColor }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">
                    {conta.nomeEmpresa ?? conta.slug}
                  </span>
                  <span className="block truncate text-xs text-gray-500">{conta.slug}</span>
                </span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
