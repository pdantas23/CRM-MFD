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

/**
 * POST /clientes — campos enviados pelo modal de cadastro de cliente.
 * Apenas razao_cliente é obrigatório; o restante é opcional.
 */
export interface PayloadCriarCliente {
  razao_cliente: string;             // obrigatório, ≤255 chars
  tipo_pessoa?: "PJ" | "PF";         // padrão PJ
  tipo_cadastro?: "Cliente" | "Fornecedor" | "Ambos"; // padrão Cliente
  cnpj_cliente?: string;             // ≤18 chars
  insc_estadual_cliente?: string;    // ≤45 chars
  fantasia_cliente?: string;         // ≤255 chars
  celular_cliente?: string;          // ≤20 chars
  fone_cliente?: string;             // ≤20 chars
  email_cliente?: string;            // ≤255 chars
  cep_cliente?: string;              // ≤10 chars
  endereco_cliente?: string;         // ≤255 chars
  numero_cliente?: string;           // ≤7 chars
  bairro_cliente?: string;           // ≤45 chars
  cidade_cliente?: string;           // ≤255 chars
  uf_cliente?: string;               // ≤2 chars
  complemento_cliente?: string;      // ≤45 chars
  data_nasc_cliente?: string;        // só PF — formato YYYY-MM-DD
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

/**
 * Transportadora retornada pelo GET /transportadoras.
 * Campos confirmados contra a resposta real da API VHSYS.
 */
export interface VhsysTransportadora {
  id_transportadora: number;
  id_registro: number;
  /** Nome/razão social da transportadora. */
  desc_transportadora: string;
  /** Nome fantasia (pode vir null). */
  fantasia_transportadora?: string | null;
  situacao_transportadora?: string;
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
  /**
   * Campo extra VALIDADO em teste controlado (2026-06-15, orçamento descartável
   * id 11525812): /orcamentos/status aceita "situacao" e o registra (a resposta
   * ecoa o id enviado). Em orçamentos o tipo_status já é 1:1 com a situação
   * (860=Em Aberto, 768=Atendido, 769=Cancelado), mas enviar situacao é inócuo
   * e mantém o padrão de /pedidos/status.
   */
  situacao?: number;
}

/**
 * POST /pedidos — campos aceitos pela API (somente nome_cliente obrigatório).
 * Monetários/pesos como STRING decimal, espelhando PayloadCriarOrcamento.
 * Não inclui frete_por_pedido nem fiscais do cabeçalho — não os enviamos.
 */
export interface PayloadCriarPedido {
  // Identificação
  nome_cliente: string;            // obrigatório, ≤255 chars
  id_cliente?: number;
  vendedor_pedido?: string;        // ≤255 chars
  vendedor_pedido_id?: number;
  data_pedido?: string;            // YYYY-MM-DD
  prazo_entrega?: string;          // prazo de entrega (dias) ≤20 chars
  referencia_pedido?: string;      // ≤100 chars
  obs_pedido?: string;
  obs_interno_pedido?: string;     // observação interna
  status_pedido?: "Em Aberto" | "Em Andamento" | "Atendido" | "Cancelado";

  // Comercial
  desconto_pedido?: string;        // valor decimal, ex: "10.00"

  // Frete / peso
  frete_pedido?: string;           // valor do frete (decimal)
  peso_total_nota?: string;        // peso total (decimal)
  peso_total_nota_liq?: string;    // peso líquido (decimal)
  transportadora_pedido?: string;  // ≤255 chars
  id_transportadora?: number;

  // Flags de lançamento
  estoque_pedido?: 0 | 1;          // 0=Não, 1=Sim (padrão 0)
  contas_pedido?: 0 | 1;           // 0=Não, 1=Sim (padrão 0)
}

/** POST /pedidos/{id_ped}/produtos — item de pedido. */
export interface PayloadItemPedido {
  id_produto: number;
  desc_produto: string;
  qtde_produto: number;
  valor_unit_produto: number;
  desconto_produto?: number;
  ipi_produto?: number;
  icms_produto?: number;
}

/** PUT /orcamentos/{id_orcamento} — campos usados ao marcar Atendido */
export interface PayloadAtualizarOrcamento {
  status_pedido?: string;
}

// ── Payloads de criação/edição de orçamento ────────────────────────────────

/** POST /orcamentos — campos aceitos pela API (somente nome_cliente obrigatório). */
export interface PayloadCriarOrcamento {
  // Identificação
  nome_cliente: string;          // obrigatório
  id_cliente?: number;
  vendedor_pedido?: string;
  vendedor_pedido_id?: number;
  data_pedido?: string;          // YYYY-MM-DD
  validade_orcamento?: string;   // YYYY-MM-DD
  obs_pedido?: string;
  status_pedido?: string;        // "Em Aberto" padrão

