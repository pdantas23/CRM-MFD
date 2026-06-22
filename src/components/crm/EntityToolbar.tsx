"use client";
// Toolbar padronizada das abas do CRM (Orçamentos e Pedidos).
// Painel único: linha 1 = busca live (debounced) full-width + ação primária;
// linha 2 = filtros (situação multi, vendedor, período, específico) + Limpar.
// Persiste tudo na URL com router.replace (nunca push por tecla).

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useFiltrosUrl } from "./FiltrosUrlProvider";
import { MultiSelectFiltro } from "./MultiSelectFiltro";
import { PeriodoDropdown } from "./PeriodoDropdown";
import { DropdownFiltro, type OpcaoFiltro } from "@/components/ui/DropdownFiltro";
import type { FiltrosCrm, PeriodoPreset } from "@/lib/crm/filtros";

const PRESETS_VALIDOS: PeriodoPreset[] = ["hoje", "7d", "30d", "90d", "ano", "tudo"];

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
  const { aplicar, limpar, getParam } = useFiltrosUrl();

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Busca controlada por estado LOCAL, atualizada sincronamente a cada tecla.
  const buscaUrl = getParam("q") ?? "";
  const [termo, setTermo] = useState(buscaUrl);
  const termoDebounced = useDebouncedValue(termo, 350);
  // Último valor que ESTE componente emitiu para a URL (evita loop de sync).
  const ultimoEmitido = useRef(buscaUrl);
  const digitando = useRef(false);

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

  // Seleção OTIMISTA de situação: lê do overlay/URL (`situacao`) quando houver,
  // senão cai no valor derivado pelo server (situacoesSelecionadas/filtros).
  const situacaoParam = getParam("situacao");
  const padraoSituacao = situacoesSelecionadas ?? filtros.situacoes.map(String);
  const situacoesAtivas =
    situacaoParam !== undefined
      ? situacaoParam.split(",").filter(Boolean)
      : padraoSituacao;

  // Vendedor OTIMISTA.
  const vendedorAtual =
    getParam("vendedor") ?? (filtros.vendedor !== null ? String(filtros.vendedor) : undefined);

  // Período OTIMISTA: deriva preset/datas do overlay/URL quando presente.
  const periodoRaw = getParam("periodo");
  const dataDeRaw = getParam("data_de");
  const dataAteRaw = getParam("data_ate");
  const temCustom = dataDeRaw !== undefined || dataAteRaw !== undefined;
  const presetOtimista: PeriodoPreset | null = temCustom
    ? null
    : periodoRaw !== undefined
      ? PRESETS_VALIDOS.includes(periodoRaw as PeriodoPreset)
        ? (periodoRaw as PeriodoPreset)
        : null
      : filtros.periodoPreset;
  const dataDeOtimista = temCustom ? (dataDeRaw ?? null) : presetOtimista ? null : filtros.dataDe;
  const dataAteOtimista = temCustom ? (dataAteRaw ?? null) : presetOtimista ? null : filtros.dataAte;

  const algumFiltroAtivo =
    situacoesAtivas.length > 0 ||
    Boolean(vendedorAtual) ||
    temCustom ||
    periodoRaw !== undefined;

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
    // Zera APENAS as chaves de filtro conhecidas; preserva params extra (ex.: perf=1).
    limpar([
      "q", "situacao", "vendedor", "periodo", "data_de", "data_ate",
      "pedido_emitido", "com_saldo", "saldo", "legado", "pagina", "periodo_entrega",
      "sit_de", "sit_ate",
    ]);
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

      {/* Linha 2: filtros. No mobile, recolhidos atrás de um botão "Filtros"
          (um por linha quando aberto); no desktop, inline como antes. */}
      <button
        type="button"
        onClick={() => setFiltrosAbertos((v) => !v)}
        aria-expanded={filtrosAbertos}
        className="mt-2 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:hidden"
      >
        <span className="flex items-center gap-2">
          Filtros
          {algumFiltroAtivo && <span className="h-2 w-2 rounded-full bg-blue-600" />}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`${
          filtrosAbertos ? "flex" : "hidden"
        } mt-2 flex-col gap-2 [&>*]:w-full [&>div>button]:w-full sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:[&>*]:w-auto sm:[&>div>button]:w-auto`}
      >
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
            valorAtual={vendedorAtual}
            onChange={(v) => aplicar({ vendedor: v })}
          />
        )}

        <PeriodoDropdown
          preset={presetOtimista}
          dataDe={dataDeOtimista}
          dataAte={dataAteOtimista}
          onPreset={setPreset}
          onCustom={setCustom}
        />

        {filtroEspecifico}

        <button
          type="button"
          onClick={limparTudo}
          className="!w-auto self-end text-sm font-medium text-gray-500 hover:text-gray-700 sm:ml-auto"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
