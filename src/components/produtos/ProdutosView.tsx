"use client";
// Aba Produtos: tabela única com os produtos de todas as contas (etiqueta
// SA/KCM), agrupada por seção — mesmas colunas da planilha de precificação.
// Campos editáveis direto na linha; envio ao VHSYS manual, por linha.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FornecedorVhsys, LinhaProduto } from "@/lib/produtos/dados";
import {
  ORDEM_SECOES,
  SEM_SECAO,
  margem,
  type ConfigPrecificacao,
} from "@/lib/produtos/precificacao";
import { FILTROS_SITUACAO, FiltrosModal, type FiltroSituacao } from "./FiltrosModal";
import { LinhaProdutoEditavel } from "./LinhaProdutoEditavel";
import { ParametrosModal } from "./ParametrosModal";
import { ProdutoModal } from "./ProdutoModal";
import { enviarProdutoAoVhsys } from "@/lib/produtos/acoes";
import { aplicarEnvio, pendenteEnvio, situacaoDe } from "./situacao";

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function ordemSecao(s: string): number {
  if (s === SEM_SECAO) return 1000;
  const i = ORDEM_SECOES.indexOf(s);
  return i < 0 ? 999 : i;
}

export function ProdutosView({
  linhas,
  configs,
  contas,
  fornecedores,
}: {
  linhas: LinhaProduto[];
  configs: ConfigPrecificacao[];
  /** Fornecedores do VHSYS por conta (contaId → lista). */
  fornecedores: Record<string, FornecedorVhsys[]>;
  contas: { id: string; slug: string }[];
}) {
  const router = useRouter();
  // Cópia local: cada linha salva/enviada atualiza aqui, sem recarregar a página.
  const [dados, setDados] = useState(linhas);
  useEffect(() => setDados(linhas), [linhas]);

  const [busca, setBusca] = useState("");
  const [conta, setConta] = useState<string | undefined>();
  const [secao, setSecao] = useState<string | undefined>();
  const [situacao, setSituacao] = useState<FiltroSituacao | undefined>();
  const [filtros, setFiltros] = useState(false);
  const [parametros, setParametros] = useState(false);
  const [abertoChave, setAbertoChave] = useState<string | null>(null);
  const aberto = abertoChave ? dados.find((l) => l.chave === abertoChave) ?? null : null;

  const icmsPorConta = useMemo(() => new Map(configs.map((c) => [c.contaId, c.icmsAtual])), [configs]);
  const slugs = useMemo(() => new Map(contas.map((c) => [c.id, c.slug])), [contas]);
  const icms = (l: LinhaProduto) => icmsPorConta.get(l.contaId) ?? 0;
  const nomeFornecedor = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const [contaId, lista] of Object.entries(fornecedores)) {
      for (const f of lista) mapa.set(`${contaId}:${f.id}`, f.nome);
    }
    return (l: LinhaProduto) => (l.fornecedorId ? mapa.get(`${l.contaId}:${l.fornecedorId}`) ?? "" : "");
  }, [fornecedores]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return dados.filter((l) => {
      if (conta && l.contaId !== conta) return false;
      if (secao && l.secao !== secao) return false;
      if (termo && !normalizar(`${l.produto} ${nomeFornecedor(l)}`).includes(termo)) return false;
      switch (situacao) {
        case "sem_margem":
          return l.valorVenda === null;
        case "margem_negativa": {
          const m = margem(l, icmsPorConta.get(l.contaId) ?? 0, l.valorVenda);
          return m !== null && m < 0;
        }
        case "divergente":
        case "erro":
        case "sem_vhsys":
          return situacaoDe(l, icmsPorConta.get(l.contaId) ?? 0) === situacao;
        case "aviso_compra":
          return l.avisoCompra !== null;
        case "alterado":
          return pendenteEnvio(l, icmsPorConta.get(l.contaId) ?? 0);
        default:
          return true;
      }
    });
  }, [dados, busca, conta, secao, situacao, icmsPorConta, nomeFornecedor]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, LinhaProduto[]>();
    for (const l of visiveis) {
      const g = mapa.get(l.secao);
      if (g) g.push(l);
      else mapa.set(l.secao, [l]);
    }
    mapa.forEach((g) => g.sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR")));
    return Array.from(mapa.entries()).sort(
      ([a], [b]) => ordemSecao(a) - ordemSecao(b) || a.localeCompare(b, "pt-BR")
    );
  }, [visiveis]);

  // Seções com produtos na conta escolhida (sem conta = todas as seções).
  const secoesDaConta = (c: string | undefined) =>
    Array.from(new Set(dados.filter((l) => !c || l.contaId === c).map((l) => l.secao))).sort(
      (a, b) => ordemSecao(a) - ordemSecao(b) || a.localeCompare(b, "pt-BR")
    );

  function mudarConta(c: string | undefined) {
    setConta(c);
    if (secao && !secoesDaConta(c).includes(secao)) setSecao(undefined);
  }

  const filtrosAtivos = [conta, secao, situacao].filter(Boolean).length;
  const rotuloFiltro = [
    conta ? slugs.get(conta)?.toUpperCase() : null,
    secao,
    situacao ? FILTROS_SITUACAO.find((f) => f.valor === situacao)?.label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function atualizar(nova: LinhaProduto) {
    setDados((prev) => prev.map((l) => (l.chave === nova.chave ? nova : l)));
  }

  const alterados = dados.filter((l) => pendenteEnvio(l, icms(l)));
  const [envio, setEnvio] = useState<{ feitos: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Envia, um por vez, só os produtos alterados no CRM desde o último envio.
  async function enviarAlterados() {
    const lista = alterados;
    if (!window.confirm(`Enviar ao VHSYS os ${lista.length} produto(s) alterado(s)?`)) return;
    setAviso(null);
    let falhas = 0;
    for (let i = 0; i < lista.length; i++) {
      setEnvio({ feitos: i, total: lista.length });
      let res: Awaited<ReturnType<typeof enviarProdutoAoVhsys>>;
      try {
        res = await enviarProdutoAoVhsys(lista[i].id!);
      } catch {
        res = { ok: false, erro: "Sem conexão com o servidor." };
      }
      if (!res.ok) falhas++;
      atualizar(aplicarEnvio(lista[i], res));
    }
    setEnvio(null);
    setAviso(
      falhas
        ? `${lista.length - falhas} enviado(s); ${falhas} com erro — filtre por “Erro de envio” para ver.`
        : `${lista.length} produto(s) enviado(s) ao VHSYS.`
    );
  }

  const th = "px-3 py-2.5 text-right font-medium whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Precificação dos produtos das contas, em sincronia com o VHSYS
          </p>
        </div>
        <button
          type="button"
          onClick={() => setParametros(true)}
          title="Parâmetros de precificação"
          aria-label="Parâmetros de precificação"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="flex w-full items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto ou fornecedor"
          className="input-base h-12 flex-1 text-base"
        />
        <button
          type="button"
          onClick={() => setFiltros(true)}
          className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${
            filtrosAtivos
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
          </svg>
          Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ""}
        </button>
        <button
          type="button"
          onClick={enviarAlterados}
          disabled={alterados.length === 0 || envio !== null}
          title="Envia ao VHSYS só os produtos alterados no CRM desde o último envio"
          className="btn-primary h-12 shrink-0"
        >
          {envio ? `Enviando ${envio.feitos + 1}/${envio.total}…` : `Enviar alterados (${alterados.length})`}
        </button>
      </div>

      {aviso && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{aviso}</p>}

      <p className="text-sm text-gray-500">
        {visiveis.length} produto(s){rotuloFiltro ? ` · ${rotuloFiltro}` : ""}
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Produto</th>
              <th className={th}>Preço de custo</th>
              <th className={th}>Frete</th>
              <th className={th}>Crédito ICMS</th>
              <th className={th}>Custos op.</th>
              <th className={th}>Comissões</th>
              <th className={th}>Imposto saída</th>
              <th className={th}>Custo líquido</th>
              <th className={th}>Equilíbrio</th>
              <th className={th}>Valor de venda</th>
              <th className={th}>Margem</th>
              <th className="px-3 py-2.5 text-left font-medium">Fornecedor</th>
              <th className={th}>Última compra</th>
              <th className="px-3 py-2.5 text-center font-medium">VHSYS</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(([nomeSecao, itens]) => (
              <Fragment key={nomeSecao}>
                <tr className="bg-primary-50">
                  <td colSpan={14} className="px-3 py-1.5 text-xs font-semibold text-primary-800">
                    {nomeSecao} <span className="font-normal text-primary-600">({itens.length})</span>
                  </td>
                </tr>
                {itens.map((l) => (
                  <LinhaProdutoEditavel
                    key={l.chave}
                    linha={l}
                    icmsAtual={icms(l)}
                    fornecedores={fornecedores[l.contaId] ?? []}
                    onAbrir={(x) => setAbertoChave(x.chave)}
                    onAtualizada={atualizar}
                  />
                ))}
              </Fragment>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-10 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtros && (
        <FiltrosModal
          contas={contas}
          secoes={secoesDaConta(conta)}
          conta={conta}
          secao={secao}
          situacao={situacao}
          onConta={mudarConta}
          onSecao={setSecao}
          onSituacao={setSituacao}
          onFechar={() => setFiltros(false)}
        />
      )}

      {aberto && (
        <ProdutoModal
          key={aberto.chave}
          linha={aberto}
          icmsAtual={icms(aberto)}
          fornecedores={fornecedores[aberto.contaId] ?? []}
          secoes={Array.from(new Set(dados.map((l) => l.secao)))}
          onFechar={() => setAbertoChave(null)}
          onAtualizada={atualizar}
          onExcluida={(l) => {
            setAbertoChave(null);
            setDados((prev) => prev.filter((x) => x.chave !== l.chave));
          }}
        />
      )}

      {parametros && (
        <ParametrosModal
          configs={configs}
          slugs={slugs}
          onFechar={() => setParametros(false)}
          onSalvo={() => {
            setParametros(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
