// Motor de sync dos catálogos VHSYS → espelho Supabase (SERVER-ONLY).
//
// - incremental: lista só registros com data_modificacao > cursor (com
//   sobreposição de segurança) e faz upsert por id_vhsys.
// - completo (reconciliação): relista tudo, inclusive lixeira=Sim, para
//   corrigir o que o incremental perdeu e propagar exclusões.

import { createAdminClient } from "../supabase/admin";
import { listarProdutos, listarClientes, listarVendedores, listarSituacoes } from "./catalogos";
import {
  listarPedidos,
  listarOrcamentos,
  listarContasReceber,
  listarNotasFiscais,
  buscarDataUltimoStatusPedido,
} from "./vendas";
import { situacaoEfetiva } from "./fluxo";
import { situacaoEfetivaOrcamento } from "./fluxo-orcamentos";
import type {
  VhsysProduto,
  VhsysCliente,
  VhsysVendedor,
  VhsysPedido,
  VhsysOrcamento,
  VhsysContaReceber,
  VhsysNotaFiscal,
  VhsysSituacao,
} from "./types";

export type ModoSync = "incremental" | "completo";

export interface ResultadoEntidade {
  entidade: string;
  registros: number;
  erro?: string;
}

// Sobreposição do cursor incremental: relê os últimos minutos para não
// perder registros modificados durante a execução anterior.
const SOBREPOSICAO_MS = 5 * 60 * 1000;

