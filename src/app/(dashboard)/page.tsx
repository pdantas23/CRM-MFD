import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardEntregas } from "@/components/dashboard/DashboardEntregas";
import type { Entrega, Profile } from "@/lib/types/database";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// Retorna YYYY-MM-DD no fuso de São Paulo, independente de onde o código
// está rodando (server em UTC ou browser local). Garante que "hoje" no
// dashboard bata com o "hoje" gravado pelo form.
function getTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = getTodayISO();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entregasData }, { data: profileData }] = await Promise.all([
    supabase
      .from("entregas")
      .select("*")
      .eq("data", today)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  const entregas = (entregasData ?? []) as Entrega[];
  const isAdmin = (profileData as Pick<Profile, "role"> | null)?.role === "admin";

  const manha = entregas.filter((e) => e.periodo === "manha");
  const tarde = entregas.filter((e) => e.periodo === "tarde");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Entregas de hoje · {formatDate(today)}
          </p>
        </div>
        {isAdmin && (
          <Link href="/entregas/nova" className="btn-primary w-full sm:w-auto">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Entrega
          </Link>
        )}
      </div>

      <DashboardEntregas manha={manha} tarde={tarde} isAdmin={isAdmin} />
    </div>
  );
}
