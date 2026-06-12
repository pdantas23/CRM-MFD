import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessaoComProfile();

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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