// Enriquecimento de data_situacao (só incremental): teto de pedidos cujo
// histórico de status é consultado por rodada e pausa de cortesia entre as
// chamadas (espelha o throttle de vhsysGetTodos). O incremental processa
// poucos pedidos; o CAP é só uma trava de segurança contra um pico anômalo.
const CAP_HISTORICO_STATUS = 200;
const PAUSA_HISTORICO_MS = 150;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function numeroOuNull(s: string | null | undefined): number | null {
  if (s === null || s === undefined || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// VHSYS usa "0000-00-00 00:00:00" como placeholder de "sem data"
function dataOuNull(s: string | null | undefined): string | null {
  if (!s || s.startsWith("0000-00-00")) return null;
  return s;
}

// Data (só YYYY-MM-DD) de um valor que pode vir como timestamp ou date.
function soDataOuNull(s: string | null | undefined): string | null {
  const v = dataOuNull(s);
  return v ? v.slice(0, 10) : null;
}

// Data da última mudança de situação do pedido (coluna data_situacao).
// A listagem GET /pedidos NÃO traz data_status — só o histórico de status.
// Por isso usamos o mesmo fallback do backfill: data_status (quando vier no
// payload) → data_mod_pedido → data_pedido. Assim a coluna nunca fica nula à
// toa só porque a listagem omitiu data_status.
function dataSituacaoPedido(p: VhsysPedido): string | null {
  const ds = typeof p.data_status === "string" ? p.data_status : null;
  return soDataOuNull(ds) ?? soDataOuNull(p.data_mod_pedido) ?? dataOuNull(p.data_pedido);
}

function paraLinhaProduto(registro: unknown) {
  const p = registro as VhsysProduto;
  return {
    id_vhsys: p.id_produto,
    codigo: p.cod_produto || null,
    descricao: p.desc_produto,
    marca: p.marca_produto || null,
    unidade: p.unidade_produto || null,
    valor: numeroOuNull(p.valor_produto),
    valor_custo: numeroOuNull(p.valor_custo_produto),
    estoque: numeroOuNull(p.estoque_produto),
    tipo: p.tipo_produto || null,
    status: p.status_produto || null,
    lixeira: p.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(p.data_cad_produto),
    data_mod_vhsys: dataOuNull(p.data_mod_produto),
    dados: p,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaCliente(registro: unknown) {
  const c = registro as VhsysCliente;
  return {
    id_vhsys: c.id_cliente,
    razao: c.razao_cliente,
    fantasia: c.fantasia_cliente || null,
    tipo_pessoa: c.tipo_pessoa || null,
    cnpj_cpf: c.cnpj_cliente || null,
    endereco: c.endereco_cliente || null,
    numero: c.numero_cliente || null,
    bairro: c.bairro_cliente || null,
    complemento: c.complemento_cliente || null,
    cep: c.cep_cliente || null,
    cidade: c.cidade_cliente || null,
    uf: c.uf_cliente || null,
    fone: c.fone_cliente || null,
    celular: c.celular_cliente || null,
    email: c.email_cliente || null,
    situacao: c.situacao_cliente || null,
    vendedor_id_vhsys: c.vendedor_cliente_id || null,
    lixeira: c.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(c.data_cad_cliente),
    data_mod_vhsys: dataOuNull(c.data_mod_cliente),
    dados: c,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaVendedor(registro: unknown) {
  const v = registro as VhsysVendedor;
  return {
    id_vhsys: v.id_vendedor,
    nome: v.razao_vendedor,
    fantasia: v.fantasia_vendedor || null,
    cnpj_cpf: v.cnpj_vendedor || null,
    fone: v.fone_vendedor || null,
    celular: v.celular_vendedor || null,
    email: v.email_vendedor || null,
    situacao: v.situacao_vendedor || null,
    lixeira: v.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(v.data_cad_vendedor),
    data_mod_vhsys: dataOuNull(v.data_mod_vendedor),
    dados: v,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaPedido(registro: unknown) {
  const p = registro as VhsysPedido;
  const efetiva = situacaoEfetiva(p.situacao || null, p.status_pedido || null);
  return {
    id_vhsys: p.id_ped,
    numero: p.id_pedido,
    cliente_id_vhsys: p.id_cliente || null,
    nome_cliente: p.nome_cliente,
    vendedor_id_vhsys: p.vendedor_pedido_id || null,
    vendedor_nome: p.vendedor_pedido || null,
    valor_total: numeroOuNull(p.valor_total_nota),
    frete: numeroOuNull(p.frete_pedido),
    desconto: numeroOuNull(p.desconto_pedido),
    situacao_id: efetiva.situacaoId,
    status_base: p.status_pedido || null,
    origem_situacao: efetiva.origem,
    data_pedido: dataOuNull(p.data_pedido),
    data_situacao: dataSituacaoPedido(p),
    prazo_entrega: p.prazo_entrega || null,
    referencia: p.referencia_pedido || null,
    obs: p.obs_pedido || null,
    lixeira: p.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(p.data_cad_pedido),
    data_mod_vhsys: dataOuNull(p.data_mod_pedido),
    dados: p,
    sincronizado_em: new Date().toISOString(),
  };
}

// Enriquece data_situacao dos pedidos com a DATA REAL da última mudança de
// situação, buscada do histórico (GET /pedidos/{id_ped}/status). SÓ no modo
// incremental (são poucos pedidos) — o completo iteraria milhares de pedidos e
// estouraria o tempo. NÃO rebaixa: prioridade (1) data exata do histórico →
// (2) valor já existente no espelho → (3) fallback data_mod/data_pedido. Assim
// o completo (exatas vazio) e o caso "sem histórico" preservam uma data exata
// previamente gravada em vez de sobrescrevê-la.
async function enriquecerPedidos(
  ativos: unknown[],
  modo: ModoSync,
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<number, Record<string, unknown>>> {
  const pedidos = ativos as VhsysPedido[];
  const ids = pedidos.map((p) => p.id_ped);

  // 1. Valores atuais no espelho (em chunks para não estourar o IN).
  const existentes = new Map<number, string | null>();
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const lote = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("vhsys_pedidos")
      .select("id_vhsys, data_situacao")
      .in("id_vhsys", lote);
    if (error) throw new Error(`ler data_situacao: ${error.message}`);
    for (const row of data ?? []) {
      existentes.set(row.id_vhsys as number, (row.data_situacao as string | null) ?? null);
    }
  }

  // 2. Datas exatas do histórico — só no incremental, com CAP e throttle.
  const exatas = new Map<number, string>();
  if (modo === "incremental") {
    if (pedidos.length > CAP_HISTORICO_STATUS) {
      console.warn(
        `enriquecerPedidos: ${pedidos.length} pedidos no incremental excede o CAP de ` +
          `${CAP_HISTORICO_STATUS}; buscando histórico só dos primeiros ${CAP_HISTORICO_STATUS}.`
      );
    }
    const alvo = pedidos.slice(0, CAP_HISTORICO_STATUS);
    for (let i = 0; i < alvo.length; i++) {
      const p = alvo[i];
      const d = await buscarDataUltimoStatusPedido(p.id_ped);
      if (d) exatas.set(p.id_ped, d);
      if (i < alvo.length - 1) await sleep(PAUSA_HISTORICO_MS);
    }
  }

  // 3. Resolve por prioridade exata → existente → fallback.
  const over = new Map<number, Record<string, unknown>>();
  for (const p of pedidos) {
    const ds = exatas.get(p.id_ped) ?? existentes.get(p.id_ped) ?? dataSituacaoPedido(p);
    over.set(p.id_ped, { data_situacao: ds });
  }
  return over;
}

function paraLinhaOrcamento(registro: unknown) {
  const o = registro as VhsysOrcamento;
  const efetiva = situacaoEfetivaOrcamento(o.situacao || null, o.status_pedido || null);
  return {
    id_vhsys: o.id_orcamento,
    numero: o.id_pedido,
    cliente_id_vhsys: o.id_cliente || null,
    nome_cliente: o.nome_cliente,
    vendedor_id_vhsys: o.vendedor_pedido_id || null,
    vendedor_nome: o.vendedor_pedido || null,
    valor_total: numeroOuNull(o.valor_total_nota),
    situacao_id: efetiva.situacaoId,
    status_base: o.status_pedido || null,
    origem_situacao: efetiva.origem,
    pedido_emitido: o.pedido_emitido === 1,
    data_orcamento: dataOuNull(o.data_pedido),
    validade: dataOuNull(o.validade_orcamento),
    referencia: o.referencia_pedido || null,
    obs: o.obs_pedido || null,
    lixeira: o.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(o.data_cad_pedido),
    data_mod_vhsys: dataOuNull(o.data_mod_pedido),
    dados: o,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaContaReceber(registro: unknown) {
  const c = registro as VhsysContaReceber;
  // Vínculo com pedido: id_registro cru NÃO é o número do pedido (colisão
  // entre origens — validado em 2026-06-11). O vínculo confiável vem de
  // identificacao "Ped_<id_ped>" (PK) e nome_conta "Pedido <numero>".
  // Contas NFe_/manuais ficam sem vínculo (lacuna conhecida).
  const pkMatch = (c.identificacao || "").match(/^Ped_(\d+)$/);
  const nfeMatch = (c.identificacao || "").match(/^NFe_(\d+)$/);
  const numeroMatch = (c.nome_conta || "").match(/^Pedido (\d+)$/);
  return {
    id_vhsys: c.id_conta_rec,
    id_registro: c.id_registro || null,
    pedido_id_vhsys: pkMatch ? Number(pkMatch[1]) : null,
    nfe_id_vhsys: nfeMatch ? Number(nfeMatch[1]) : null,
    pedido_numero: numeroMatch ? Number(numeroMatch[1]) : null,
    identificacao: c.identificacao || null,
    nome_conta: c.nome_conta || null,
    categoria: c.categoria_rec || null,
    cliente_nome: c.nome_cliente || null,
    valor: numeroOuNull(c.valor_rec) ?? 0,
    valor_pago: numeroOuNull(c.valor_pago) ?? 0,
    vencimento: dataOuNull(c.vencimento_rec),
    liquidado: c.liquidado_rec === "Sim",
    situacao_texto: c.situacao || null,
    data_pagamento: dataOuNull(c.data_pagamento),
    data_emissao: dataOuNull(c.data_emissao),
    lixeira: c.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(c.data_cad_rec),
    data_mod_vhsys: dataOuNull(c.data_mod_rec),
    dados: c,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaNotaFiscal(registro: unknown) {
  const n = registro as VhsysNotaFiscal;
  return {
    id_vhsys: n.id_venda,
    numero: n.id_pedido || null,
    pedido_id_vhsys: n.id_pedido_ref || null,
    cliente_id_vhsys: n.id_cliente || null,
    nome_cliente: n.nome_cliente || null,
    valor_total: numeroOuNull(n.valor_total_nota),
    nota_emitida: n.nota_emitida === 1,
    status_base: n.status_pedido || null,
    data_emissao: dataOuNull(n.data_emissao),
    lixeira: n.lixeira === "Sim",
    data_cad_vhsys: dataOuNull(n.data_cad_pedido),
    data_mod_vhsys: dataOuNull(n.data_mod_pedido),
    dados: n,
    sincronizado_em: new Date().toISOString(),
  };
}

function paraLinhaSituacao(registro: unknown) {
  const s = registro as VhsysSituacao & { entidade: string };
  return {
    id_vhsys: s.id_situacao,
    entidade: s.entidade,
    nome: s.nome_situacao,
    tipo_status: s.tipo_status,
    ordem: s.ordem,
    lixeira: s.lixeira === "Sim",
    dados: s,
    sincronizado_em: new Date().toISOString(),
  };
}

// GET /situacoes não aceita data_modificacao — sempre lista completa (poucos
// registros). As opções são ignoradas de propósito.
async function listarSituacoesFlat(): Promise<(VhsysSituacao & { entidade: string })[]> {
  const grupos = await listarSituacoes();
  return [
    ...grupos.Pedidos.map((s) => ({ ...s, entidade: "pedidos" })),
    ...grupos.Orcamentos.map((s) => ({ ...s, entidade: "orcamentos" })),
    ...grupos.OrdemServico.map((s) => ({ ...s, entidade: "ordem_servico" })),
  ];
}

const LOTE_UPSERT = 500;

async function upsertLotes(
  supabase: ReturnType<typeof createAdminClient>,
  tabela: string,
  linhas: Record<string, unknown>[]
) {
  for (let i = 0; i < linhas.length; i += LOTE_UPSERT) {
    const lote = linhas.slice(i, i + LOTE_UPSERT);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict: "id_vhsys" });
    if (error) throw new Error(`upsert ${tabela}: ${error.message}`);
  }
}

interface EntidadeSync {
  entidade: string;
  tabela: string;
  listar: (opcoes: { modificadosApos?: Date; lixeira?: "Sim" }) => Promise<unknown[]>;
  paraLinha: (registro: unknown) => Record<string, unknown>;
  /** Entidade sem suporte a data_modificacao/lixeira (sempre lista completa). */
  semIncremental?: boolean;
  /**
   * Sobrescritas opcionais por id_vhsys aplicadas às linhas dos registros
   * ATIVOS (não à lixeira) após paraLinha. Chave = id_vhsys. Usado para
   * enriquecer campos que exigem chamadas extras à API (ex.: data_situacao do
   * histórico de status dos pedidos no incremental).
   */
  enriquecer?: (
    ativos: unknown[],
    modo: ModoSync,
    supabase: ReturnType<typeof createAdminClient>
  ) => Promise<Map<number, Record<string, unknown>>>;
}

const ENTIDADES: EntidadeSync[] = [
  { entidade: "situacoes", tabela: "vhsys_situacoes", listar: listarSituacoesFlat, paraLinha: paraLinhaSituacao, semIncremental: true },
  { entidade: "produtos", tabela: "vhsys_produtos", listar: listarProdutos, paraLinha: paraLinhaProduto },
  { entidade: "clientes", tabela: "vhsys_clientes", listar: listarClientes, paraLinha: paraLinhaCliente },
  { entidade: "vendedores", tabela: "vhsys_vendedores", listar: listarVendedores, paraLinha: paraLinhaVendedor },
  { entidade: "pedidos", tabela: "vhsys_pedidos", listar: listarPedidos, paraLinha: paraLinhaPedido, enriquecer: enriquecerPedidos },
  { entidade: "orcamentos", tabela: "vhsys_orcamentos", listar: listarOrcamentos, paraLinha: paraLinhaOrcamento },
  { entidade: "contas_receber", tabela: "vhsys_contas_receber", listar: listarContasReceber, paraLinha: paraLinhaContaReceber },
  { entidade: "notas_fiscais", tabela: "vhsys_notas_fiscais", listar: listarNotasFiscais, paraLinha: paraLinhaNotaFiscal },
];

/**
 * Sincroniza o espelho VHSYS (situações, catálogos, pedidos, orçamentos,
 * contas a receber).
 * Incremental usa o cursor de vhsys_sync_estado; sem cursor = pull inicial.
 * Completo ignora o cursor e inclui a lixeira (propaga exclusões).
 */
export async function sincronizarEspelho(modo: ModoSync): Promise<ResultadoEntidade[]> {
  const supabase = createAdminClient();
  const resultados: ResultadoEntidade[] = [];
  const inicioExecucao = new Date();

  for (const { entidade, tabela, listar, paraLinha, semIncremental, enriquecer } of ENTIDADES) {
    try {
      let modificadosApos: Date | undefined;
      if (modo === "incremental" && !semIncremental) {
        const { data: estado } = await supabase
          .from("vhsys_sync_estado")
          .select("ultima_sync_em")
          .eq("entidade", entidade)
          .maybeSingle();
        if (estado?.ultima_sync_em) {
          modificadosApos = new Date(new Date(estado.ultima_sync_em).getTime() - SOBREPOSICAO_MS);
        }
      }

      const ativos = await listar({ modificadosApos });
      let linhas = ativos.map(paraLinha);

      // Enriquecimento por entidade (só os ATIVOS; a lixeira nunca é enriquecida):
      // aplica sobrescritas por id_vhsys após paraLinha. Ex.: data_situacao exata
      // do histórico de status dos pedidos no incremental (não rebaixa).
      if (enriquecer) {
        const over = await enriquecer(ativos, modo, supabase);
        linhas = linhas.map((l) =>
          over.has(l.id_vhsys as number)
            ? { ...l, ...over.get(l.id_vhsys as number) }
            : l
        );
      }

      // Propaga exclusões feitas no VHSYS. IMPORTANTE: a varredura da lixeira NÃO
      // usa o cursor `modificadosApos` — o VHSYS não garante atualizar
      // `data_modificacao` ao mandar um registro para a lixeira, então filtrar por
      // data perderia exclusões. Varremos a lixeira INTEIRA em toda rodada
      // (inclusive no incremental) para que exclusões sumam do CRM em minutos, sem
      // depender do sync completo diário. A lixeira costuma ser pequena, então o
      // custo é baixo; se algum dia crescer muito, throttlar por tempo.
      if (!semIncremental) {
        const excluidos = await listar({ lixeira: "Sim" });
        linhas.push(...excluidos.map(paraLinha));
      }

      // Algumas listagens (ex.: produtos) já incluem itens da lixeira, e a
      // paginação por offset pode repetir registros se houver escrita
      // concorrente — dedup por id_vhsys (a última ocorrência vence) para
      // não quebrar o ON CONFLICT do upsert.
      const porId = new Map<unknown, Record<string, unknown>>();
      for (const linha of linhas) porId.set(linha.id_vhsys, linha);
      const linhasUnicas = Array.from(porId.values());

      await upsertLotes(supabase, tabela, linhasUnicas);

      const { error: erroEstado } = await supabase.from("vhsys_sync_estado").upsert(
        {
          entidade,
          ultima_sync_em: inicioExecucao.toISOString(),
          ...(modo === "completo" ? { ultima_reconciliacao_em: inicioExecucao.toISOString() } : {}),
          ultimo_resultado: { modo, registros: linhasUnicas.length, em: inicioExecucao.toISOString() },
        },
        { onConflict: "entidade" }
      );
      if (erroEstado) throw new Error(`estado ${entidade}: ${erroEstado.message}`);

      resultados.push({ entidade, registros: linhasUnicas.length });
    } catch (err) {
      resultados.push({
        entidade,
        registros: 0,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Reconciliação pós-loop (NÃO no upsert de cada conta): contas_receber
  // sincroniza ANTES de notas_fiscais (ver ENTIDADES), então o pedido_resolvido
  // de contas "NFe_" exige a nota já presente. Aqui ambas já foram upsertadas.
  const { error: erroReconc } = await supabase.rpc("reconciliar_pedido_resolvido");
  if (erroReconc) console.error(`reconciliar_pedido_resolvido: ${erroReconc.message}`);

  return resultados;
}
