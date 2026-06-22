import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { Sidebar } from "@/components/layout/Sidebar";
import { iniciarRequest, medir, emitirLog } from "@/lib/perf/boot";

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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <Sidebar profile={profile} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
    </div>
  );
}
