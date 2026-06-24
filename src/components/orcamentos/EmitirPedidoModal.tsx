"use client";
// Modal de "Emitir Pedido" a partir de um orçamento aprovado.
// Reaproveita o molde visual de NovoOrcamentoPageForm (seções Cliente/Vendedor,
// Produtos, Totais, Transporte, Detalhes) e ACRESCENTA a seção "Pagamento" com
// parcelas. Ao montar, pré-popula os campos buscando os 3 endpoints do orçamento
// em paralelo (orcamento-completo, orcamento-itens, orcamento-parcelas).

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { criarPedidoDeOrcamento } from "@/lib/vhsys/acoes";
import type {
  PayloadCriarPedido,
  PayloadItemPedido,
  PayloadParcelaPedido,
} from "@/lib/vhsys/types";
import type { OrcamentoRow } from "@/lib/types/pedidos";
import type { Profile } from "@/lib/types/database";
import { ehAdmin } from "@/lib/auth/roles";
import { AutocompleteVhsys } from "@/components/ui/AutocompleteVhsys";
import { InputValor } from "@/components/ui/InputValor";
import { InputInteiro } from "@/components/ui/InputInteiro";
import { ParcelasEditor, type ParcelaForm } from "./ParcelasEditor";
import { MensagensPadrao } from "./MensagensPadrao";
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
  idProduto: number | undefined;
  descProduto: string;
  codProduto: string;
  produtoQuery: string;
  qtde: number;
  ipi: number;
  icms: number;
  valorUnit: number;
}

// Respostas dos endpoints de pré-carregamento.
interface OrcamentoCompleto {
  id_cliente?: number;
  nome_cliente?: string;
  vendedor_id?: number;
  vendedor_nome?: string;
  data_pedido?: string;
  prazo_entrega?: string;
  referencia?: string;
  obs?: string;
  obs_interno?: string;
  desconto_reais?: number;
  desconto_porc?: number;
  frete_valor?: number;
  frete_por?: "" | "0" | "1" | "9";
  transportadora_id?: number;
  transportadora_nome?: string;
  peso_bruto?: number;
  peso_liq?: number;
}

interface ItemApi {
  id_ped_produto: number;
  id_produto: number;
  desc_produto: string;
  qtde_produto: string | number;
  valor_unit_produto: string | number;
  ipi_produto?: number;
  icms_produto?: number;
  cod_produto?: string;
  desconto_produto?: number;
}

interface ParcelaApi {
  data_parcela: string;
  valor_parcela: string | number;
  forma_pagamento?: string;
  observacoes_parcela?: string;
}

