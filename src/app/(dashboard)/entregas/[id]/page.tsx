import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessaoComProfile } from "@/lib/auth/sessao";
import { PeriodoBadge, StatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/entregas/DeleteButton";
import type { Entrega } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default async function EntregaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ user, profile }, { data: entrega }] = await Promise.all([
    getSessaoComProfile(),
    supabase.from("entregas").select("*").eq("id", id).single(),
  ]);

  if (!user) redirect("/login");

  if (!entrega) notFound();

  const isAdmin = ehAdmin(profile?.role);
  const e = entrega as Entrega;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/entregas"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Entregas
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{e.nome_cliente}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cadastrado em {formatDateTime(e.created_at)}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href={`/entregas/${e.id}/editar`} className="btn-secondary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Link>
            <DeleteButton entregaId={e.id} anexoUrl={e.anexo_url} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Dados da Entrega
          </h2>
          <dl className="grid gap-5 sm:grid-cols-3">
            <Field label="Data" value={formatDate(e.data)} />
            <Field
              label="Período"
              value={<PeriodoBadge periodo={e.periodo} />}
            />
            <Field
              label="Status"
              value={<StatusBadge status={e.status} />}
            />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Dados do Cliente
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome" value={e.nome_cliente} />
            <Field label="CPF / CNPJ" value={e.cpf_cnpj} />
            <Field label="Nº Orçamento" value={e.numero_orcamento} />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Endereço de Entrega
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Bairro" value={e.bairro} />
            <Field label="Endereço Completo" value={e.endereco} />
          </dl>
        </div>

        {e.anexo_url && (
          <div className="card p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Anexo
            </h2>
            <a
              href={e.anexo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-blue-600 transition-colors hover:bg-gray-100 hover:text-blue-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {e.anexo_nome ?? "Ver anexo"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
