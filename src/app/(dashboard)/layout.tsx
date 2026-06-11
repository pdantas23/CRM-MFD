import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Profile } from "@/lib/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Perfil ausente: faz logout no servidor para limpar a sessão
    // e evitar loop de redirect com o middleware
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