interface Props {
  orcamento: OrcamentoRow;
  profile: Profile;
  vendedores: { id_vhsys: number; nome: string }[];
  onClose: () => void;
  /** Chamado após emissão bem-sucedida (o pai faz refresh). */
  onEmitido: () => void;
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

// ── Helper: data de hoje como YYYY-MM-DD ─────────────────────────────────────

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

export function EmitirPedidoModal({
  orcamento,
  profile,
  vendedores,
  onClose,
  onEmitido,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const nextKey = useRef(10); // itens; parcelas usam contador próprio
  const parcelasKey = useRef(1000);

  // ── 1. Cliente (vem preenchido do orçamento) ────────────────────────────────
  const [clienteQuery, setClienteQuery] = useState(orcamento.nome_cliente ?? "");
  const [nomeCliente, setNomeCliente] = useState(orcamento.nome_cliente ?? "");
  const [idCliente, setIdCliente] = useState<number | undefined>(
    orcamento.cliente_id_vhsys ?? undefined
  );

  // ── Vendedor ────────────────────────────────────────────────────────────────
  const [vendedorId, setVendedorId] = useState<number | undefined>(
    profile.role === "vendedor"
      ? (profile.vendedor_id ?? undefined)
      : (orcamento.vendedor_id_vhsys ?? undefined)
  );

  // ── 2. Itens de produto ─────────────────────────────────────────────────────
  const [itens, setItens] = useState<ItemLinha[]>([itemVazio(nextKey.current++)]);

  function adicionarItem() {
    setItens((prev) => [...prev, itemVazio(nextKey.current++)]);
  }

  function removerItem(key: number) {
    setItens((prev) => {
      const filtrado = prev.filter((i) => i.key !== key);
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

  const temProduto = itens.some((i) => i.idProduto !== undefined);

  // ── 3. Totais ───────────────────────────────────────────────────────────────
  const [freteValor, setFreteValor] = useState(0);
  const [descontoReais, setDescontoReais] = useState(0);
  const [descontoPorc, setDescontoPorc] = useState(0);
  const [pesoBruto, setPesoBruto] = useState(0);
  const [pesoLiq, setPesoLiq] = useState(0);

  const valorProdutos = useMemo(
    () => itens.reduce((s, i) => s + i.qtde * i.valorUnit, 0),
    [itens]
  );

  const valorIPI = useMemo(
    () => itens.reduce((s, i) => s + i.qtde * i.valorUnit * (i.ipi / 100), 0),
    [itens]
  );

  const valorTotal = valorProdutos + valorIPI + freteValor - descontoReais;

  // ── 4. Pagamento (parcelas) ─────────────────────────────────────────────────
  // Inicia SEM parcelas: a linha só aparece após gerar (botão) ou adicionar.
  const [qtdParcelas, setQtdParcelas] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);

  // Mantém o contador "Quantidade de parcelas" em sincronia com a lista.
  function handleParcelasChange(novas: ParcelaForm[]) {
    setParcelas(novas);
    setQtdParcelas(String(novas.length));
  }

  function gerarParcelas(qtd: number) {
    if (qtd <= 0) { setParcelas([]); return; }
    const valorParcela = valorTotal > 0 ? valorTotal / qtd : 0;
    const novas: ParcelaForm[] = Array.from({ length: qtd }, (_, idx) => {
      const d = new Date();
      d.setMonth(d.getMonth() + idx + 1);
      const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        key: parcelasKey.current++,
        data,
        valor: valorParcela,
        formaPagamento: "Boleto",
        observacao: "",
      };
    });
    setParcelas(novas);
  }

  // ── 5. Transporte ───────────────────────────────────────────────────────────
  const [fretePor, setFretePor] = useState<"" | "0" | "1" | "9">("");
  const [transportadoraQuery, setTransportadoraQuery] = useState("");
  const [transportadoraId, setTransportadoraId] = useState<number | undefined>(undefined);
  const [transportadoraNome, setTransportadoraNome] = useState("");

  const semFrete = fretePor === "9";
  // Transportadora só é selecionável após escolher uma modalidade com frete
  // (Remetente/Destinatário). Bloqueada sem modalidade ou com "Sem frete".
  const transportadoraBloqueada = fretePor === "" || semFrete;

  function handleFretePorChange(valor: "" | "0" | "1" | "9") {
    setFretePor(valor);
    if (valor === "" || valor === "9") {
      setTransportadoraQuery("");
      setTransportadoraId(undefined);
      setTransportadoraNome("");
    }
  }

  // ── 6. Detalhes ─────────────────────────────────────────────────────────────
  const [dataPedido, setDataPedido] = useState(hojeISO);
  // prazoEntrega como string para permitir vazio (campo opcional)
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [obs, setObs] = useState("");
  const [obsInterno, setObsInterno] = useState("");

  // ── Pré-carregamento (3 endpoints em paralelo) ──────────────────────────────
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      try {
        const [resCompleto, resItens, resParcelas] = await Promise.all([
          fetch(`/api/orcamento-completo/${orcamento.id_vhsys}`),
          fetch(`/api/orcamento-itens/${orcamento.id_vhsys}`),
          fetch(`/api/orcamento-parcelas/${orcamento.id_vhsys}`),
        ]);

        const completo = (await resCompleto.json()) as OrcamentoCompleto;
        const dadosItens = (await resItens.json()) as ItemApi[];
        const dadosParcelas = (await resParcelas.json()) as ParcelaApi[];

        if (cancelado) return;

        // Cliente
        if (completo.nome_cliente) {
          setClienteQuery(completo.nome_cliente);
          setNomeCliente(completo.nome_cliente);
        }
        if (completo.id_cliente) setIdCliente(completo.id_cliente);

        // Vendedor (admin pode reescolher; vendedor usa o próprio)
        if (ehAdmin(profile.role) && completo.vendedor_id) {
          setVendedorId(completo.vendedor_id);
        }

        // Produtos
        const itensCarregados: ItemLinha[] = dadosItens.map((i) => ({
          key: nextKey.current++,
          idProduto: i.id_produto,
          descProduto: i.desc_produto,
          codProduto: i.cod_produto ?? "",
          produtoQuery: i.desc_produto,
          qtde: Number(i.qtde_produto) || 1,
          ipi: Number(i.ipi_produto ?? 0),
          icms: Number(i.icms_produto ?? 0),
          valorUnit: Number(i.valor_unit_produto) || 0,
        }));
        setItens(
          itensCarregados.length > 0
            ? itensCarregados
            : [itemVazio(nextKey.current++)]
        );

        // Totais
        setFreteValor(Number(completo.frete_valor ?? 0));
        setDescontoReais(Number(completo.desconto_reais ?? 0));
        setDescontoPorc(Number(completo.desconto_porc ?? 0));
        setPesoBruto(Number(completo.peso_bruto ?? 0));
        setPesoLiq(Number(completo.peso_liq ?? 0));

        // Transporte
        if (completo.frete_por) setFretePor(completo.frete_por);
        if (completo.transportadora_id) setTransportadoraId(completo.transportadora_id);
        if (completo.transportadora_nome) {
          setTransportadoraQuery(completo.transportadora_nome);
          setTransportadoraNome(completo.transportadora_nome);
        }

        // Detalhes
        setDataPedido(completo.data_pedido || hojeISO());
        setPrazoEntrega(completo.prazo_entrega ?? "");
        // Vínculo com o orçamento de origem na observação ("Orçamento #N"),
        // igual ao pedido emitido nativamente. O backend garante esse marcador.
        const marcadorOrc = `Orçamento #${orcamento.numero}`;
        const obsOrc = (completo.obs ?? "").trim();
        setObs(obsOrc && !obsOrc.includes(marcadorOrc) ? `${marcadorOrc}\n${obsOrc}` : obsOrc || marcadorOrc);
        setObsInterno(completo.obs_interno ?? "");

        // Parcelas
        const parcelasCarregadas: ParcelaForm[] = dadosParcelas.map((p) => ({
          key: parcelasKey.current++,
          data: p.data_parcela,
          valor: Number(p.valor_parcela) || 0,
          formaPagamento: p.forma_pagamento || "Boleto",
          observacao: p.observacoes_parcela || "",
        }));
        if (parcelasCarregadas.length > 0) {
          setParcelas(parcelasCarregadas);
          setQtdParcelas(String(parcelasCarregadas.length));
        }
        // Se vier vazio, mantém a parcela inicial criada no useState.
      } catch {
        // Mantém os valores iniciais (cliente já vem das props) em caso de erro.
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamento.id_vhsys]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);

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

    const payload: PayloadCriarPedido = {
      nome_cliente: nomeCliente.trim(),
      ...(idCliente ? { id_cliente: idCliente } : {}),
      ...(dataPedido ? { data_pedido: dataPedido } : {}),
      ...(prazoEntrega !== "" ? { prazo_entrega: prazoEntrega } : {}),
      ...(obs.trim() ? { obs_pedido: obs.trim() } : {}),
      ...(obsInterno.trim() ? { obs_interno_pedido: obsInterno.trim() } : {}),
      ...(descontoReais > 0 ? { desconto_pedido: descontoReais.toFixed(2) } : {}),
      ...(freteValor > 0 ? { frete_pedido: freteValor.toFixed(2) } : {}),
      ...(pesoBruto > 0 ? { peso_total_nota: pesoBruto.toFixed(2) } : {}),
      ...(pesoLiq > 0 ? { peso_total_nota_liq: pesoLiq.toFixed(2) } : {}),
      ...(transportadoraId
        ? {
            id_transportadora: transportadoraId,
            ...(transportadoraNome.trim()
              ? { transportadora_pedido: transportadoraNome.trim() }
              : {}),
          }
        : {}),
      // NÃO enviar referencia_pedido (ocuparia o lugar do nome do cliente na
      // lista da VHSYS). O vínculo com o orçamento vai na observação ("Orçamento #N").
      // NÃO enviar frete_por (a API de pedido não tem esse campo) nem status.
    };

    // Vendedor: admin escolhe; vendedor usa o próprio via server action.
    if (ehAdmin(profile.role) && vendedorId) {
      const vend = vendedores.find((v) => v.id_vhsys === vendedorId);
      payload.vendedor_pedido_id = vendedorId;
      if (vend) payload.vendedor_pedido = vend.nome;
    }

    const itensMapped: PayloadItemPedido[] = itensFiltrados.map((i) => ({
      id_produto: i.idProduto!,
      desc_produto: i.descProduto,
      qtde_produto: i.qtde,
      valor_unit_produto: i.valorUnit,
      ...(i.ipi > 0 ? { ipi_produto: i.ipi } : {}),
      ...(i.icms > 0 ? { icms_produto: i.icms } : {}),
    }));

    const parcelasMapped: PayloadParcelaPedido[] = parcelas
      .filter((p) => p.data && p.valor > 0)
      .map((p) => ({
        data_parcela: p.data,
        valor_parcela: p.valor,
        ...(p.formaPagamento
          ? {
              forma_pagamento:
                p.formaPagamento as PayloadParcelaPedido["forma_pagamento"],
            }
          : {}),
        ...(p.observacao.trim()
          ? { observacoes_parcela: p.observacao.trim() }
          : {}),
      }));

    startTransition(async () => {
      const res = await criarPedidoDeOrcamento(
        orcamento.id_vhsys,
        payload,
        itensMapped,
        parcelasMapped.length > 0 ? parcelasMapped : undefined
      );
      if (!res.ok) {
        setErro(res.erro ?? "Erro ao emitir pedido.");
        return;
      }
      // Sucesso com ressalva (ex.: pedido auto-gerado pela VHSYS): a emissão é
      // válida, mas mantemos o modal aberto exibindo o aviso para o usuário ler;
      // o fechamento (com refresh) fica no botão "Concluir".
      if (res.aviso) {
        setAviso(res.aviso);
        return;
      }
      onEmitido();
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Emitir Pedido — Orçamento #{orcamento.numero}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {carregando ? (
          <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[75vh] space-y-8 overflow-y-auto px-6 py-5">

              {/* ── 1. Dados do pedido: Cliente / Vendedor / Número ──────────── */}
              <section>
                <SecaoTitulo titulo="Dados do pedido" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Cliente (vem do orçamento; sem link "Cadastrar cliente") */}
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
                  </div>

                  {/* Vendedor */}
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

                  {/* Número do pedido — gerado ao salvar */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nº do pedido
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="Gerado ao salvar"
                      className="input-base w-full bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </section>

              {/* ── 2. Produtos ──────────────────────────────────────────────── */}
              <section>
                <SecaoTitulo titulo="Produtos" />
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
                  className="mt-3 text-sm text-primary-600 hover:text-primary-800"
                >
                  + adicionar outro produto
                </button>
              </section>

              {/* ── 3. Totais do pedido ──────────────────────────────────────── */}
              <section>
                <SecaoTitulo titulo="Totais do pedido" />
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
                      Valor total do pedido
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

              {/* ── 4. Pagamento ─────────────────────────────────────────────── */}
              <section>
                <SecaoTitulo titulo="Pagamento" />
                <div className="mb-4 flex items-end gap-3">
                  <div className="w-32">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Quantidade de parcelas
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtdParcelas}
                      disabled={!temProduto}
                      onChange={(e) => setQtdParcelas(e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex.: 3"
                      className="input-base w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => gerarParcelas(Number(qtdParcelas))}
                    disabled={!temProduto || !qtdParcelas || Number(qtdParcelas) < 1}
                    className="btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50"
                    title={temProduto ? "Gerar parcelas" : "Adicione um produto primeiro"}
                    aria-label="Gerar parcelas"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>

                <ParcelasEditor
                  parcelas={parcelas}
                  onChange={handleParcelasChange}
                  nextKey={parcelasKey}
                  totalOrcamento={valorTotal > 0 ? valorTotal : undefined}
                  podeAdicionar={temProduto}
                />
              </section>

              {/* ── 5. Transporte ────────────────────────────────────────────── */}
              <section>
                <SecaoTitulo titulo="Transporte" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Modalidade de frete.
                      IMPORTANTE: a modalidade NÃO é enviada ao backend (a API de
                      pedido não tem frete_por). Serve apenas para habilitar/escolher
                      a transportadora. */}
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

              {/* ── 6. Detalhes do pedido ────────────────────────────────────── */}
              <section>
                <SecaoTitulo titulo="Detalhes do pedido" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Data do pedido */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Data do pedido
                    </label>
                    <input
                      type="date"
                      value={dataPedido}
                      onChange={(e) => setDataPedido(e.target.value)}
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

                  {/* O vínculo com o orçamento (Orçamento #N) aparece na observação
                      abaixo, no mesmo padrão do pedido emitido nativamente. */}

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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
              </section>

              {/* ── Erro / Aviso ─────────────────────────────────────────────── */}
              {erro && (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
              )}
              {aviso && (
                <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">{aviso}</p>
              )}
            </div>

            {/* Rodapé fixo */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              {aviso ? (
                // Sucesso com ressalva: só resta concluir (fecha + refresh no pai).
                <button
                  type="button"
                  onClick={onEmitido}
                  className="btn-primary"
                >
                  Concluir
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary disabled:opacity-50"
                  >
                    {isPending ? "Emitindo…" : "Salvar"}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
