// Leitura (GET) de pedidos, orçamentos e contas a receber do VHSYS.
// Endpoints em docs/vhsys/API_NOTES.md; shapes reais em docs/vhsys/raw/exemplos/.

import { vhsysGetTodos, formatarDataModificacao } from "./client";
import type {
  VhsysPedido,
  VhsysOrcamento,
  VhsysContaReceber,
  VhsysNotaFiscal,
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
