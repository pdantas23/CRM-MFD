"use client";
// Formulário de cadastro/edição de orçamento — página dedicada.
// Layout fiel ao VHSYS: seções com título azul/escuro e divisória pontilhada.
// Reaproveita AutocompleteVhsys e a lógica de submit do modal.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarOrcamento, editarOrcamento } from "@/lib/vhsys/acoes-orcamentos";
import { BotaoNavegacao } from "@/components/ui/BotaoNavegacao";
import type {
  PayloadCriarOrcamento,
  PayloadItemOrcamento,
} from "@/lib/vhsys/types";
import type { Profile } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";
import { AutocompleteVhsys } from "@/components/ui/AutocompleteVhsys";
import { InputValor } from "@/components/ui/InputValor";
import { InputInteiro } from "@/components/ui/InputInteiro";
import { MensagensPadrao } from "./MensagensPadrao";
import { CadastroClienteModal } from "@/components/clientes/CadastroClienteModal";
import { formatBRL } from "@/lib/format";

// ── Tipos locais ─────────────────────────────────────────────────────────────

interface ClienteOpcao {
  id_vhsys: number;
  razao: string;
  fantasia: string | null;
  cnpj_cpf: string | null;
}

interface ProdutoOpcao {
  id_vhsys: number;
  descricao: string;
  codigo: string | null;
  unidade: string | null;
  valor: number | null;
}

interface TransportadoraOpcao {
  id_vhsys: number;
  nome: string;
}

interface ItemLinha {
  key: number;
  /** id_ped_produto do VHSYS (presente em itens já existentes; ausente em itens novos). */
  idPedProduto?: number;
  // produto selecionado
  idProduto: number | undefined;
  descProduto: string;
  codProduto: string;
  // query do autocomplete (texto digitado)
  produtoQuery: string;
  qtde: number;
  ipi: number;    // IPI % como número
  icms: number;   // ICMS % como número
  valorUnit: number;
}

/** Valores iniciais para pré-preencher o form em modo edição. */
export interface IniciaisOrcamento {
  nomeCliente?: string;
  idCliente?: number;
  vendedorId?: number;
  dataOrcamento?: string;
  prazoEntrega?: string;
  validade?: string;
  referencia?: string;
  obs?: string;
  obsInterno?: string;
  descontoReais?: number;
  descontoPorc?: number;
  freteValor?: number;
  fretePor?: "" | "0" | "1" | "9";
  transportadoraId?: number;
  transportadoraNome?: string;
  pesoBruto?: number;
  pesoLiq?: number;
}

interface Props {
  profile: Profile;
  vendedores: { id_vhsys: number; nome: string }[];
  /** Estimativa do próximo número (espelho local). O VHSYS atribui o definitivo ao salvar. */
  proximoNumero: number;
  /** Quando true, o form opera em modo edição em vez de criação. */
  modoEdicao?: boolean;
  /** ID VHSYS do orçamento a editar (obrigatório em modoEdicao). */
  orcamentoIdVhsys?: number;
  /** Número real do orçamento (exibido read-only em modoEdicao). */
  numeroExistente?: number;
  /** Valores iniciais para pré-preencher o form em modo edição. */
  iniciais?: Partial<IniciaisOrcamento>;
}

// ── Componente auxiliar de seção ─────────────────────────────────────────────

function SecaoTitulo({ titulo }: { titulo: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">
        {titulo}
      </h2>
      <hr className="mt-1 border-dashed border-gray-300" />
    </div>
  );
}

// ── Helper: data de hoje como YYYY-MM-DD (client-safe via useState inicial) ──

function hojeISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function itemVazio(key: number): ItemLinha {
  return {
    key,
    idProduto: undefined,
    descProduto: "",
    codProduto: "",
    produtoQuery: "",
    qtde: 0,
    ipi: 0,
    icms: 0,
    valorUnit: 0,
  };
}

