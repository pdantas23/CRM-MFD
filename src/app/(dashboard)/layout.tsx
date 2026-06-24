import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { Sidebar } from "@/components/layout/Sidebar";
import { iniciarRequest, medir, emitirLog } from "@/lib/perf/boot";
import { getContaAtiva, contasDoUsuario } from "@/lib/accounts/contexto";
import { deriveScale } from "@/lib/theme/cor";
import { ehOwner } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfCtx = iniciarRequest();
  const [{ user, profile }, msSessao] = await medir(() => getSessaoComProfile());
  emitirLog(perfCtx, { getSessaoComProfile: msSessao }, { source: "layout" });

  if (!user) {
    redirect("/login");
  }

  if (!profile) {
    // Perfil ausente: faz logout no servidor para limpar a sessão
    // e evitar loop de redirect com o middleware. Cliente criado só neste
    // ramo de erro (caminho raro) — o fluxo normal não cria client aqui.
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Owner não opera contas — pertence à área de gerenciamento.
  if (ehOwner(profile.role)) {
    redirect("/gerenciamento");
  }

  // Conta ativa: nome exibido na sidebar + cor do tema injetada como CSS vars.
  const conta = await getContaAtiva();
  const nomeEmpresa = conta.nomeEmpresa ?? process.env.APP_NAME ?? "CRM";
  const cssVars = deriveScale(conta.themeColor) as React.CSSProperties;

  // Contas disponíveis para o seletor de troca (só renderiza se > 1).
  const contas = (await contasDoUsuario(user.id)).map((c) => ({
    id: c.id,
    slug: c.slug,
    nomeEmpresa: c.nomeEmpresa,
    themeColor: c.themeColor,
  }));

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-gray-50 lg:flex-row"
      style={cssVars}
    >
      <Sidebar
        profile={profile}
        nomeEmpresa={nomeEmpresa}
        contas={contas}
        slugAtivo={conta.slug}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
}
