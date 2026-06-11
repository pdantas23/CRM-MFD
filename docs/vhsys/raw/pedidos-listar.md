# Listar pedidos

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos:
    get:
      summary: Listar pedidos
      deprecated: false
      description: Request para a consulta de diversos pedidos.
      tags:
        - Vendas/Pedidos
      parameters:
        - name: order
          in: query
          description: 'Nome do campo para ordenação EX: data_mod_pedido'
          required: false
          schema:
            type: string
        - name: sort
          in: query
          description: Tipo de ordenação
          required: false
          schema:
            type: string
            enum:
              - Asc
              - Desc
            x-apidog-enum:
              - value: Asc
                name: ''
                description: Tipo de ordenação
              - value: Desc
                name: ''
                description: Tipo de ordenação
            default: Asc
        - name: limit
          in: query
          description: Limite de registros
          required: false
          schema:
            type: integer
            maximum: 250
        - name: offset
          in: query
          description: Registro inicial da consulta
          required: false
          schema:
            type: integer
        - name: id_pedido
          in: query
          description: Id do pedido
          required: false
          schema:
            type: integer
        - name: nome_cliente
          in: query
          description: Nome do cliente
          required: false
          schema:
            type: string
        - name: vendedor
          in: query
          description: Nome do vendedor
          required: false
          schema:
            type: string
        - name: status
          in: query
          description: Status da nota
          required: false
          schema:
            type: string
        - name: lixeira
          in: query
          description: Excluído
          required: false
          schema:
            type: string
            enum:
              - Sim
              - Nao
            x-apidog-enum:
              - value: Sim
                name: ''
                description: Excluído
              - value: Nao
                name: ''
                description: Excluído
            default: 'null'
        - name: data_modificacao
          in: query
          description: Registros criados ou modificados após a data informada
          required: false
          schema:
            type: string
            format: date-time
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
                  paging:
                    type: object
                    properties:
                      total_count:
                        type: integer
                      total:
                        type: integer
                      offset:
                        type: integer
                      limit:
                        type: integer
                      limit_max:
                        type: integer
                    required:
                      - total_count
                      - total
                      - offset
                      - limit
                      - limit_max
                    description: Dados de paginação
                    x-apidog-orders:
                      - total_count
                      - total
                      - offset
                      - limit
                      - limit_max
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id_ped:
                          type: integer
                          description: ID do pedido
                        id_pedido:
                          type: integer
                          description: ID Sequencial do pedido
                        id_cliente:
                          type: integer
                          description: ID do cliente
                        nome_cliente:
                          type: string
                          description: Nome do cliente
                        id_local_retirada:
                          type: integer
                          description: ID local retirada
                        id_local_cobranca:
                          type: integer
                          description: ID local cobrança
                        vendedor_pedido:
                          type: string
                          description: Nome do vendedor
                        vendedor_pedido_id:
                          type: integer
                          description: ID do vendedor
                        listapreco_produtos:
                          type: integer
                          description: Lista de preço
                        valor_total_produtos:
                          type: string
                          description: Valor total dos produtos
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
                        valor_total_nota:
                          type: string
                          description: Valor total da nota
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
                        condicao_pagamento_id:
                          type: integer
                          description: ID condição de pagamento
                        condicao_pagamento:
                          type: integer
                          description: Condição de pagamento
                        frete_por_pedido:
                          type: integer
                          description: Frete pedido
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
                          type: string
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
                        contas_pedido:
                          type: integer
                          description: Contas lançadas
                        comissao_pedido:
                          type: integer
                          description: Comissão lançada
                        estoque_pedido:
                          type: integer
                          description: Estoque lançado
                        pdv_emitido:
                          type: 'null'
                          description: Emitido PDV
                        ordemc_emitido:
                          type: integer
                          description: Ordem de compra gerada
                        data_cad_pedido:
                          type: string
                          description: Data de cadastro do pedido
                        data_mod_pedido:
                          type: string
                          description: Data da última modificação
                        id_aplicativo:
                          type: integer
                          description: ID eplicativo
                        id_pedido_aplicativo:
                          type: integer
                          description: ID pedido aplicativo
                        id_almoxarifado:
                          type: integer
                          description: ID almoxarifado
                        pagamento_com_vhpay:
                          type: integer
                          description: Pagamento vhpay
                        pagamento_com_conta_integrada:
                          type: integer
                          description: Pagamenbto conta integrada
                        link_pgto_gerado:
                          type: integer
                          description: Link de pagamento vhpay
                        lixeira:
                          type: string
                          description: Situação do pedido no sistema
                      x-apidog-orders:
                        - id_ped
                        - id_pedido
                        - id_cliente
                        - nome_cliente
                        - id_local_retirada
                        - id_local_cobranca
                        - vendedor_pedido
                        - vendedor_pedido_id
                        - listapreco_produtos
                        - valor_total_produtos
                        - desconto_pedido
                        - desconto_pedido_porc
                        - peso_total_nota
                        - peso_total_nota_liq
                        - frete_pedido
                        - valor_total_nota
                        - valor_baseICMS
                        - valor_ICMS
                        - valor_baseST
                        - valor_ST
                        - valor_IPI
                        - condicao_pagamento_id
                        - condicao_pagamento
                        - frete_por_pedido
                        - transportadora_pedido
                        - id_transportadora
                        - data_pedido
                        - prazo_entrega
                        - referencia_pedido
                        - obs_pedido
                        - obs_interno_pedido
                        - status_pedido
                        - contas_pedido
                        - comissao_pedido
                        - estoque_pedido
                        - pdv_emitido
                        - ordemc_emitido
                        - data_cad_pedido
                        - data_mod_pedido
                        - id_aplicativo
                        - id_pedido_aplicativo
                        - id_almoxarifado
                        - pagamento_com_vhpay
                        - pagamento_com_conta_integrada
                        - link_pgto_gerado
                        - lixeira
                    description: Dados de Resposta
                required:
                  - code
                  - status
                  - paging
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - paging
                  - data
              example:
                code: 200
                status: success
                paging:
                  total_count: 3
                  total: 3
                  offset: 0
                  limit: 0
                  limit_max: 250
                data:
                  - id_ped: 123456
                    id_pedido: 1
                    id_cliente: 123456
                    nome_cliente: Nome do Cliente
                    id_local_retirada: 0
                    id_local_cobranca: 0
                    vendedor_pedido: Nome do vendedor
                    vendedor_pedido_id: 123456
                    listapreco_produtos: 0
                    valor_total_produtos: '0.00'
                    desconto_pedido: '10.00'
                    desconto_pedido_porc: '0.00'
                    peso_total_nota: '0.00'
                    peso_total_nota_liq: '0.000000'
                    frete_pedido: '10.00'
                    valor_total_nota: '0.00'
                    valor_baseICMS: '0.00'
                    valor_ICMS: '0.00'
                    valor_baseST: '0.00'
                    valor_ST: '0.00'
                    valor_IPI: '0.00'
                    condicao_pagamento_id: 0
                    condicao_pagamento: 0
                    frete_por_pedido: 9
                    transportadora_pedido: Nome da transportadora
                    id_transportadora: 123456
                    data_pedido: '2025-08-08'
                    prazo_entrega: '10'
                    referencia_pedido: Referência
                    obs_pedido: Observação
                    obs_interno_pedido: Observação interna
                    status_pedido: Em Aberto
                    contas_pedido: 1
                    comissao_pedido: 0
                    estoque_pedido: 1
                    pdv_emitido: null
                    ordemc_emitido: 0
                    data_cad_pedido: '0000-00-00 00:00:00'
                    data_mod_pedido: '0000-00-00 00:00:00'
                    id_aplicativo: 1
                    id_pedido_aplicativo: 1
                    id_almoxarifado: 1
                    pagamento_com_vhpay: 0
                    pagamento_com_conta_integrada: 0
                    link_pgto_gerado: 0
                    lixeira: Nao
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
                data: Nenhum pedido encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16424499-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
