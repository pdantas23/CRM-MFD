"use client";
// Barra de filtros avançados da aba Pedidos.
// Estado mantido na URL (searchParams) para preservar filtros ao navegar.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { DropdownFiltro } from "@/components/ui/DropdownFiltro";
import type { OpcaoFiltro } from "@/components/ui/DropdownFiltro";

interface Vendedor {
  id_vhsys: number;
  nome: string;
}

interface PedidosFiltrosProps {
  /** Lista de vendedores para o dropdown (vazio para role=vendedor) */
  vendedores: Vendedor[];
  /** Exibir dropdown de vendedor (false para role=vendedor) */
  mostrarFiltroVendedor: boolean;
}

export function PedidosFiltros({ vendedores, mostrarFiltroVendedor }: PedidosFiltrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Lê valores atuais da URL
  const q = searchParams.get("q") ?? "";
  const vendedor = searchParams.get("vendedor") ?? undefined;
  const dataDe = searchParams.get("data_de") ?? "";
  const dataAte = searchParams.get("data_ate") ?? "";
  const valorMin = searchParams.get("valor_min") ?? "";
  const valorMax = searchParams.get("valor_max") ?? "";

  /** Atualiza um parâmetro na URL; valor vazio = remove o param */
  const setParam = useCallback(
    (chave: string, valor: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor && valor !== "") {
        params.set(chave, valor);
      } else {
        params.delete(chave);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const opcoesVendedor: OpcaoFiltro[] = vendedores.map((v) => ({
    valor: String(v.id_vhsys),
    label: v.nome,
  }));

  const temFiltroAtivo =
    q !== "" || vendedor || dataDe || dataAte || valorMin || valorMax;

  function limparTodos() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {/* Busca por nome/número/vendedor */}
      <div className="relative">
        <input
          type="search"
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Cliente, número ou vendedor…"
          className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 pl-8 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <svg
          className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
      </div>

      {/* Dropdown de vendedor — só admin/entregador */}
      {mostrarFiltroVendedor && (
        <DropdownFiltro
          label="Vendedor"
          opcoes={opcoesVendedor}
          valorAtual={vendedor}
          onChange={(v) => setParam("vendedor", v)}
          placeholder="Todos"
        />
      )}

      {/* Período: data de */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500">De</label>
        <input
          type="date"
          value={dataDe}
          onChange={(e) => setParam("data_de", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Período: data até */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500">Até</label>
        <input
          type="date"
          value={dataAte}
          onChange={(e) => setParam("data_ate", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Valor mínimo */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500">Valor mín.</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={valorMin}
          onChange={(e) => setParam("valor_min", e.target.value)}
          placeholder="0,00"
          className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Valor máximo */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500">Valor máx.</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={valorMax}
          onChange={(e) => setParam("valor_max", e.target.value)}
          placeholder="∞"
          className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Botão limpar filtros */}
      {temFiltroAtivo && (
        <button
          type="button"
          onClick={limparTodos}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
