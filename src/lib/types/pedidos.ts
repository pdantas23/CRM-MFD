// Linhas do espelho Supabase (supabase/vhsys_espelho_nucleo.sql).

export interface SituacaoRow {
  id_vhsys: number;
  entidade: "pedidos" | "orcamentos" | "ordem_servico";
  nome: string;
  tipo_status: string;
  ordem: number;
  lixeira: boolean;
}

export interface PedidoRow {
  id: string;
  id_vhsys: number;
  numero: number;
  cliente_id_vhsys: number | null;
  nome_cliente: string;
  vendedor_id_vhsys: number | null;
  vendedor_nome: string | null;
  valor_total: number | null;
  situacao_id: number | null;
  status_base: string | null;
  origem_situacao: "vhsys" | "legado";
  data_pedido: string | null;
  prazo_entrega: string | null;
  referencia: string | null;
  obs: string | null;
  data_mod_vhsys: string | null;
  lixeira: boolean;
}

export interface FinanceiroPedidoRow {
  pedido_id: string;
  numero: number;
  valor_total_pedido: number | null;
  total_contas: number;
  recebido: number;
  saldo: number;
  divergente: boolean;
}

export interface ClientePrefillRow {
  id_vhsys: number;
  cnpj_cpf: string | null;
  bairro: string | null;
  endereco: string | null;
  numero: string | null;
}

export interface OrcamentoRow {
  id: string;
  id_vhsys: number;
  numero: number;
  cliente_id_vhsys: number | null;
  nome_cliente: string;
  vendedor_id_vhsys: number | null;
  vendedor_nome: string | null;
  valor_total: number | null;
  situacao_id: number | null;
  status_base: string | null;
  origem_situacao: "vhsys" | "legado";
  pedido_emitido: boolean;
  data_orcamento: string | null;
  validade: string | null;
  referencia: string | null;
  obs: string | null;
  lixeira: boolean;
}

export interface PedidoKanban extends PedidoRow {
  financeiro: FinanceiroPedidoRow | null;
  cliente: ClientePrefillRow | null;
  entregaRegistrada: boolean;
}
