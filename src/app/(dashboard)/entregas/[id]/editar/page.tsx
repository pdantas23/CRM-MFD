import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EntregaForm } from "@/components/entregas/EntregaForm";
import type { Entrega, Profile } from "@/lib/types/database";

export default async function EditarEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: entrega }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("entregas").select("*").eq("id", id).single(),
  ]);

  if ((profile as Profile | null)?.role !== "admin") {
    redirect(`/entregas/${id}`);
  }

  if (!entrega) notFound();

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/entregas/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Detalhe
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Entrega</h1>
        <p className="mt-1 text-sm text-gray-500">{(entrega as Entrega).nome_cliente}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <EntregaForm mode="edit" entrega={entrega as Entrega} />
      </div>
    </div>
  );
}
