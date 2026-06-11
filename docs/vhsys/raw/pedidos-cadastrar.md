# Cadastrar pedido

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos:
    post:
      summary: Cadastrar pedido
      deprecated: false
      description: Request para cadastro de pedidos.
      tags:
        - Vendas/Pedidos
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
                  enum:
                    - 1
                    - 0
                  x-apidog-enum:
                    - value: 1
                      name: ''
                      description: Sim
                    - value: 0
                      name: ''
                      description: Não
                contas_pedido:
                  type: integer
                  description: Contas lançada
                  default: 0
                  maximum: 9
                  enum:
                    - 1
                    - 0
                  x-apidog-enum:
                    - value: 1
                      name: ''
                      description: Sim
                    - value: 0
                      name: ''
                      description: Não
              required:
                - nome_cliente
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
              vendedor_pedido_id: 123456
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
              data_pedido: '0000-00-00'
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
                    type: array
                    items:
                      type: object
                      properties:
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
                          description: ID do vendedor
                        desconto_pedido:
                          type: string
                          description: Valor do desconto
                        desconto_pedido_porc:
                          type: string
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
                          description: Status do pedido
                        valor_total_nota:
                          type: string
                          description: Valor total da nota
                        data_cad_pedido:
                          type: string
                          description: Data de cadastro do pedido
                        condicao_pagamento_id:
                          type: string
                          description: ID condição de pagamento
                        condicao_pagamento:
                          type: integer
                          description: Condição de pagamento
                        id_ped:
                          type: integer
                          description: ID do pedido
                        sync:
                          type: string
                          description: Dados de sincronização
                        sync_id:
                          type: string
                          description: ID sincronização
                        sync_user:
                          type: string
                          description: Usuário de sincronização
                        lixeira:
                          type: string
                          description: Situação do pedido no sistema
                        estoque_pedido:
                          type: string
                          description: Estoque lançado
                        contas_pedido:
                          type: string
                          description: Contas lançadas
                        listapreco_produtos:
                          type: integer
                          description: Lista de preço
                        id_almoxarifado:
                          type: string
                          description: ID almoxarifado
                        usuario_cad_pedido:
                          type: integer
                          description: Usuário cadastro pedido
                        valor_total_produtos:
                          type: string
                          description: Valor total dos produtos
                        id_empresa:
                          type: integer
                          description: ID empresa
                        id_pedido:
                          type: integer
                          description: ID Sequencial do pedido
                        comissao_pedido:
                          type: string
                          description: Comissão lançada
                        frete_por_pedido:
                          type: integer
                          description: Frete pedido
                        ordemc_emitido:
                          type: integer
                          description: Ordem de compra gerada
                        data_mod_pedido:
                          type: string
                          description: Data da última modificação
                          format: date-time
                      x-apidog-orders:
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
                        - valor_total_nota
                        - data_cad_pedido
                        - condicao_pagamento_id
                        - condicao_pagamento
                        - id_ped
                        - sync
                        - sync_id
                        - sync_user
                        - lixeira
                        - estoque_pedido
                        - contas_pedido
                        - listapreco_produtos
                        - id_almoxarifado
                        - usuario_cad_pedido
                        - valor_total_produtos
                        - id_empresa
                        - id_pedido
                        - comissao_pedido
                        - frete_por_pedido
                        - ordemc_emitido
                        - data_mod_pedido
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
                  - id_cliente: 123456
                    nome_cliente: Razão Social
                    vendedor_pedido: Nome Vendedor
                    vendedor_pedido_id: 123456
                    desconto_pedido: '10.00'
                    desconto_pedido_porc: ''
                    peso_total_nota: '0.00'
                    peso_total_nota_liq: '0.00'
                    frete_pedido: '10.00'
                    valor_baseICMS: '0.00'
                    valor_ICMS: '0.00'
                    valor_baseST: '0.00'
                    valor_ST: '0.00'
                    valor_IPI: '0.00'
                    transportadora_pedido: Nome da Transportadora
                    id_transportadora: 123456
                    data_pedido: '0000-00-00'
                    prazo_entrega: 10
                    referencia_pedido: Referência
                    obs_pedido: Observação
                    obs_interno_pedido: Observação interna
                    status_pedido: Em Aberto
                    valor_total_nota: '0.000000'
                    data_cad_pedido: '0000-00-00 00:00:00'
                    condicao_pagamento_id: ''
                    condicao_pagamento: 0
                    id_ped: 15579150
                    sync: ''
                    sync_id: ''
                    sync_user: ''
                    lixeira: Nao
                    estoque_pedido: '1'
                    contas_pedido: '1'
                    listapreco_produtos: 0
                    id_almoxarifado: ''
                    usuario_cad_pedido: 123456
                    valor_total_produtos: ''
                    id_empresa: 123456
                    id_pedido: ''
                    comissao_pedido: ''
                    frete_por_pedido: 9
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
                data: Erro ao cadastrar o pedido!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16422583-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
