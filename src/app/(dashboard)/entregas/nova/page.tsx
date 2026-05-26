import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntregaForm } from "@/components/entregas/EntregaForm";
import type { Profile } from "@/lib/types/database";

export default async function NovaEntregaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if ((profile as Profile | null)?.role !== "admin") {
    redirect("/entregas");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nova Entrega</h1>
        <p className="mt-1 text-sm text-gray-500">Preencha os dados abaixo para registrar uma entrega</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <EntregaForm mode="create" />
      </div>
    </div>
  );
}
