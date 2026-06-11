export type StatusVenda =
  | "aguardando_pagamento"
  | "pagamento_parcial"
  | "pagamento_completo";

export interface ItemVenda {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export interface Venda {
  id: string;
  nome_cliente: string;
  cpf_cnpj: string;
  contato: string;
  numero_orcamento: string;
  itens: ItemVenda[];
  valor_total: number;
  valor_pago: number;
  status: StatusVenda;
  data_venda: string;
  previsao_entrega: string | null;
  vendedor: string;
  bairro: string;
  endereco: string;
  observacoes: string;
  entrega_registrada: boolean;
  created_at: string;
}

export interface VendaFormData {
  nome_cliente: string;
  cpf_cnpj: string;
  contato: string;
  numero_orcamento: string;
  itens: ItemVenda[];
  valor_pago: number;
  status: StatusVenda;
  data_venda: string;
  previsao_entrega: string | null;
  vendedor: string;
  bairro: string;
  endereco: string;
  observacoes: string;
}
