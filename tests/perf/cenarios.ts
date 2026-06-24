// Registro central de cenários de performance.
//
// FASE 2: 6 grupos de cenários server-side medindo o núcleo CRU das ondas
// de carregamento do CRM — sem comCache, sem escrita no banco.
//
// Termo de busca escolhido: "silva"
//   Retorna ~294 pedidos e ~806 orçamentos (verificado contra o banco real),
//   garantindo que o caminho de filtro por nome seja exercitado sem retornar
//   zero linhas (o que tornaria a medição irrealista).

import type { Cenario } from "./harness";
import { criarClienteTeste, escopoAdminTeste, filtrosDeURL, CONTA_ID_TESTE, MODELO_ORC_TESTE } from "./client";
import {
  pedidosOnda1,
  pedidosOnda2,
  orcamentosOnda,
} from "@/lib/crm/carregar";

// Client compartilhado entre todos os cenários (criado uma vez por processo).
const supabase = criarClienteTeste();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de detecção de RPC ausente
// ─────────────────────────────────────────────────────────────────────────────

/** Detecta erro de "function not found" do PostgREST/Postgres. */
function ehFuncaoAusente(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("pgrst202") ||
    msg.includes("42883") ||
    msg.includes("function not found") ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  );
}

/** pular() que sonda a RPC e retorna true se ausente. */
function pularSeRpcAusente(
  rpcNome: string,
  params: Record<string, unknown>
): () => Promise<boolean> {
  return async () => {
    const { error } = await supabase.rpc(rpcNome, params).maybeSingle();
    return error ? ehFuncaoAusente(error) : false;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 1 — RPC pedidos_metricas direta
// ─────────────────────────────────────────────────────────────────────────────

// Parâmetros base para pedidos_metricas (período 30d, sem busca).
// Mapeamento: filtros.busca → p_busca, filtros.buscaNumero → p_numero,
// filtros.situacoes → p_situacoes, escopo.vendedorId → p_vendedor_id,
// filtros.ocultarLegado → p_ocultar_legado, filtros.soComSaldo → p_so_com_saldo,
// filtros.dataDe → p_data_de, filtros.dataAte → p_data_ate.

const filtros30dPedidos = filtrosDeURL("periodo=30d", "pedidos");
const filtros30dOrcamentos = filtrosDeURL("periodo=30d", "orcamentos");
const filtrosTudo = filtrosDeURL("periodo=tudo", "orcamentos");

const PARAMS_RPC_PEDIDOS_30D = {
  p_busca: null,
  p_numero: null,
  p_situacoes: null,
  p_vendedor_id: null,
  p_ocultar_legado: filtros30dPedidos.ocultarLegado,
  p_so_com_saldo: false,
  p_data_de: filtros30dPedidos.dataDe,
  p_data_ate: filtros30dPedidos.dataAte,
} as Record<string, unknown>;

export const rpcPedidos30d: Cenario = {
  nome: "rpc:pedidos:30d",
  pular: pularSeRpcAusente("pedidos_metricas", PARAMS_RPC_PEDIDOS_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "pedidos");
    await supabase
      .rpc("pedidos_metricas", {
        p_busca: null,
        p_numero: null,
        p_situacoes: null,
        p_vendedor_id: null,
        p_ocultar_legado: filtros.ocultarLegado,
        p_so_com_saldo: false,
        p_data_de: filtros.dataDe,
        p_data_ate: filtros.dataAte,
      })
      .maybeSingle();
  },
};

// Busca por "silva" — ~294 pedidos, exercita o caminho de filtro por nome.
export const rpcPedidosBusca: Cenario = {
  nome: "rpc:pedidos:busca",
  pular: pularSeRpcAusente("pedidos_metricas", PARAMS_RPC_PEDIDOS_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d&q=silva", "pedidos");
    await supabase
      .rpc("pedidos_metricas", {
        p_busca: filtros.buscaNumero === null && filtros.busca ? filtros.busca : null,
        p_numero: filtros.buscaNumero,
        p_situacoes: null,
        p_vendedor_id: null,
        p_ocultar_legado: filtros.ocultarLegado,
        p_so_com_saldo: false,
        p_data_de: filtros.dataDe,
        p_data_ate: filtros.dataAte,
      })
      .maybeSingle();
  },
};

// Mede a RPC com p_so_com_saldo=true (subconjunto com saldo > 0).
export const rpcPedidosSoComSaldo: Cenario = {
  nome: "rpc:pedidos:so-com-saldo",
  pular: pularSeRpcAusente("pedidos_metricas", PARAMS_RPC_PEDIDOS_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d&com_saldo=true", "pedidos");
    await supabase
      .rpc("pedidos_metricas", {
        p_busca: null,
        p_numero: null,
        p_situacoes: null,
        p_vendedor_id: null,
        p_ocultar_legado: filtros.ocultarLegado,
        p_so_com_saldo: true,
        p_data_de: filtros.dataDe,
        p_data_ate: filtros.dataAte,
      })
      .maybeSingle();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 2 — RPC orcamentos_metricas direta
// ─────────────────────────────────────────────────────────────────────────────

const PARAMS_RPC_ORC_30D = {
  p_busca: null,
  p_numero: null,
  p_situacoes: null,
  p_vendedor_id: null,
  p_pedido_emitido: null,
  p_data_de: filtros30dOrcamentos.dataDe,
  p_data_ate: filtros30dOrcamentos.dataAte,
} as Record<string, unknown>;

export const rpcOrcamentos30d: Cenario = {
  nome: "rpc:orcamentos:30d",
  pular: pularSeRpcAusente("orcamentos_metricas", PARAMS_RPC_ORC_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "orcamentos");
    await supabase
      .rpc("orcamentos_metricas", {
        p_busca: null,
        p_numero: null,
        p_situacoes: null,
        p_vendedor_id: null,
        p_pedido_emitido: null,
        p_data_de: filtros.dataDe,
        p_data_ate: filtros.dataAte,
      })
      .maybeSingle();
  },
};

// Busca por "silva" em orçamentos — ~806 registros, exercita o OR de nome.
export const rpcOrcamentosBusca: Cenario = {
  nome: "rpc:orcamentos:busca",
  pular: pularSeRpcAusente("orcamentos_metricas", PARAMS_RPC_ORC_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d&q=silva", "orcamentos");
    await supabase
      .rpc("orcamentos_metricas", {
        p_busca: filtros.buscaNumero === null && filtros.busca ? filtros.busca : null,
        p_numero: filtros.buscaNumero,
        p_situacoes: null,
        p_vendedor_id: null,
        p_pedido_emitido: null,
        p_data_de: filtros.dataDe,
        p_data_ate: filtros.dataAte,
      })
      .maybeSingle();
  },
};

// Período "tudo" — sem filtro de data, exercita todo o conjunto.
export const rpcOrcamentosTudo: Cenario = {
  nome: "rpc:orcamentos:tudo",
  pular: pularSeRpcAusente("orcamentos_metricas", PARAMS_RPC_ORC_30D),
  async rodar() {
    const filtros = filtrosDeURL("periodo=tudo", "orcamentos");
    await supabase
      .rpc("orcamentos_metricas", {
        p_busca: null,
        p_numero: null,
        p_situacoes: null,
        p_vendedor_id: null,
        p_pedido_emitido: null,
        p_data_de: filtros.dataDe,  // null (sem limite de data)
        p_data_ate: filtros.dataAte, // null
      })
      .maybeSingle();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 3 — Pedidos 1ª onda (todo o Promise.all: kanban + métricas + meta)
// ─────────────────────────────────────────────────────────────────────────────

export const ondaPedidos1_30d: Cenario = {
  nome: "onda:pedidos:1:30d",
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "pedidos");
    await pedidosOnda1(supabase, filtros, escopoAdminTeste);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 4 — Pedidos 2ª onda (financeiro + clientes + entregas dos cards)
//
// preparar() roda pedidosOnda1 UMA vez e guarda os pedidos visíveis.
// rodar() mede APENAS pedidosOnda2 — o tempo da onda 1 NÃO entra na medição.
// ─────────────────────────────────────────────────────────────────────────────

let pedidosVisiveis: import("@/lib/types/pedidos").PedidoRow[] = [];

export const ondaPedidos2_30d: Cenario = {
  nome: "onda:pedidos:2:30d",
  async preparar() {
    const filtros = filtrosDeURL("periodo=30d", "pedidos");
    const resultado = await pedidosOnda1(supabase, filtros, escopoAdminTeste);
    pedidosVisiveis = resultado.pedidos;
  },
  async rodar() {
    await pedidosOnda2(supabase, pedidosVisiveis, CONTA_ID_TESTE);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 5 — Orçamentos onda única (lista + count + métricas + meta em paralelo)
// ─────────────────────────────────────────────────────────────────────────────

export const ondaOrcamentos30d: Cenario = {
  nome: "onda:orcamentos:30d",
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "orcamentos");
    await orcamentosOnda(supabase, filtros, escopoAdminTeste, 1, true, MODELO_ORC_TESTE);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 6 — count exact vs planned para orçamentos
//
// Replica EXATAMENTE o select("*", { count, head: true }).eq("lixeira", false)
// com o mesmo predicado de período que orcamentosOnda usa para o count.
//
// count:orcamentos:exact:30d → count "exact" com filtro de 30 dias
//   (mesma rota que filtrosEstreitos=true usa em orcamentosOnda)
// count:orcamentos:planned:tudo → count "planned" sem filtro de data
//   (rota otimizada quando periodoPreset="tudo" e sem filtros estreitos)
//
// NOTA: em conexão remota (Supabase Cloud), a latência de rede (~400 ms RTT)
// domina ambos os contadores — planned ≈ exact. A vantagem do "planned" < 20ms
// vs exact só se manifesta em conexão LOCAL ao Postgres (sem RTT de rede).
// O cenário existe para monitorar REGRESSÃO de cada estratégia ao longo do
// tempo, não para comparar valores absolutos localmente.
// ─────────────────────────────────────────────────────────────────────────────

export const countExact30d: Cenario = {
  nome: "count:orcamentos:exact:30d",
  async rodar() {
    const filtros = filtrosDeURL("periodo=30d", "orcamentos");
    // Aplica EXATAMENTE o mesmo predicado que orcamentosOnda usa para o count
    // quando filtrosEstreitos=false e periodoPreset != "tudo" → countMode = "exact".
    await supabase
      .from("vhsys_orcamentos")
      .select("*", { count: "exact", head: true })
      .eq("lixeira", false)
      .gte("data_orcamento", filtros.dataDe!)
      .lte("data_orcamento", filtros.dataAte!);
  },
};

export const countPlannedTudo: Cenario = {
  nome: "count:orcamentos:planned:tudo",
  async rodar() {
    // Período "tudo" sem filtros estreitos → orcamentosOnda usa countMode = "planned".
    // Sem gte/lte de data (dataDe=null, dataAte=null quando periodoPreset="tudo").
    await supabase
      .from("vhsys_orcamentos")
      .select("*", { count: "planned", head: true })
      .eq("lixeira", false);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Registro final — ordem estável (chaves do baseline.json)
// ─────────────────────────────────────────────────────────────────────────────

export const cenarios: Cenario[] = [
  // Grupo 1: RPC pedidos_metricas
  rpcPedidos30d,
  rpcPedidosBusca,
  rpcPedidosSoComSaldo,
  // Grupo 2: RPC orcamentos_metricas
  rpcOrcamentos30d,
  rpcOrcamentosBusca,
  rpcOrcamentosTudo,
  // Grupo 3: onda 1 de pedidos
  ondaPedidos1_30d,
  // Grupo 4: onda 2 de pedidos
  ondaPedidos2_30d,
  // Grupo 5: onda única de orçamentos
  ondaOrcamentos30d,
  // Grupo 6: count exact vs planned
  countExact30d,
  countPlannedTudo,
];
