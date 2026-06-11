# Listar produtos

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos/{id_ped}/produtos:
    get:
      summary: Listar produtos
      deprecated: false
      description: Request para a consulta de diversos produtos do pedido.
      tags:
        - Vendas/Pedidos
      parameters:
        - name: id_ped
          in: path
          description: ID pedido
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
                        id_ped_produto:
                          type: integer
                          description: ID do vínculo produto/pedido
                        id_pedido:
                          type: integer
                          description: ID do pedido
                        id_produto:
                          type: integer
                          description: ID do produto
                        id_almoxarifado:
                          type: integer
                          description: ID almoxarifado
                        id_lote:
                          type: integer
                          description: Id lote
                        desc_produto:
                          type: string
                          description: Descrição produto
                        qtde_produto:
                          type: string
                          description: Quantidade do produto
                        desconto_produto:
                          type: string
                          description: Valor do desconto
                        ipi_produto:
                          type: string
                          description: Valor do IPI
                        icms_produto:
                          type: string
                          description: Valor do ICMS
                        valor_unit_produto:
                          type: string
                          description: Valor unitário do produto
                        valor_custo_produto:
                          type: string
                          description: Valor de custo do produto
                        valor_total_produto:
                          type: string
                          description: Valor total do produto
                        valor_desconto:
                          type: string
                          description: Valor desconto
                        peso_produto:
                          type: string
                          description: Peso do produto
                        peso_liq_produto:
                          type: string
                          description: Peso líquido do produto
                        info_adicional:
                          type: string
                          description: Informações adicionais
                        xPed_produto:
                          type: string
                        nItem_produto:
                          type: string
                          description: Número item pedido
                        json_localizacoes:
                          type: string
                          description: JSON estoque
                      required:
                        - id_ped_produto
                        - id_pedido
                        - id_produto
                        - id_almoxarifado
                        - id_lote
                        - desc_produto
                        - qtde_produto
                        - desconto_produto
                        - ipi_produto
                        - icms_produto
                        - valor_unit_produto
                        - valor_custo_produto
                        - valor_total_produto
                        - valor_desconto
                        - peso_produto
                        - peso_liq_produto
                        - info_adicional
                        - xPed_produto
                        - nItem_produto
                        - json_localizacoes
                      x-apidog-orders:
                        - id_ped_produto
                        - id_pedido
                        - id_produto
                        - id_almoxarifado
                        - id_lote
                        - desc_produto
                        - qtde_produto
                        - desconto_produto
                        - ipi_produto
                        - icms_produto
                        - valor_unit_produto
                        - valor_custo_produto
                        - valor_total_produto
                        - valor_desconto
                        - peso_produto
                        - peso_liq_produto
                        - info_adicional
                        - xPed_produto
                        - nItem_produto
                        - json_localizacoes
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
                  - id_ped_produto: 123456
                    id_pedido: 123456
                    id_produto: 123456
                    id_almoxarifado: 0
                    id_lote: 0
                    desc_produto: Descrição produto
                    qtde_produto: '3.0000'
                    desconto_produto: '0.00'
                    ipi_produto: '0.00'
                    icms_produto: '0.00'
                    valor_unit_produto: '15.000000'
                    valor_custo_produto: '0.000000'
                    valor_total_produto: '45.00'
                    valor_desconto: '0.00'
                    peso_produto: '0.00'
                    peso_liq_produto: '0.00'
                    info_adicional: ''
                    xPed_produto: ''
                    nItem_produto: ''
                    json_localizacoes: ''
                  - id_ped_produto: 123456
                    id_pedido: 123456
                    id_produto: 123456
                    id_almoxarifado: 0
                    id_lote: 0
                    desc_produto: Descrição produto
                    qtde_produto: '2.0000'
                    desconto_produto: '0.00'
                    ipi_produto: '0.00'
                    icms_produto: '0.00'
                    valor_unit_produto: '15.000000'
                    valor_custo_produto: '0.000000'
                    valor_total_produto: '30.00'
                    valor_desconto: '0.00'
                    peso_produto: '0.00'
                    peso_liq_produto: '0.00'
                    info_adicional: ''
                    xPed_produto: ''
                    nItem_produto: ''
                    json_localizacoes: ''
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
                data: Nenhum produto para o pedido encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16432895-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
