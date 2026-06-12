// Tipos das entidades VHSYS — ancorados nas respostas REAIS da API
// (docs/vhsys/raw/exemplos/) e nas specs OpenAPI (docs/vhsys/raw/).
// Campos monetários/quantidades chegam como string decimal ("14.890000").

export interface VhsysProduto {
  id_produto: number;
  id_registro: number;
  cod_produto: string;
  marca_produto: string;
  desc_produto: string;
  fornecedor_produto: string;
  estoque_produto: string;
  unidade_produto: string;
  valor_produto: string;
  valor_custo_produto: string;
  peso_produto: string;
  peso_liq_produto: string;
  ncm_produto: string;
  codigo_barra_produto: string;
  obs_produto: string;
  tipo_produto: string;
  tamanho_produto: string;
  status_produto: string;
  data_cad_produto: string;
  data_mod_produto: string | null;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysCliente {
  id_cliente: number;
  id_registro: number;
  tipo_pessoa: string;
  tipo_cadastro: string;
  cnpj_cliente: string;
  razao_cliente: string;
  fantasia_cliente: string;
  endereco_cliente: string;
  numero_cliente: string;
  bairro_cliente: string;
  complemento_cliente: string;
  cep_cliente: string;
  cidade_cliente: string;
  uf_cliente: string;
  contato_cliente: string;
  fone_cliente: string;
  celular_cliente: string;
  email_cliente: string;
  situacao_cliente: string;
  vendedor_cliente: string;
  vendedor_cliente_id: number;
  observacoes_cliente: string;
  data_cad_cliente: string;
  data_mod_cliente: string | null;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysVendedor {
  id_vendedor: number;
  id_registro: number;
  tipo_pessoa: string;
  cnpj_vendedor: string;
  razao_vendedor: string;
  fantasia_vendedor: string;
  cidade_vendedor: string;
  uf_vendedor: string;
  fone_vendedor: string;
  celular_vendedor: string;
  email_vendedor: string;
  situacao_vendedor: string;
  data_cad_vendedor: string;
  data_mod_vendedor: string | null;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysPedido {
  id_ped: number; // PK (sub-recursos da API)
  id_pedido: number; // número sequencial exibível
  id_cliente: number;
  nome_cliente: string;
  vendedor_pedido: string;
  vendedor_pedido_id: number;
  valor_total_produtos: string;
  desconto_pedido: string;
  frete_pedido: string;
  valor_total_nota: string;
  data_pedido: string;
  prazo_entrega: string;
  referencia_pedido: string;
  obs_pedido: string;
  obs_interno_pedido: string;
  status_pedido: string; // enum-base
  situacao: number | null; // id_situacao personalizado (null/0 = legado)
  data_cad_pedido: string;
  data_mod_pedido: string;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysOrcamento {
  id_orcamento: number; // PK
  id_pedido: number; // número sequencial do orçamento
  id_cliente: number;
  nome_cliente: string;
  vendedor_pedido: string;
  vendedor_pedido_id: number;
  valor_total_nota: string;
  data_pedido: string;
  validade_orcamento: string;
  referencia_pedido: string;
  obs_pedido: string;
  status_pedido: string; // enum-base
  situacao: number | null;
  pedido_emitido: number;
  data_cad_pedido: string;
  data_mod_pedido: string;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysContaReceber {
  id_conta_rec: number;
  id_registro: number; // = id_pedido (número sequencial) do pedido de origem
  identificacao: string; // "Ped_..." / "NFe_..."
  nome_conta: string;
  categoria_rec: string;
  id_cliente: number;
  nome_cliente: string;
  vencimento_rec: string;
  valor_rec: string;
  valor_pago: string;
  data_emissao: string;
  n_documento_rec: string;
  liquidado_rec: "Sim" | "Nao";
  data_pagamento: string | null;
  forma_pagamento: string;
  situacao: string | null; // "Conta Liquidada." — textual, NÃO usar p/ saldo
  status: number | null;
  valor_baixa: string;
  data_cad_rec: string;
  data_mod_rec: string;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

export interface VhsysNotaFiscal {
  id_venda: number; // PK da NF-e (casa com "NFe_<id>" das contas a receber)
  id_pedido: number; // número sequencial da NF ("NFe Venda N")
  id_pedido_ref: number; // id_ped (PK) do pedido de origem; 0 = NF avulsa
  id_cliente: number;
  nome_cliente: string;
  valor_total_nota: string;
  nota_emitida: number;
  status_pedido: string;
  data_emissao: string;
  data_cad_pedido: string;
  data_mod_pedido: string;
  lixeira: "Sim" | "Nao";
  [key: string]: unknown;
}

// GET /situacoes — endpoint não documentado publicamente (ver API_NOTES.md).
// tipo_pedido: 1 = Pedidos, 2 = Orçamentos.
export interface VhsysSituacao {
  id_situacao: number;
  id_empresa: number;
  tipo_pedido: number;
  tipo_status: "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";
  nome_situacao: string;
  ordem: number;
  data_cad: string;
  data_mod: string;
  lixeira: "Sim" | "Nao";
}

export interface VhsysSituacoesPorEntidade {
  Pedidos: VhsysSituacao[];
  Orcamentos: VhsysSituacao[];
  OrdemServico: VhsysSituacao[];
}

// ── Payloads de ESCRITA ────────────────────────────────────────────────────

/** POST /pedidos/{id_ped}/status */
export interface PayloadStatusPedido {
  data_status: string; // YYYY-MM-DD
  tipo_status: "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";
  obs_status?: string; // ≤255 chars
  /** Campo extra testado durante o teste controlado — pode não ser aceito pela API. */
  situacao?: number;
}

/** POST /orcamentos/{id}/status */
export interface PayloadStatusOrcamento {
  data_status: string;
  tipo_status: "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";
  obs_status?: string;
}

/** POST /pedidos — campos mínimos para criar pedido de teste ou emitir de orçamento. */
export interface PayloadCriarPedido {
  nome_cliente: string;
  id_cliente?: number;
  vendedor_pedido?: string;
  vendedor_pedido_id?: number;
  data_pedido?: string;
  referencia_pedido?: string;
  obs_pedido?: string;
  status_pedido?: string;
  estoque_pedido?: 0 | 1;
  contas_pedido?: 0 | 1;
}

/** POST /pedidos/{id_ped}/produtos */
export interface PayloadItemPedido {
  id_produto: number;
  desc_produto: string;
  qtde_produto: number;
  valor_unit_produto: number;
  desconto_produto?: number;
}

/** PUT /orcamentos/{id_orcamento} — campos usados ao marcar Atendido */
export interface PayloadAtualizarOrcamento {
  status_pedido?: string;
}

// ── Payloads de criação/edição de orçamento ────────────────────────────────

/** POST /orcamentos — campos aceitos pela API (somente nome_cliente obrigatório). */
export interface PayloadCriarOrcamento {
  nome_cliente: string;
  id_cliente?: number;
  vendedor_pedido?: string;
  vendedor_pedido_id?: number;
  data_pedido?: string;          // YYYY-MM-DD
  validade_orcamento?: string;   // YYYY-MM-DD
  obs_pedido?: string;
  referencia_pedido?: string;
  status_pedido?: string;        // "Em Aberto" padrão
}

/** POST /orcamentos/{id}/produtos — item de orçamento. */
export interface PayloadItemOrcamento {
  id_produto: number;
  desc_produto: string;
  qtde_produto: number;
  valor_unit_produto: number;
  desconto_produto?: number;
}

/** Diferença de itens para edição: itens a deletar (id_ped_produto) e itens a inserir. */
export interface ItensDiff {
  deletar: number[];                    // id_ped_produto dos itens removidos
  inserir: PayloadItemOrcamento[];      // itens novos a adicionar
}

/** Resposta de POST /orcamentos com id_orcamento gerado. */
export interface RespostaCriarOrcamento {
  id_orcamento: number;
  id_pedido: number;   // número sequencial
  nome_cliente: string;
  [key: string]: unknown;
}

/** Resposta de POST /pedidos (data[] traz objeto com id_ped e id_pedido). */
export interface RespostaCriarPedido {
  id_ped: number;
  id_pedido: number;
  [key: string]: unknown;
}

/** Resposta de POST /pedidos/{id}/status */
export interface RespostaStatusPedido {
  data_status: string;
  obs_status: string;
  tipo_status: string;
  id_pedido: number;
}
