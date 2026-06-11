import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatarData } from "@/lib/format";
import type { OrcamentoRow, SituacaoRow } from "@/lib/types/pedidos";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

// Cores das situações de orçamento da conta (860 Em negociação,
// 768 Aprovado, 769 Perdido) — fallback cinza para ids novos.
const corSituacao: Record<number, string> = {
  860: "bg-amber-100 text-amber-800 border-amber-200",
  768: "bg-green-100 text-green-800 border-green-200",
  769: "bg-red-100 text-red-800 border-red-200",
};

function paramString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const filtroSituacao = paramString(searchParams?.situacao);
  const busca = paramString(searchParams?.q);
  const pagina = Math.max(1, Number(paramString(searchParams?.pagina) ?? "1") || 1);

  const { data: situacoes } = await supabase
    .from("vhsys_situacoes")
    .select("id_vhsys, entidade, nome, tipo_status, ordem, lixeira")
    .eq("entidade", "orcamentos")
    .eq("lixeira", false)
    .order("ordem");

  let query = supabase
    .from("vhsys_orcamentos")
    .select("*", { count: "exact" })
    .eq("lixeira", false)
    .order("data_orcamento", { ascending: false })
    .order("numero", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (filtroSituacao) query = query.eq("situacao_id", Number(filtroSituacao));
  if (busca) query = query.ilike("nome_cliente", `%${busca}%`);

  const { data: orcamentos, count } = await query;
  const lista = (orcamentos ?? []) as OrcamentoRow[];
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const situacaoPorId = new Map(
    ((situacoes ?? []) as SituacaoRow[]).map((s) => [s.id_vhsys, s])
  );

  const hrefCom = (mudancas: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const estado = { situacao: filtroSituacao, q: busca, pagina: String(pagina), ...mudancas };
    for (const [k, v] of Object.entries(estado)) {
      if (v && v !== "1") params.set(k, v);
      if (k === "pagina" && v === "1") params.delete(k);
    }
    const qs = params.toString();
    return qs ? `/orcamentos?${qs}` : "/orcamentos";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Espelho do VHSYS — somente leitura nesta fase. {count ?? 0} orçamentos.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={hrefCom({ situacao: undefined, pagina: "1" })}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !filtroSituacao
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Todas
        </Link>
        {((situacoes ?? []) as SituacaoRow[]).map((s) => (
          <Link
            key={s.id_vhsys}
            href={hrefCom({ situacao: String(s.id_vhsys), pagina: "1" })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filtroSituacao === String(s.id_vhsys)
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s.nome}
          </Link>
        ))}

        <form action="/orcamentos" method="GET" className="ml-auto flex items-center gap-2">
          {filtroSituacao && <input type="hidden" name="situacao" value={filtroSituacao} />}
          <input
            type="text"
            name="q"
            defaultValue={busca ?? ""}
            placeholder="Buscar cliente..."
            className="input-base !w-56"
          />
          <button type="submit" className="btn-secondary !px-3 !py-2 text-sm">
            Buscar
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((o) => {
              const situacao = o.situacao_id ? situacaoPorId.get(o.situacao_id) : null;
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">#{o.numero}</td>
                  <td className="px-4 py-3 text-gray-900">{o.nome_cliente}</td>
                  <td className="px-4 py-3 text-gray-500">{o.vendedor_nome ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.data_orcamento ? formatarData(o.data_orcamento) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatBRL(o.valor_total ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        (o.situacao_id && corSituacao[o.situacao_id]) ||
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {situacao?.nome ?? o.status_base ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {o.pedido_emitido ? "Emitido" : "—"}
                  </td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  Nenhum orçamento encontrado com estes filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Link href={hrefCom({ pagina: String(pagina - 1) })} className="btn-secondary !px-3 !py-1.5 text-sm">
              Anterior
            </Link>
          )}
          {pagina < totalPaginas && (
            <Link href={hrefCom({ pagina: String(pagina + 1) })} className="btn-secondary !px-3 !py-1.5 text-sm">
              Próxima
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