  // Comercial
  desconto_pedido?: string;       // valor decimal ≤12 chars, ex: "10.00"
  desconto_pedido_porc?: string;  // percentual decimal ≤100 chars, ex: "5.00"
  prazo_orcamento?: number;       // prazo de entrega em dias (inteiro ≥0)
  referencia_pedido?: string;     // ≤100 chars
  valor_total_produtos?: number;  // valor total dos produtos
  valor_total_nota?: string;      // valor total da nota ≤13 chars
  obs_interno_pedido?: string;    // observação interna

  // Frete
  frete_pedido?: string;          // valor do frete ≤12 chars
  frete_por_pedido?: 0 | 1 | 9;  // 0=Remetente, 1=Destinatário, 9=Sem frete
  peso_total_nota?: string;       // peso total ≤12 chars
  peso_total_nota_liq?: string;   // peso líquido ≤12 chars
  id_transportadora?: number;
  transportadora_pedido?: string; // ≤255 chars

  // Fiscais (ICMS / ST / IPI)
  valor_baseICMS?: string;        // base de ICMS ≤12 chars
  valor_ICMS?: string;            // valor do ICMS ≤12 chars
  valor_baseST?: string;          // base de ST ≤12 chars
  valor_ST?: string;              // valor do ST ≤12 chars
  valor_IPI?: string;             // valor do IPI ≤12 chars
}

/** POST /orcamentos/{id}/produtos — item de orçamento. */
export interface PayloadItemOrcamento {
  id_produto: number;
  desc_produto: string;
  qtde_produto: number;
  valor_unit_produto: number;
  desconto_produto?: number;
  // Fiscais / custo / peso (opcionais conforme spec orcamentos-produto-cadastrar.md)
  ipi_produto?: number;
  icms_produto?: number;
  valor_custo_produto?: number;
  peso_produto?: number;
  peso_liq_produto?: number;
}

/**
 * POST /orcamentos/{id}/parcelas — parcela de orçamento.
 * Ao cadastrar novas parcelas, as anteriores são removidas (a API substitui).
 * data_parcela e valor_parcela são obrigatórios.
 */
export interface PayloadParcelaOrcamento {
  data_parcela: string;   // YYYY-MM-DD
  valor_parcela: number;
  forma_pagamento?: (
    | "Dinheiro"
    | "PIX"
    | "Cheque"
    | "Permuta"
    | "Cartão de Crédito"
    | "Cartão de Débito"
    | "Boleto"
    | "Transferência"
    | "Ted"
    | "Depósito Identificado"
    | "Depósito em C/C"
    | "Duplicata Mercantil"
    | "Faturado"
    | "Faturar"
    | "Débito Automático"
    | "Lotérica"
    | "Banco"
    | "DDA"
    | "Pagamento online"
    | "BNDES"
    | "Outros"
    | "DP Descontada"
    | "CH Descontado"
    | "Vale Alimentação"
    | "Vale Refeição"
    | "Vale Presente"
    | "Vale Combustível"
  );
  observacoes_parcela?: string;  // ≤255 chars
}

/**
 * POST /pedidos/{id}/parcelas — parcela de pedido.
 * Espelha PayloadParcelaOrcamento: ao cadastrar novas parcelas, as anteriores
 * são removidas (a API substitui). data_parcela e valor_parcela são obrigatórios.
 */
export interface PayloadParcelaPedido {
  data_parcela: string;   // YYYY-MM-DD
  valor_parcela: number;
  forma_pagamento?: (
    | "Dinheiro"
    | "PIX"
    | "Cheque"
    | "Permuta"
    | "Cartão de Crédito"
    | "Cartão de Débito"
    | "Boleto"
    | "Transferência"
    | "Ted"
    | "Depósito Identificado"
    | "Depósito em C/C"
    | "Duplicata Mercantil"
    | "Faturado"
    | "Faturar"
    | "Débito Automático"
    | "Lotérica"
    | "Banco"
    | "DDA"
    | "Pagamento online"
    | "BNDES"
    | "Outros"
    | "DP Descontada"
    | "CH Descontado"
    | "Vale Alimentação"
    | "Vale Refeição"
    | "Vale Presente"
    | "Vale Combustível"
  );
  observacoes_parcela?: string;  // ≤255 chars
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

/**
 * Item do histórico retornado por GET /pedidos/{id_ped}/status.
 * Itens vêm em ordem crescente de id_status; o de MAIOR id_status é o mais
 * recente. data_status é a data REAL da mudança de situação (YYYY-MM-DD).
 * Campos extras (id_usuario/nome_usuario) não constam na spec pública.
 */
export interface ItemHistoricoStatusPedido {
  id_status: number;
  id_pedido: number;
  data_status: string;
  obs_status?: string;
  tipo_status?: string;
  situacao?: number | null;
  id_usuario?: number | string | null;
  nome_usuario?: string | null;
}
