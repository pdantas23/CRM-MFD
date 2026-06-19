// Leitura (GET) de pedidos, orçamentos e contas a receber do VHSYS.
// Endpoints em docs/vhsys/API_NOTES.md; shapes reais em docs/vhsys/raw/exemplos/.

import { vhsysGet, vhsysGetTodos, formatarDataModificacao } from "./client";
import type {
  VhsysPedido,
  VhsysOrcamento,
  VhsysContaReceber,
  VhsysNotaFiscal,
  ItemHistoricoStatusPedido,
} from "./types";

interface OpcoesListagem {
  modificadosApos?: Date;
  lixeira?: "Sim";
}

function paramsDe(opcoes: OpcoesListagem): Record<string, string | undefined> {
  return {
    data_modificacao: opcoes.modificadosApos
      ? formatarDataModificacao(opcoes.modificadosApos)
      : undefined,
    lixeira: opcoes.lixeira,
  };
}

export function listarPedidos(opcoes: OpcoesListagem = {}): Promise<VhsysPedido[]> {
  return vhsysGetTodos<VhsysPedido>("/pedidos", paramsDe(opcoes));
}

export function listarOrcamentos(opcoes: OpcoesListagem = {}): Promise<VhsysOrcamento[]> {
  return vhsysGetTodos<VhsysOrcamento>("/orcamentos", paramsDe(opcoes));
}

export function listarContasReceber(opcoes: OpcoesListagem = {}): Promise<VhsysContaReceber[]> {
  return vhsysGetTodos<VhsysContaReceber>("/contas-receber", paramsDe(opcoes));
}

export function listarNotasFiscais(opcoes: OpcoesListagem = {}): Promise<VhsysNotaFiscal[]> {
  return vhsysGetTodos<VhsysNotaFiscal>("/notas-fiscais", paramsDe(opcoes));
}

// VHSYS usa "0000-00-00" como placeholder de "sem data".
function dataStatusValida(s: string | null | undefined): string | null {
  if (!s || s.startsWith("0000-00-00")) return null;
  // Espera YYYY-MM-DD; normaliza para os 10 primeiros caracteres por segurança.
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/**
 * Busca a data REAL da última mudança de situação de um pedido a partir do
 * histórico (GET /pedidos/{id_ped}/status). Escolhe o item de MAIOR id_status
 * (mais recente) e retorna seu data_status (YYYY-MM-DD), ou null se não houver
 * histórico / data inválida. Best-effort: nunca relança erro de rede (o sync
 * cai no fallback). 403 "Nenhum status…" já vem como data: [] do client.
 */
export async function buscarDataUltimoStatusPedido(idPed: number): Promise<string | null> {
  try {
    const { data } = await vhsysGet<ItemHistoricoStatusPedido>(`/pedidos/${idPed}/status`);
    if (!data.length) return null;
    const maisRecente = data.reduce((a, b) => (b.id_status > a.id_status ? b : a));
    return dataStatusValida(maisRecente.data_status);
  } catch {
    return null;
  }
}
