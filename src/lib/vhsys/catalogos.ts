// Leitura (GET) dos catálogos VHSYS. Endpoints em docs/vhsys/API_NOTES.md.

import { vhsysGet, vhsysGetTodos, corrigirEncoding, formatarDataModificacao } from "./client";
import type {
  VhsysProduto,
  VhsysCliente,
  VhsysVendedor,
  VhsysSituacao,
  VhsysSituacoesPorEntidade,
} from "./types";

interface OpcoesListagem {
  /** Só registros criados/modificados após esta data (sync incremental). */
  modificadosApos?: Date;
  /** "Sim" lista os registros da lixeira (para propagar exclusões). */
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

export function listarProdutos(opcoes: OpcoesListagem = {}): Promise<VhsysProduto[]> {
  return vhsysGetTodos<VhsysProduto>("/produtos", paramsDe(opcoes));
}

export function listarClientes(opcoes: OpcoesListagem = {}): Promise<VhsysCliente[]> {
  return vhsysGetTodos<VhsysCliente>("/clientes", paramsDe(opcoes));
}

export function listarVendedores(opcoes: OpcoesListagem = {}): Promise<VhsysVendedor[]> {
  return vhsysGetTodos<VhsysVendedor>("/vendedores", paramsDe(opcoes));
}

/** Busca de produtos por descrição (autocomplete da Fase 2). */
export function buscarProdutos(termo: string, limite = 20): Promise<VhsysProduto[]> {
  return vhsysGet<VhsysProduto>("/produtos", { desc_produto: termo, limit: limite }).then(
    (r) => r.data
  );
}

/**
 * Situações personalizadas da conta (GET /situacoes — não documentado
 * publicamente; ver API_NOTES.md). Corrige o encoding duplo dos nomes.
 */
export async function listarSituacoes(): Promise<VhsysSituacoesPorEntidade> {
  const { data } = await vhsysGet<VhsysSituacoesPorEntidade>("/situacoes");
  const grupos = data[0] ?? { Pedidos: [], Orcamentos: [], OrdemServico: [] };
  const corrigir = (s: VhsysSituacao[]) =>
    (s ?? []).map((x) => ({ ...x, nome_situacao: corrigirEncoding(x.nome_situacao) }));
  return {
    Pedidos: corrigir(grupos.Pedidos),
    Orcamentos: corrigir(grupos.Orcamentos),
    OrdemServico: corrigir(grupos.OrdemServico),
  };
}
