import { redirect } from "next/navigation";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { ehOwner } from "@/lib/auth/roles";
import { listarContasAdmin } from "@/lib/accounts/admin-acoes";
import { ContasClient } from "@/components/configuracoes/ContasClient";
import { BotaoSair } from "@/components/layout/BotaoSair";

export const dynamic = "force-dynamic";
// O cadastro de conta dispara um pull COMPLETO do VHSYS (server action nesta
// rota) — pode levar minutos. Estende o limite de execução.
export const maxDuration = 300;
export const runtime = "nodejs";

// Área de GERENCIAMENTO INTERNO do CRM — acesso exclusivo da role `owner`.
// Separada do dashboard operacional: aqui só se gerenciam as contas VHSYS
// cadastradas; nenhum dado de pedidos/orçamentos/entregas é exibido.
export default async function GerenciamentoPage() {
  const { user, profile } = await getSessaoComProfile();
  if (!user) redirect("/login");
  // Não-owner não tem nada aqui → volta para a operação.
  if (!profile || !ehOwner(profile.role)) redirect("/");

  const res = await listarContasAdmin();
  const contas = res.ok ? res.contas : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Gerenciamento interno</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">owner</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-500 sm:inline">{profile.nome}</span>
          <BotaoSair className="text-sm font-medium text-gray-600 hover:text-gray-900" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contas do CRM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre e gerencie as contas VHSYS disponíveis no sistema.
          </p>
        </div>

        {!res.ok && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {res.erro}
          </div>
        )}

        <ContasClient contas={contas} />
      </main>
    </div>
  );
}