// ── Componente principal ─────────────────────────────────────────────────────

export function NovoOrcamentoPageForm({
  profile,
  vendedores,
  proximoNumero,
  modoEdicao = false,
  orcamentoIdVhsys,
  numeroExistente,
  iniciais,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoEdicao, setCarregandoEdicao] = useState(modoEdicao);

  const nextKey = useRef(10); // inicia em 10 para itens; parcelas usam valores maiores

  // Guarda os idPedProduto originais para montar o diff "substituir tudo"
  const idsPedProdutoOriginais = useRef<number[]>([]);

  // ── 1. Cliente ──────────────────────────────────────────────────────────────
  const [clienteQuery, setClienteQuery] = useState(iniciais?.nomeCliente ?? "");
  const [nomeCliente, setNomeCliente] = useState(iniciais?.nomeCliente ?? "");
  const [idCliente, setIdCliente] = useState<number | undefined>(iniciais?.idCliente);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);

  // ── Vendedor ────────────────────────────────────────────────────────────────
  const [vendedorId, setVendedorId] = useState<number | undefined>(
    iniciais?.vendedorId ??
      (profile.role === "vendedor" ? (profile.vendedor_id ?? undefined) : undefined)
  );

  // ── 2. Itens de produto ─────────────────────────────────────────────────────
  const [itens, setItens] = useState<ItemLinha[]>([itemVazio(nextKey.current++)]);

  function adicionarItem() {
    setItens((prev) => [...prev, itemVazio(nextKey.current++)]);
  }

  function removerItem(key: number) {
    setItens((prev) => {
      const filtrado = prev.filter((i) => i.key !== key);
      // Nunca deixa a tabela sem nenhuma linha.
      return filtrado.length > 0 ? filtrado : [itemVazio(nextKey.current++)];
    });
  }

  function atualizarItem<K extends keyof ItemLinha>(
    key: number,
    campo: K,
    val: ItemLinha[K]
  ) {
    setItens((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [campo]: val } : i))
    );
  }

  function atualizarItemMulti(key: number, patch: Partial<ItemLinha>) {
    setItens((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i))
    );
  }

  // ── 3. Totais ───────────────────────────────────────────────────────────────
  const [freteValor, setFreteValor] = useState(iniciais?.freteValor ?? 0);
  const [descontoReais, setDescontoReais] = useState(iniciais?.descontoReais ?? 0);
  const [descontoPorc, setDescontoPorc] = useState(iniciais?.descontoPorc ?? 0);
  const [pesoBruto, setPesoBruto] = useState(iniciais?.pesoBruto ?? 0);
  const [pesoLiq, setPesoLiq] = useState(iniciais?.pesoLiq ?? 0);

  const valorProdutos = useMemo(
    () =>
      itens.reduce((s, i) => {
        return s + i.qtde * i.valorUnit;
      }, 0),
    [itens]
  );

  const valorIPI = useMemo(
    () =>
      itens.reduce((s, i) => {
        return s + i.qtde * i.valorUnit * (i.ipi / 100);
      }, 0),
    [itens]
  );

  const valorTotal = valorProdutos + valorIPI + freteValor - descontoReais;

  // ── 5. Transporte ───────────────────────────────────────────────────────────
  const [fretePor, setFretePor] = useState<"" | "0" | "1" | "9">(iniciais?.fretePor ?? "");
  const [transportadoraQuery, setTransportadoraQuery] = useState(iniciais?.transportadoraNome ?? "");
  const [transportadoraId, setTransportadoraId] = useState<number | undefined>(iniciais?.transportadoraId);
  const [transportadoraNome, setTransportadoraNome] = useState(iniciais?.transportadoraNome ?? "");

  const semFrete = fretePor === "9";
  // Transportadora só é selecionável após escolher uma modalidade com frete
  // (Remetente/Destinatário). Bloqueada sem modalidade ou com "Sem frete".
  const transportadoraBloqueada = fretePor === "" || semFrete;

  function handleFretePorChange(valor: "" | "0" | "1" | "9") {
    setFretePor(valor);
    if (valor === "" || valor === "9") {
      // Sem modalidade ou sem frete: limpa transportadora
      setTransportadoraQuery("");
      setTransportadoraId(undefined);
      setTransportadoraNome("");
    }
  }

  // ── 6. Detalhes ─────────────────────────────────────────────────────────────
  const [dataOrcamento, setDataOrcamento] = useState(iniciais?.dataOrcamento ?? hojeISO);
  // prazoEntrega como string para permitir vazio (campo opcional)
  const [prazoEntrega, setPrazoEntrega] = useState(iniciais?.prazoEntrega ?? "");
  const [validade, setValidade] = useState(iniciais?.validade ?? "");
  const [referencia, setReferencia] = useState(iniciais?.referencia ?? "");
  const [obs, setObs] = useState(iniciais?.obs ?? "");
  const [obsInterno, setObsInterno] = useState(iniciais?.obsInterno ?? "");

  // ── Carregamento de itens em modo edição ────────────────────────────────────

  useEffect(() => {
    if (!modoEdicao || !orcamentoIdVhsys) return;

    let cancelado = false;

    async function carregar() {
      setCarregandoEdicao(true);
      try {
        // Carrega itens
        const resItens = await fetch(`/api/orcamento-itens/${orcamentoIdVhsys}`);
        const dadosItens = await resItens.json() as Array<{
          id_ped_produto: number;
          id_produto: number;
          desc_produto: string;
          qtde_produto: string | number;
          valor_unit_produto: string | number;
          ipi_produto?: number;
          icms_produto?: number;
          cod_produto?: string;
        }>;

        if (cancelado) return;

        // Guarda ids originais para o diff
        const ids = dadosItens.map((i) => i.id_ped_produto).filter(Boolean);
        idsPedProdutoOriginais.current = ids;

        // Preenche itens
        const itensCarregados: ItemLinha[] = dadosItens.map((i) => ({
          key: nextKey.current++,
          idPedProduto: i.id_ped_produto,
          idProduto: i.id_produto,
          descProduto: i.desc_produto,
          codProduto: i.cod_produto ?? "",
          produtoQuery: i.desc_produto,
          qtde: Number(i.qtde_produto) || 1,
          valorUnit: Number(i.valor_unit_produto) || 0,
          ipi: Number(i.ipi_produto ?? 0),
          icms: Number(i.icms_produto ?? 0),
        }));

        setItens(itensCarregados.length > 0 ? itensCarregados : [itemVazio(nextKey.current++)]);
      } catch {
        // Mantém estado vazio em caso de erro
      } finally {
        if (!cancelado) setCarregandoEdicao(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoEdicao, orcamentoIdVhsys]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nomeCliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }

    const itensFiltrados = itens.filter(
      (i) => i.idProduto !== undefined && i.qtde > 0 && i.valorUnit > 0
    );

    if (itensFiltrados.length === 0) {
      setErro("Adicione ao menos um produto com quantidade e valor.");
      return;
    }

    const payload: PayloadCriarOrcamento = {
      nome_cliente: nomeCliente.trim(),
      ...(idCliente ? { id_cliente: idCliente } : {}),
      status_pedido: "Em Aberto",
      ...(dataOrcamento ? { data_pedido: dataOrcamento } : {}),
      ...(validade ? { validade_orcamento: validade } : {}),
      ...(obs.trim() ? { obs_pedido: obs.trim() } : {}),
      ...(obsInterno.trim() ? { obs_interno_pedido: obsInterno.trim() } : {}),
      ...(referencia.trim() ? { referencia_pedido: referencia.trim() } : {}),
      ...(prazoEntrega !== "" ? { prazo_orcamento: Number(prazoEntrega) } : {}),
      ...(descontoReais > 0
        ? { desconto_pedido: descontoReais.toFixed(2) }
        : {}),
      ...(descontoPorc > 0
        ? { desconto_pedido_porc: descontoPorc.toFixed(2) }
        : {}),
      // Frete
      ...(freteValor > 0
        ? { frete_pedido: freteValor.toFixed(2) }
        : {}),
      ...(fretePor !== ""
        ? { frete_por_pedido: Number(fretePor) as 0 | 1 | 9 }
        : {}),
      ...(transportadoraId ? { id_transportadora: transportadoraId } : {}),
      ...(transportadoraNome.trim() && transportadoraId
        ? { transportadora_pedido: transportadoraNome.trim() }
        : {}),
      // Peso
      ...(pesoBruto > 0
        ? { peso_total_nota: pesoBruto.toFixed(2) }
        : {}),
      ...(pesoLiq > 0
        ? { peso_total_nota_liq: pesoLiq.toFixed(2) }
        : {}),
      // Totais: NÃO enviar valor_total_produtos/valor_total_nota na criação.
      // O VHSYS grava o total enviado e depois SOMA cada produto postado em
      // /orcamentos/{id}/produtos, dobrando o valor. Omitindo os totais, a API
      // os recalcula a partir dos produtos + frete (frete_pedido) - desconto
      // (desconto_pedido), que vão no payload acima.
    };

    // Vendedor (admin escolhe; vendedor usa o próprio via server action)
    if (ehAdmin(profile.role) && vendedorId) {
      const vend = vendedores.find((v) => v.id_vhsys === vendedorId);
      payload.vendedor_pedido_id = vendedorId;
      if (vend) payload.vendedor_pedido = vend.nome;
    }

    // IPI/ICMS digitados como % no UI — confirmar unidade esperada pela API
    const itensMapped: PayloadItemOrcamento[] = itensFiltrados.map((i) => ({
      id_produto: i.idProduto!,
      desc_produto: i.descProduto,
      qtde_produto: i.qtde,
      valor_unit_produto: i.valorUnit,
      ...(i.ipi > 0 ? { ipi_produto: i.ipi } : {}),
      ...(i.icms > 0 ? { icms_produto: i.icms } : {}),
    }));

    if (modoEdicao && orcamentoIdVhsys) {
      // Modo edição: estratégia "substituir tudo"
      const itensDiff = {
        deletar: idsPedProdutoOriginais.current,
        inserir: itensMapped,
      };

      startTransition(async () => {
        const res = await editarOrcamento(
          orcamentoIdVhsys,
          payload,
          itensDiff
        );
        if (!res.ok) {
          setErro(res.erro ?? "Erro ao salvar orçamento.");
          return;
        }
        router.push("/orcamentos");
        router.refresh();
      });
    } else {
      startTransition(async () => {
        const res = await criarOrcamento(
          payload,
          itensMapped
        );
        if (!res.ok) {
          setErro(res.erro ?? "Erro ao criar orçamento.");
          return;
        }
        router.push("/orcamentos");
        router.refresh();
      });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (carregandoEdicao) {
    return (
      <div className="space-y-4 max-w-5xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">

      {/* ── 1. Topo: Cliente / Vendedor / Número ─────────────────────────── */}
      <section>
        <SecaoTitulo titulo="Cliente e vendedor" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Cliente */}
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            <AutocompleteVhsys<ClienteOpcao>
              endpoint="/api/buscar-clientes"
              placeholder="Buscar cliente..."
              value={clienteQuery}
              onChange={(texto) => {
                setClienteQuery(texto);
                setNomeCliente(texto);
                setIdCliente(undefined);
              }}
              onSelecionar={(c) => {
                setClienteQuery(c.razao);
                setNomeCliente(c.razao);
                setIdCliente(c.id_vhsys);
              }}
              renderOpcao={(c) => (
                <>
                  <span className="font-medium">{c.razao}</span>
                  {c.cnpj_cpf && (
                    <span className="ml-2 text-xs text-gray-400">
                      {c.cnpj_cpf}
                    </span>
                  )}
                </>
              )}
            />
            <button
              type="button"
              onClick={() => setModalClienteAberto(true)}
              className="mt-1 text-sm font-semibold text-blue-700 hover:underline"
            >
              Cadastrar cliente
            </button>
          </div>

          {/* Vendedor — lado a lado com Número */}
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Vendedor
            </label>
            {ehAdmin(profile.role) ? (
              <select
                value={vendedorId ?? ""}
                onChange={(e) =>
                  setVendedorId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="input-base w-full truncate"
              >
                <option value="">— Nenhum —</option>
                {vendedores.map((v) => (
                  <option key={v.id_vhsys} value={v.id_vhsys}>
                    {v.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="min-w-0 overflow-hidden">
                <input
                  type="text"
                  value={
                    vendedores.find((v) => v.id_vhsys === vendedorId)?.nome ??
                    profile.nome
                  }
                  disabled
                  title={
                    vendedores.find((v) => v.id_vhsys === vendedorId)?.nome ??
                    profile.nome
                  }
                  className="input-base w-full truncate"
                />
              </div>
            )}
          </div>

          {/* Número do orçamento */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nº do orçamento{" "}
              {!modoEdicao && (
                <span className="text-xs font-normal text-gray-400">(estimativa)</span>
              )}
            </label>
            <input
              type="text"
              readOnly
              value={modoEdicao ? (numeroExistente ?? proximoNumero) : proximoNumero}
              className="input-base w-full bg-gray-50"
            />
          </div>
        </div>
      </section>

      {/* ── 2. Produtos ──────────────────────────────────────────────────── */}
      <section>
        <SecaoTitulo titulo="Produtos" />

        {/* sem overflow-x-auto: ele criava um contexto de recorte que cortava
            o dropdown do autocomplete de produto. Em telas estreitas a página
            rola horizontalmente, o que é aceitável para uso interno. */}
        <div>
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-2 pr-2 w-8">#</th>
                <th className="pb-2 pr-2">Produto / Código</th>
                <th className="pb-2 pr-2 w-20 text-right">Qtde.</th>
                <th className="pb-2 pr-2 w-20 text-right">IPI %</th>
                <th className="pb-2 pr-2 w-20 text-right">ICMS %</th>
                <th className="pb-2 pr-2 w-28 text-right">Valor unit.</th>
                <th className="pb-2 pr-2 w-28 text-right">Valor total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item, idx) => {
                const totalLinha = item.qtde * item.valorUnit;
                return (
                  <tr key={item.key} className="align-top">
                    <td className="py-2 pr-2 pt-4 text-xs text-gray-400 font-medium">
                      {idx + 1}.
                    </td>
                    <td className="py-2 pr-2 min-w-[220px]">
                      <AutocompleteVhsys<ProdutoOpcao>
                        endpoint="/api/buscar-produtos"
                        placeholder="Buscar produto..."
                        value={item.produtoQuery}
                        onChange={(texto) => {
                          if (texto.trim() === "") {
                            // Apagar o nome limpa o produto da linha (zera valor/código/id).
                            atualizarItemMulti(item.key, {
                              produtoQuery: "",
                              descProduto: "",
                              codProduto: "",
                              idProduto: undefined,
                              valorUnit: 0,
                            });
                          } else {
                            atualizarItemMulti(item.key, {
                              produtoQuery: texto,
                              descProduto: texto,
                              idProduto: undefined,
                            });
                          }
                        }}
                        onSelecionar={(p) => {
                          atualizarItem(item.key, "produtoQuery", p.descricao);
                          atualizarItem(item.key, "descProduto", p.descricao);
                          atualizarItem(item.key, "codProduto", p.codigo ?? "");
                          atualizarItem(item.key, "idProduto", p.id_vhsys);
                          atualizarItem(
                            item.key,
                            "valorUnit",
                            Number(p.valor) || 0
                          );
                        }}
                        renderOpcao={(p) => (
                          <>
                            <span className="font-medium">{p.descricao}</span>
                            {p.codigo && (
                              <span className="ml-2 text-xs text-gray-400">
                                {p.codigo}
                              </span>
                            )}
                          </>
                        )}
                      />
                      {item.codProduto && (
                        <span className="mt-0.5 block text-xs text-gray-400">
                          Cód. {item.codProduto}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <InputInteiro
                        value={item.qtde}
                        onChange={(n) => atualizarItem(item.key, "qtde", n)}
                        min={1}
                        placeholder="Qtde"
                        className="w-20 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <InputValor
                        value={item.ipi}
                        onChange={(n) => atualizarItem(item.key, "ipi", n)}
                        placeholder="0,00"
                        className="w-20 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <InputValor
                        value={item.icms}
                        onChange={(n) => atualizarItem(item.key, "icms", n)}
                        placeholder="0,00"
                        className="w-20 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <InputValor
                        value={item.valorUnit}
                        onChange={(n) => atualizarItem(item.key, "valorUnit", n)}
                        placeholder="0,00"
                        className="w-28 text-right"
                      />
                    </td>
                    <td className="py-2 pr-2 pt-4 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatBRL(totalLinha)}
                    </td>
                    <td className="py-2 pt-4">
                      <button
                        type="button"
                        onClick={() => removerItem(item.key)}
                        className="text-gray-400 hover:text-red-600"
                        title="Remover produto"
                        aria-label="Remover produto"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={adicionarItem}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          + adicionar outro produto
        </button>
      </section>

      {/* ── 3. Totais ─────────────────────────────────────────────────────── */}
      <section>
        <SecaoTitulo titulo="Totais do orçamento" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Valor dos produtos (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor dos produtos
            </label>
            <input
              type="text"
              readOnly
              value={formatBRL(valorProdutos)}
              className="input-base w-full bg-gray-50"
            />
          </div>

          {/* Valor do IPI (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor do IPI
            </label>
            <input
              type="text"
              readOnly
              value={formatBRL(valorIPI)}
              className="input-base w-full bg-gray-50"
            />
          </div>

          {/* Valor do frete */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor do frete
            </label>
            <InputValor
              value={freteValor}
              onChange={setFreteValor}
              placeholder="0,00"
              className="w-full"
            />
          </div>

          {/* Desconto */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor do desconto
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
                  R$
                </span>
                <InputValor
                  value={descontoReais}
                  onChange={setDescontoReais}
                  placeholder="0,00"
                  className="w-full pl-9"
                />
              </div>
              <div className="relative w-24">
                <InputValor
                  value={descontoPorc}
                  onChange={(n) => {
                    setDescontoPorc(n);
                    // Calcula desconto em R$ sobre o subtotal (produtos + IPI)
                    const subtotal = valorProdutos + valorIPI;
                    if (n > 0 && subtotal > 0) {
                      setDescontoReais(Math.round((subtotal * n) / 100 * 100) / 100);
                    }
                  }}
                  placeholder="0,00"
                  className="w-full pr-6"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Peso Bruto */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Peso Bruto (kg)
            </label>
            <InputValor
              value={pesoBruto}
              onChange={setPesoBruto}
              placeholder="0,00"
              className="w-full"
            />
          </div>

          {/* Peso Líquido */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Peso Líquido (kg)
            </label>
            <InputValor
              value={pesoLiq}
              onChange={setPesoLiq}
              placeholder="0,00"
              className="w-full"
            />
          </div>

          {/* Valor total DESTACADO (read-only) */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Valor total do orçamento
            </label>
            <input
              type="text"
              readOnly
              value={formatBRL(valorTotal)}
              className="input-base w-full bg-green-50 border-green-400 text-green-800 font-semibold text-base"
            />
          </div>
        </div>
      </section>

      {/* ── 5. Transporte ─────────────────────────────────────────────────── */}
      <section>
        <SecaoTitulo titulo="Transporte" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Modalidade de frete */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Modalidade de frete
            </label>
            <select
              value={fretePor}
              onChange={(e) => handleFretePorChange(e.target.value as "" | "0" | "1" | "9")}
              className="input-base w-full"
            >
              <option value="">— Selecione —</option>
              <option value="0">Remetente</option>
              <option value="1">Destinatário</option>
              <option value="9">Sem frete</option>
            </select>
          </div>

          {/* Transportadora */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Transportadora
            </label>
            <AutocompleteVhsys<TransportadoraOpcao>
              endpoint="/api/buscar-transportadoras"
              placeholder={
                fretePor === ""
                  ? "Selecione a modalidade de frete primeiro"
                  : semFrete
                    ? "Sem frete — transportadora não se aplica"
                    : "Buscar transportadora..."
              }
              minChars={0}
              value={transportadoraQuery}
              disabled={transportadoraBloqueada}
              onChange={(texto) => {
                setTransportadoraQuery(texto);
                setTransportadoraNome(texto);
                setTransportadoraId(undefined);
              }}
              onSelecionar={(t) => {
                setTransportadoraQuery(t.nome);
                setTransportadoraNome(t.nome);
                setTransportadoraId(t.id_vhsys);
              }}
              renderOpcao={(t) => (
                <span className="font-medium">{t.nome}</span>
              )}
            />
          </div>
        </div>
      </section>

      {/* ── 6. Detalhes do orçamento ──────────────────────────────────────── */}
      <section>
        <SecaoTitulo titulo="Detalhes do orçamento" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Data do orçamento */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Data do orçamento
            </label>
            <input
              type="date"
              value={dataOrcamento}
              onChange={(e) => setDataOrcamento(e.target.value)}
              className="input-base w-full"
            />
          </div>

          {/* Prazo de entrega (opcional) — string para permitir vazio */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Prazo de entrega (dias){" "}
              <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={prazoEntrega}
              onChange={(e) => setPrazoEntrega(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex.: 7"
              className="input-base w-full"
            />
          </div>

          {/* Validade (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Validade do orçamento{" "}
              <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className="input-base w-full"
            />
          </div>

          {/* Referência */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Referência
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              maxLength={100}
              placeholder="Referência interna"
              className="input-base w-full"
            />
          </div>

          {/* Observações */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Esta informação será impressa nas observações da nota."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <MensagensPadrao
              onSelecionar={(texto) =>
                setObs((prev) => (prev.trim() ? prev + "\n" + texto : texto))
              }
            />
          </div>

          {/* Observações internas */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observações internas
            </label>
            <textarea
              value={obsInterno}
              onChange={(e) => setObsInterno(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Esta informação é de uso interno e não será impressa."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </section>

      {/* ── Erro ──────────────────────────────────────────────────────────── */}
      {erro && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      {/* ── Rodapé ────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <BotaoNavegacao
          href="/orcamentos"
          className="btn-secondary"
          labelPending="Cancelando…"
        >
          Cancelar
        </BotaoNavegacao>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary disabled:opacity-50"
        >
          {isPending ? "Salvando…" : modoEdicao ? "Salvar alterações" : "Salvar"}
        </button>
      </div>

    </form>

    {/* ── Modal de cadastro de cliente (fora do form: evita submit por Enter) ── */}
    {modalClienteAberto && (
      <CadastroClienteModal
        onClose={() => setModalClienteAberto(false)}
        onCriado={(c) => {
          setClienteQuery(c.razao);
          setNomeCliente(c.razao);
          setIdCliente(c.id_vhsys);
          setModalClienteAberto(false);
        }}
      />
    )}
    </>
  );
}
