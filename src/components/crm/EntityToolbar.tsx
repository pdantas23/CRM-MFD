"use client";
// Toolbar padronizada das abas do CRM (Orçamentos e Pedidos).
// Painel único: linha 1 = busca live (debounced) full-width + ação primária;
// linha 2 = filtros (situação multi, vendedor, período, específico) + Limpar.
// Persiste tudo na URL com router.replace (nunca push por tecla).

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { MultiSelectFiltro } from "./MultiSelectFiltro";
import { PeriodoDropdown } from "./PeriodoDropdown";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";
import type { FiltrosCrm, PeriodoPreset } from "@/lib/crm/filtros";

/** id pode ser numérico (orcamentos/pedidos) ou string (entregas). */
interface SituacaoOpcao {
  id: string | number;
  nome: string;
}
interface VendedorOpcao {
  id_vhsys: number;
  nome: string;
}

interface EntityToolbarProps {
  /** Filtros já parseados pelo server (fonte de verdade dos valores atuais). */
  filtros: FiltrosCrm;
  /** Situações reais da entidade para o multi-select. */
  situacoes: SituacaoOpcao[];
  /**
   * Situações selecionadas atualmente — override de `filtros.situacoes`.
   * Use quando a entidade usa ids de string (ex.: entregas).
   * Se omitido, usa `filtros.situacoes.map(String)`.
   */
  situacoesSelecionadas?: string[];
  /** Vendedores (só renderiza o filtro se mostrarVendedor=true). */
  vendedores?: VendedorOpcao[];
  mostrarVendedor?: boolean;
  /** Placeholder do input de busca. */
  placeholderBusca?: string;
  /** Ação primária (ex.: botão "+ Novo Orçamento"). Opcional. */
  acaoPrimaria?: React.ReactNode;
  /** Slot do filtro específico da entidade (linha 2, à esquerda). */
  filtroEspecifico?: React.ReactNode;
}

export function EntityToolbar({
  filtros,
  situacoes,
  situacoesSelecionadas,
  vendedores = [],
  mostrarVendedor = false,
  placeholderBusca = "Buscar por cliente, nº ou vendedor…",
  acaoPrimaria,
  filtroEspecifico,
}: EntityToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Busca controlada por estado LOCAL, atualizada sincronamente a cada tecla.
  const buscaUrl = searchParams.get("q") ?? "";
  const [termo, setTermo] = useState(buscaUrl);
  const termoDebounced = useDebouncedValue(termo, 350);
  // Último valor que ESTE componente emitiu para a URL (evita loop de sync).
  const ultimoEmitido = useRef(buscaUrl);
  const digitando = useRef(false);

  /** Aplica mudanças na URL com replace (sem scroll, sem push). */
  function aplicar(mudancas: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    if (!("pagina" in mudancas)) params.delete("pagina");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Sincroniza o termo debounced para a URL (somente quando muda de fato).
  useEffect(() => {
    if (termoDebounced === ultimoEmitido.current) return;
    ultimoEmitido.current = termoDebounced;
    digitando.current = false;
    aplicar({ q: termoDebounced || undefined });
    // aplicar/searchParams capturados de propósito — só roda no debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termoDebounced]);

  // Sync externo (ex.: "Limpar" ou navegação): só sobrescreve o estado local
  // se o usuário NÃO estiver digitando e o valor de URL divergir do emitido.
  useEffect(() => {
    if (digitando.current) return;
    if (buscaUrl !== ultimoEmitido.current) {
      ultimoEmitido.current = buscaUrl;
      setTermo(buscaUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaUrl]);

  function onDigitar(v: string) {
    digitando.current = true;
    setTermo(v);
  }

  // ── Opções dos filtros ──
  const opcoesSituacao = situacoes.map((s) => ({
    valor: String(s.id),
    label: s.nome,
  }));
  const opcoesVendedor: OpcaoFiltro[] = vendedores.map((v) => ({
    valor: String(v.id_vhsys),
    label: v.nome,
  }));

  // situacoesSelecionadas como override; caso omitido usa filtros.situacoes (números).
  const situacoesAtivas = situacoesSelecionadas ?? filtros.situacoes.map(String);

  function setSituacoes(valores: string[]) {
    aplicar({ situacao: valores.length ? valores.join(",") : undefined });
  }
  function setPreset(preset: PeriodoPreset) {
    aplicar({ periodo: preset, data_de: undefined, data_ate: undefined });
  }
  function setCustom(de: string, ate: string) {
    aplicar({ periodo: undefined, data_de: de || undefined, data_ate: ate || undefined });
  }
  function limparTudo() {
    digitando.current = false;
    ultimoEmitido.current = "";
    setTermo("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      {/* Linha 1: busca full-width + ação primária */}
      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={termo}
            onChange={(e) => onDigitar(e.target.value)}
            placeholder={placeholderBusca}
            maxLength={100}
            className="input-base pl-9"
          />
        </div>
        {acaoPrimaria && <div className="shrink-0">{acaoPrimaria}</div>}
      </div>

      {/* Linha 2: filtros à esquerda + Limpar à direita */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <MultiSelectFiltro
          label="Situação"
          opcoes={opcoesSituacao}
          selecionados={situacoesAtivas}
          onChange={setSituacoes}
        />

        {mostrarVendedor && (
          <DropdownFiltro
            label="Vendedor"
            opcoes={opcoesVendedor}
            valorAtual={filtros.vendedor !== null ? String(filtros.vendedor) : undefined}
            onChange={(v) => aplicar({ vendedor: v })}
          />
        )}

        <PeriodoDropdown
          preset={filtros.periodoPreset}
          dataDe={filtros.dataDe}
          dataAte={filtros.dataAte}
          onPreset={setPreset}
          onCustom={setCustom}
        />

        {filtroEspecifico}

        <button
          type="button"
          onClick={limparTudo}
          className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
