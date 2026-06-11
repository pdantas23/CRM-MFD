# Atualizar pedido

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos/{id_ped}:
    put:
      summary: Atualizar pedido
      deprecated: false
      description: Request para atualizar um pedido.
      tags:
        - Vendas/Pedidos
      parameters:
        - name: id_ped
          in: path
          description: ID do pedido
          required: true
          schema:
            type: string
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
                id_cliente:
                  type: integer
                  description: ID do cliente
                  maximum: 9
                nome_cliente:
                  type: string
                  description: Nome do cliente
                  maxLength: 255
                vendedor_pedido:
                  type: string
                  description: Nome do vendedor
                  maxLength: 255
                vendedor_pedido_id:
                  type: integer
                  description: ID do vendedor
                  maximum: 9
                desconto_pedido:
                  type: number
                  format: float
                  description: Valor total do desconto
                peso_total_nota:
                  type: number
                  description: Peso total do pedido
                  format: float
                peso_total_nota_liq:
                  type: number
                  description: Peso liquido do pedido
                  format: float
                frete_pedido:
                  type: number
                  description: Valor do frete
                  format: float
                valor_baseICMS:
                  type: number
                  description: Valor da base de ICMS
                  format: float
                valor_ICMS:
                  type: number
                  description: Valor do ICMS
                  format: float
                valor_baseST:
                  type: number
                  description: Valor da base de ST
                  format: float
                valor_ST:
                  type: number
                  description: Valor do ST
                  format: float
                valor_IPI:
                  type: number
                  description: Valor do IPI
                  format: float
                transportadora_pedido:
                  type: string
                  description: Nome da transportadora
                  maxLength: 255
                id_transportadora:
                  type: integer
                  description: ID da transportadora
                  maximum: 9
                data_pedido:
                  type: string
                  format: date
                  description: Data do pedido
                prazo_entrega:
                  type: string
                  description: Prazo de entrega (Dias)
                  maxLength: 20
                referencia_pedido:
                  type: string
                  description: Referência do pedido
                  maxLength: 100
                obs_pedido:
                  type: string
                  description: Observações do pedido
                obs_interno_pedido:
                  type: string
                  description: Observação interna do pedido
                status_pedido:
                  type: string
                  description: Status do pedido
                  enum:
                    - Em Aberto
                    - Em Andamento
                    - Atendido
                    - Cancelado
                  x-apidog-enum:
                    - value: Em Aberto
                      name: ''
                      description: Status do pedido
                    - value: Em Andamento
                      name: ''
                      description: Status do pedido
                    - value: Atendido
                      name: ''
                      description: Status do pedido
                    - value: Cancelado
                      name: ''
                      description: Status do pedido
                estoque_pedido:
                  type: integer
                  description: Estoque lançado
                  maximum: 9
                  default: 0
                contas_pedido:
                  type: integer
                  description: Contas lançada
                  default: 0
                  maximum: 9
              required:
                - nome_cliente
                - status_pedido
              x-apidog-orders:
                - id_cliente
                - nome_cliente
                - vendedor_pedido
                - vendedor_pedido_id
                - desconto_pedido
                - peso_total_nota
                - peso_total_nota_liq
                - frete_pedido
                - valor_baseICMS
                - valor_ICMS
                - valor_baseST
                - valor_ST
                - valor_IPI
                - transportadora_pedido
                - id_transportadora
                - data_pedido
                - prazo_entrega
                - referencia_pedido
                - obs_pedido
                - obs_interno_pedido
                - status_pedido
                - estoque_pedido
                - contas_pedido
            example:
              id_cliente: 123456
              nome_cliente: Nome do cliente
              vendedor_pedido: Nome do vendedor
              vendedor_pedido_id: 196543
              desconto_pedido: '0.00'
              peso_total_nota: '0.00'
              peso_total_nota_liq: '0.00'
              frete_pedido: '0.00'
              valor_baseICMS: '0.00'
              valor_ICMS: '0.00'
              valor_baseST: '0.00'
              valor_ST: '0.00'
              valor_IPI: '0.00'
              transportadora_pedido: Nome da transportadora
              id_transportadora: 123456
              data_pedido: 0000-0-00
              prazo_entrega: 10
              referencia_pedido: Referência
              obs_pedido: Observação
              obs_interno_pedido: Observação interna
              status_pedido: Em Aberto
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
                    description: Código do retorno
                  status:
                    type: string
                    description: Status do retorno
                  data:
                    type: object
                    properties:
                      components:
                        type: object
                        properties: {}
                        x-apidog-orders: []
                      id_pedido:
                        type: integer
                        description: ID do pedido
                      id_cliente:
                        type: integer
                        description: ID do cliente
                      nome_cliente:
                        type: string
                        description: Nome do cliente
                      vendedor_pedido:
                        type: string
                        description: Nome do vendedor
                      vendedor_pedido_id:
                        type: integer
                        description: 'ID do vendedor '
                      desconto_pedido:
                        type: string
                        description: Valor total do desconto
                      desconto_pedido_porc:
                        type: integer
                        description: Desconto pedido procentagem
                      peso_total_nota:
                        type: string
                        description: Peso total do pedido
                      peso_total_nota_liq:
                        type: string
                        description: Peso líquido do pedido
                      frete_pedido:
                        type: string
                        description: Valor do frete
                      valor_baseICMS:
                        type: string
                        description: Valor da base do ICMS
                      valor_ICMS:
                        type: string
                        description: Valor do ICMS
                      valor_baseST:
                        type: string
                        description: Valor da base de ST
                      valor_ST:
                        type: string
                        description: Valor do ST
                      valor_IPI:
                        type: string
                        description: Valor do IPI
                      transportadora_pedido:
                        type: string
                        description: Nome da transportadora
                      id_transportadora:
                        type: integer
                        description: ID da transportadora
                      data_pedido:
                        type: string
                        description: Data do pedido
                      prazo_entrega:
                        type: integer
                        description: Prazo de entrega (Dias)
                      referencia_pedido:
                        type: string
                        description: Referência do pedido
                      obs_pedido:
                        type: string
                        description: Observações do pedido
                      obs_interno_pedido:
                        type: string
                        description: Observações internas do pedido
                      status_pedido:
                        type: string
                        description: |
                          Status do pedido
                      valor_total_produtos:
                        type: integer
                        description: Valor total da nota
                      valor_total_nota:
                        type: integer
                        description: Data de cadastro do pedido
                      data_cad_pedido:
                        type: string
                        description: ID condição de pagamento
                      condicao_pagamento_id:
                        type: integer
                        description: Condição de pagamento
                      condicao_pagamento:
                        type: integer
                        description: ID do pedido
                      sync:
                        type: integer
                        description: Dados de sincronização
                      sync_id:
                        type: integer
                        description: ID sincronização
                      sync_user:
                        type: integer
                        description: Usuário de sincronização
                      lixeira:
                        type: string
                        description: Situação do pedido no sistema
                      listapreco_produtos:
                        type: integer
                        description: Lista de preço
                      id_almoxarifado:
                        type: 'null'
                        description: ID almoxarifado
                      contas_pedido:
                        type: integer
                        description: Contas lançadas
                      estoque_pedido:
                        type: integer
                        description: Estoque lançado
                      id_empresa:
                        type: integer
                        description: ID empresa
                      id_ped:
                        type: integer
                        description: ID pedido
                      frete_por_pedido:
                        type: integer
                        description: Frete pedido
                      vendedor2_pedido:
                        type: string
                        description: Vendedor pedido
                      vendedor2_pedido_id:
                        type: integer
                        description: ID vendedor pedido
                      comissao_pedido:
                        type: integer
                        description: Comissão pedido
                    required:
                      - components
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - transportadora_pedido
                      - id_transportadora
                      - data_pedido
                      - prazo_entrega
                      - referencia_pedido
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - valor_total_produtos
                      - valor_total_nota
                      - data_cad_pedido
                      - condicao_pagamento_id
                      - condicao_pagamento
                      - sync
                      - sync_id
                      - sync_user
                      - lixeira
                      - listapreco_produtos
                      - id_almoxarifado
                      - contas_pedido
                      - estoque_pedido
                      - id_empresa
                      - id_ped
                      - frete_por_pedido
                      - vendedor2_pedido
                      - vendedor2_pedido_id
                      - comissao_pedido
                    description: Dados de Resposta
                    x-apidog-orders:
                      - components
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - transportadora_pedido
                      - id_transportadora
                      - data_pedido
                      - prazo_entrega
                      - referencia_pedido
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - valor_total_produtos
                      - valor_total_nota
                      - data_cad_pedido
                      - condicao_pagamento_id
                      - condicao_pagamento
                      - sync
                      - sync_id
                      - sync_user
                      - lixeira
                      - listapreco_produtos
                      - id_almoxarifado
                      - contas_pedido
                      - estoque_pedido
                      - id_empresa
                      - id_ped
                      - frete_por_pedido
                      - vendedor2_pedido
                      - vendedor2_pedido_id
                      - comissao_pedido
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
                  components: {}
                  id_pedido: 0
                  id_cliente: 123456
                  nome_cliente: Razão Social
                  vendedor_pedido: Vendedor Pedido
                  vendedor_pedido_id: 123456
                  desconto_pedido: '10.00'
                  desconto_pedido_porc: 0
                  peso_total_nota: '0.00'
                  peso_total_nota_liq: '0.00'
                  frete_pedido: '10.00'
                  valor_baseICMS: '0.00'
                  valor_ICMS: '0.00'
                  valor_baseST: '0.00'
                  valor_ST: '0.00'
                  valor_IPI: '0.00'
                  transportadora_pedido: Nome da Rransportadora
                  id_transportadora: 123456
                  data_pedido: '0000-00-00'
                  prazo_entrega: 10
                  referencia_pedido: Referência
                  obs_pedido: Observação
                  obs_interno_pedido: Observação interna
                  status_pedido: Em Aberto
                  valor_total_produtos: 0
                  valor_total_nota: 0
                  data_cad_pedido: '0000-00-00'
                  condicao_pagamento_id: 0
                  condicao_pagamento: 0
                  sync: 0
                  sync_id: 0
                  sync_user: 0
                  lixeira: Nao
                  listapreco_produtos: 0
                  id_almoxarifado: null
                  contas_pedido: 0
                  estoque_pedido: 0
                  id_empresa: 123456
                  id_ped: 123456
                  frete_por_pedido: 9
                  vendedor2_pedido: null
                  vendedor2_pedido_id: null
                  comissao_pedido: 0
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
                    type: string
                    description: Código do retorno
                  status:
                    type: string
                    description: Status do retorno
                  data:
                    type: string
                    description: Dados do erro
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 403
                status: error
                data: Erro ao alterar o pedido!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16423113-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
