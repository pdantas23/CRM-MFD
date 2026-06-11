# Cadastrar receita

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /contas-receber:
    post:
      summary: Cadastrar receita
      deprecated: false
      description: Request para cadastro de contas a receber.
      tags:
        - Financeiro/Contas a receber
      parameters:
        - name: access-token
          in: header
          description: ''
          required: true
          example: '{{ACCESS_TOKEN}}'
          schema:
            type: string
        - name: secret-access-token
          in: header
          description: ''
          required: true
          example: '{{SECRET_ACCESS_TOKEN}}'
          schema:
            type: string
        - name: Cache-Control
          in: header
          description: ''
          required: false
          example: no-cache
          schema:
            type: string
        - name: Content-Type
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: User-Agent
          in: header
          description: >-
            Identifica o nome e a versão da aplicação que está consumindo a API.
            Esse cabeçalho ajuda no monitoramento, diagnóstico e controle de
            acesso das requisições.
          required: true
          example: MinhaAplicacao/1.0
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                nome_conta:
                  type: string
                  minLength: 1
                  maxLength: 45
                  description: Nome da receita
                id_categoria:
                  type: integer
                  minimum: 1
                  maximum: 9
                  description: ID da categoria
                categoria_rec:
                  type: string
                  minLength: 0
                  maxLength: 50
                  description: Nome da categoria
                id_banco:
                  type: integer
                  minimum: 1
                  maximum: 20
                  description: ID do banco
                id_cliente:
                  type: integer
                  minimum: 1
                  maximum: 20
                  description: ID do cliente
                nome_cliente:
                  type: string
                  minLength: 0
                  maxLength: 255
                  description: Nome do cliente
                vencimento_rec:
                  type: string
                  format: date
                  description: Data do vencimento
                valor_rec:
                  type: string
                  default: 00,0
                  description: Valor da receita
                valor_pago:
                  type: string
                  minLength: 0
                  maxLength: 10
                  description: Valor pago
                data_emissao:
                  type: string
                  format: date
                  description: Data da emissão
                n_documento_rec:
                  type: string
                  minLength: 0
                  maxLength: 45
                  description: Número do documento
                observacoes_rec:
                  type: string
                  description: Observações da receita
                id_centro_custos:
                  type: integer
                  minimum: 0
                  maximum: 20
                  description: ID do centro de custo
                centro_custos_rec:
                  type: string
                  minLength: 0
                  maxLength: 255
                  description: Nome do centro de custo
                liquidado_rec:
                  type: string
                  enum:
                    - Sim
                    - Nao
                  x-apidog-enum:
                    - value: Sim
                      name: Conta esta liquidada
                      description: ''
                    - value: Nao
                      name: Conta esta liquidada
                      description: Valor padrão
                  description: Se a conta esta liquidada
                data_pagamento:
                  type: string
                  format: date
                  description: Data do pagamento
                obs_pagamento:
                  type: string
                  minLength: 0
                  maxLength: 255
                  description: Observação do pagamento
                forma_pagamento:
                  type: string
                  description: Forma de pagamento
                  minLength: 0
                  maxLength: 255
                  enum:
                    - Dinheiro
                    - PIX
                    - Cheque
                    - Permuta
                    - Cartão de Crédito
                    - Cartão de Débito
                    - Boleto
                    - Transferência
                    - Ted
                    - Depósito Identificado
                    - Depósito em C/C
                    - Duplicata Mercantil
                    - Faturado
                    - Faturar
                    - Débito Automático
                    - Lotérica
                    - Banco
                    - DDA
                    - Pagamento online
                    - BNDES
                    - Outros
                    - DP Descontada
                    - CH Descontado
                    - Vale Alimentação
                    - Vale Refeição
                    - Vale Presente
                    - Vale Combustível
                  x-apidog-enum:
                    - value: Dinheiro
                      name: ''
                      description: ''
                    - value: PIX
                      name: ''
                      description: ''
                    - value: Cheque
                      name: ''
                      description: ''
                    - value: Permuta
                      name: ''
                      description: ''
                    - value: Cartão de Crédito
                      name: ''
                      description: ''
                    - value: Cartão de Débito
                      name: ''
                      description: ''
                    - value: Boleto
                      name: ''
                      description: ''
                    - value: Transferência
                      name: ''
                      description: ''
                    - value: Ted
                      name: ''
                      description: ''
                    - value: Depósito Identificado
                      name: ''
                      description: ''
                    - value: Depósito em C/C
                      name: ''
                      description: ''
                    - value: Duplicata Mercantil
                      name: ''
                      description: ''
                    - value: Faturado
                      name: ''
                      description: ''
                    - value: Faturar
                      name: ''
                      description: ''
                    - value: Débito Automático
                      name: ''
                      description: ''
                    - value: Lotérica
                      name: ''
                      description: ''
                    - value: Banco
                      name: ''
                      description: ''
                    - value: DDA
                      name: ''
                      description: ''
                    - value: Pagamento online
                      name: ''
                      description: ''
                    - value: BNDES
                      name: ''
                      description: ''
                    - value: Outros
                      name: ''
                      description: ''
                    - value: DP Descontada
                      name: ''
                      description: ''
                    - value: CH Descontado
                      name: ''
                      description: ''
                    - value: Vale Alimentação
                      name: ''
                      description: ''
                    - value: Vale Refeição
                      name: ''
                      description: ''
                    - value: Vale Presente
                      name: ''
                      description: ''
                    - value: Vale Combustível
                      name: ''
                      description: ''
                tipo_conta:
                  type: string
                  enum:
                    - Boleto
                    - Conta
                    - Duplicata
                    - PIX
                  x-apidog-enum:
                    - value: Boleto
                      name: ''
                      description: Tipo da conta
                    - value: Conta
                      name: ''
                      description: Tipo da conta
                    - value: Duplicata
                      name: ''
                      description: Tipo da conta
                    - value: PIX
                      name: ''
                      description: Tipo da conta
                  description: Tipo da conta
                valor_juros:
                  type: number
                  format: float
                  maximum: 10
                  description: Valor dos juros
                valor_desconto:
                  type: number
                  format: float
                  maximum: 10
                  description: Valor do desconto
                valor_acrescimo:
                  type: number
                  format: float
                  maximum: 10
                  description: Valor do acrescimo
                br_code:
                  type: string
                  description: >-
                    Código “copia e cola” do pix de cobrança gerado. (disponível
                    somente quando a conta é do tipo “Pix“ e vinculada a uma
                    conta PJ Stone)
              required:
                - nome_conta
                - id_banco
                - vencimento_rec
                - valor_rec
                - data_emissao
              x-apidog-orders:
                - nome_conta
                - id_banco
                - vencimento_rec
                - valor_rec
                - data_emissao
                - id_cliente
                - nome_cliente
                - id_categoria
                - categoria_rec
                - valor_pago
                - n_documento_rec
                - observacoes_rec
                - id_centro_custos
                - centro_custos_rec
                - liquidado_rec
                - data_pagamento
                - obs_pagamento
                - forma_pagamento
                - tipo_conta
                - valor_juros
                - valor_desconto
                - valor_acrescimo
                - br_code
            example:
              nome_conta: Nome da conta
              id_categoria: 123456
              categoria_rec: '0000'
              id_banco: 123456
              id_cliente: 123456
              nome_cliente: Nome do cliente
              vencimento_rec: '0000-00-00'
              valor_rec: '00.00'
              valor_pago: '00.00'
              data_emissao: '0000-00-00'
              n_documento_rec: '0000'
              observacoes_rec: Observações
              id_centro_custos: 123456
              centro_custos_rec: Centro de custo
              liquidado_rec: Nao
              data_pagamento: '0000-00-00'
              obs_pagamento: Observações
              forma_pagamento: Boleto
              tipo_conta: Pix
              valor_juros: '00.00'
              valor_desconto: '00.00'
              valor_acrescimo: '00.00'
              br_code: ''
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    description: Código da resposta
                  status:
                    type: string
                    description: Status da resposta
                  data:
                    type: object
                    properties:
                      fluxo:
                        type: integer
                        description: Fluxo
                      id_empresa:
                        type: integer
                        description: ID empresa
                      nome_conta:
                        type: string
                        description: Nome da receita
                      id_categoria:
                        type: integer
                        description: ID da categoria
                      categoria_rec:
                        type: string
                        description: Nome da categoria
                      id_banco:
                        type: integer
                        description: ID do banco
                      id_cliente:
                        type: integer
                        description: ID do cliente
                      nome_cliente:
                        type: string
                        description: Nome do cliente
                      vencimento_rec:
                        type: string
                        description: Data do vencimento
                      valor_rec:
                        type: string
                        description: Valor da receita
                      valor_pago:
                        type: integer
                        description: Valor pago
                      data_emissao:
                        type: string
                        description: Data da emissão
                      n_documento_rec:
                        type: string
                        description: Número do documento
                      id_centro_custos:
                        type: integer
                        description: ID do centro de custo
                      centro_custos_rec:
                        type: string
                        description: Nome do centro de custo
                      lixeira:
                        type: string
                        enum:
                          - Sim
                          - Nao
                        x-apidog-enum:
                          - value: Sim
                            name: ''
                            description: ''
                          - value: Nao
                            name: ''
                            description: ''
                        description: Situação da receita no sistema
                      liquidado_rec:
                        type: string
                        description: Se a conta esta liquidada
                      data_pagamento:
                        type: string
                        description: Data do pagamento
                      obs_pagamento:
                        type: string
                        description: Observação do pagamento
                      forma_pagamento:
                        type: string
                        description: Forma de pagamento
                      valor_juros:
                        type: string
                        description: Valor dos juros
                      valor_desconto:
                        type: string
                        description: Valor do desconto
                      valor_acrescimo:
                        type: string
                        description: Valor do acrescimo
                      identificacao:
                        type: string
                        description: Identificação
                      praca_pagamento:
                        type: string
                        description: Praça pagamento
                      tipo_conta:
                        type: string
                        description: Tipo da conta
                      registrado:
                        type: integer
                        description: Regsitrado
                      situacao:
                        type: string
                        description: Situação receita
                      id_registro:
                        type: boolean
                        description: ID do registro
                      data_mod_rec:
                        type: string
                        description: Data da última modificação
                      data_cad_rec:
                        type: string
                        description: Data de cadastro da receita
                      id_conta_rec:
                        type: integer
                        description: ID da receita
                      observacoes_rec:
                        type: string
                        description: Obervação receita
                      sync:
                        type: string
                        description: Dados de sincronização
                      sync_id:
                        type: string
                        description: ID de sincronização
                      sync_user:
                        type: string
                        description: Usuário de sincronização
                      id_boleto:
                        type: integer
                        description: ID boleto
                      id_pagamento_ob:
                        type: 'null'
                        description: ID pagamento observação
                      valor_baixa:
                        type: 'null'
                        description: Valor baixa
                      parciais:
                        type: array
                        items:
                          type: string
                        description: Baixas parciais
                      brcode:
                        type: string
                        description: >-
                          Código “copia e cola” do pix de cobrança gerado.
                          (disponível somente quando a conta é do tipo “Pix“ e
                          vinculada a uma conta PJ Stone)
                    required:
                      - fluxo
                      - id_empresa
                      - nome_conta
                      - id_categoria
                      - categoria_rec
                      - id_banco
                      - id_cliente
                      - nome_cliente
                      - vencimento_rec
                      - valor_rec
                      - valor_pago
                      - data_emissao
                      - n_documento_rec
                      - id_centro_custos
                      - centro_custos_rec
                      - lixeira
                      - liquidado_rec
                      - data_pagamento
                      - obs_pagamento
                      - forma_pagamento
                      - valor_juros
                      - valor_desconto
                      - valor_acrescimo
                      - identificacao
                      - praca_pagamento
                      - tipo_conta
                      - registrado
                      - situacao
                      - id_registro
                      - data_mod_rec
                      - data_cad_rec
                      - id_conta_rec
                      - observacoes_rec
                      - sync
                      - sync_id
                      - sync_user
                      - id_boleto
                      - id_pagamento_ob
                      - valor_baixa
                      - parciais
                      - brcode
                    x-apidog-orders:
                      - fluxo
                      - id_empresa
                      - nome_conta
                      - id_categoria
                      - categoria_rec
                      - id_banco
                      - id_cliente
                      - nome_cliente
                      - vencimento_rec
                      - valor_rec
                      - valor_pago
                      - data_emissao
                      - n_documento_rec
                      - id_centro_custos
                      - centro_custos_rec
                      - lixeira
                      - liquidado_rec
                      - data_pagamento
                      - obs_pagamento
                      - forma_pagamento
                      - valor_juros
                      - valor_desconto
                      - valor_acrescimo
                      - identificacao
                      - praca_pagamento
                      - tipo_conta
                      - registrado
                      - situacao
                      - id_registro
                      - data_mod_rec
                      - data_cad_rec
                      - id_conta_rec
                      - observacoes_rec
                      - sync
                      - sync_id
                      - sync_user
                      - id_boleto
                      - id_pagamento_ob
                      - valor_baixa
                      - brcode
                      - parciais
                    description: Dados de Resposta
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 200
                status: success
                data:
                  fluxo: 1
                  id_empresa: 123456
                  nome_conta: Nome da conta
                  id_categoria: 123456
                  categoria_rec: Outras Receitas
                  id_banco: 123456
                  id_cliente: 123456
                  nome_cliente: Nome do cliente
                  vencimento_rec: '0000-00-00'
                  valor_rec: '00.00'
                  valor_pago: 0
                  data_emissao: '0000-00-00'
                  n_documento_rec: '0000'
                  id_centro_custos: 123456
                  centro_custos_rec: Centro de custo
                  lixeira: Nao
                  liquidado_rec: Sim
                  data_pagamento: '0000-00-00'
                  obs_pagamento: Observações
                  forma_pagamento: Boleto
                  valor_juros: '00.00'
                  valor_desconto: '00.00'
                  valor_acrescimo: '00.00'
                  identificacao: '0'
                  praca_pagamento: ''
                  tipo_conta: Pix
                  registrado: 0
                  situacao: Conta Liquidada
                  id_registro: false
                  data_mod_rec: '0000-00-00 00:00:00'
                  data_cad_rec: '0000-00-00 00:00:00'
                  id_conta_rec: 123456
                  observacoes_rec: Observações
                  sync: '0'
                  sync_id: '0'
                  sync_user: '0'
                  id_boleto: 0
                  id_pagamento_ob: null
                  valor_baixa: null
                  brcode: null
                  parciais: []
          headers: {}
          x-apidog-name: Success
        '403':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    description: Código da resposta
                  status:
                    type: string
                    description: Status da resposta
                  data:
                    type: string
                    description: Dados do erro
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 403
                status: error
                data: Erro ao alterar a receita!
          headers: {}
          x-apidog-name: Proibido
        x-200:Webhook:
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  entidade:
                    type: string
                    description: Entidade
                  operacao:
                    type: string
                    description: Operação efetuada
                  dados:
                    type: object
                    properties:
                      id_conta_receber:
                        type: integer
                        description: ID receita
                      nome_conta:
                        type: string
                        description: Nome da receita
                      nome_banco:
                        type: 'null'
                        description: Banco
                      categoria:
                        type: string
                        description: Categoria financeira
                      razao_cliente:
                        type: string
                        description: Nome do cliente
                      vencimento_original:
                        type: 'null'
                        description: Data vencimento original
                      vencimento:
                        type: string
                        description: Data vencimento
                      valor:
                        type: integer
                        description: Valor
                      valor_pago:
                        type: integer
                        description: Valor pago
                      valor_desconto:
                        type: 'null'
                        description: Valor desconto
                      valor_juros:
                        type: integer
                        description: Valor juros
                      forma_pagamento:
                        type: string
                        description: Forma de pagamento
                      data_emissao:
                        type: string
                        description: Data emissão
                      gerar_boletos:
                        type: 'null'
                        description: Gerar boleto
                      numero_documento:
                        type: string
                        description: Número documento
                      centro_custos:
                        type: string
                        description: Centro de custos
                      observacoes:
                        type: 'null'
                        description: Observação
                      liquidado:
                        type: string
                        description: Liquidado
                    required:
                      - id_conta_receber
                      - nome_conta
                      - nome_banco
                      - categoria
                      - razao_cliente
                      - vencimento_original
                      - vencimento
                      - valor
                      - valor_pago
                      - valor_desconto
                      - valor_juros
                      - forma_pagamento
                      - data_emissao
                      - gerar_boletos
                      - numero_documento
                      - centro_custos
                      - observacoes
                      - liquidado
                    x-apidog-orders:
                      - id_conta_receber
                      - nome_conta
                      - nome_banco
                      - categoria
                      - razao_cliente
                      - vencimento_original
                      - vencimento
                      - valor
                      - valor_pago
                      - valor_desconto
                      - valor_juros
                      - forma_pagamento
                      - data_emissao
                      - gerar_boletos
                      - numero_documento
                      - centro_custos
                      - observacoes
                      - liquidado
                    description: Dados de Resposta
                required:
                  - entidade
                  - operacao
                  - dados
                x-apidog-orders:
                  - entidade
                  - operacao
                  - dados
              example:
                entidade: contas_receber
                operacao: create
                dados:
                  id_conta_receber: 123456
                  nome_conta: Nome
                  nome_banco: null
                  categoria: Outras Receitas
                  razao_cliente: Nome Cliente
                  vencimento_original: null
                  vencimento: '0000-00-00'
                  valor: 100
                  valor_pago: 0
                  valor_desconto: null
                  valor_juros: 0
                  forma_pagamento: ''
                  data_emissao: '0000-00-00'
                  gerar_boletos: null
                  numero_documento: ''
                  centro_custos: ''
                  observacoes: null
                  liquidado: Nao
          headers: {}
          x-apidog-name: Webhook
      security: []
      x-apidog-folder: Financeiro/Contas a receber
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-15847044-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
