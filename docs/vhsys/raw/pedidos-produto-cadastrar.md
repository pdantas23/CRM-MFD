# Cadastrar produto

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos/{id_ped}/produtos:
    post:
      summary: Cadastrar produto
      deprecated: false
      description: Request para cadastro de produto no pedido.
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                qtde_produto:
                  type: number
                  description: Quantidade do produto
                  format: float
                id_produto:
                  type: integer
                  description: ID do produto
                  maximum: 20
                valor_unit_produto:
                  type: number
                  description: Valor unitário do produto
                  format: float
                desc_produto:
                  type: string
                  description: Nome do produto
                  maxLength: 255
                desconto_produto:
                  type: number
                  format: float
                  description: Valor do desconto
                ipi_produto:
                  type: number
                  format: float
                  description: Valor do IPI
                icms_produto:
                  type: number
                  format: float
                  description: Valor do ICMS
                valor_custo_produto:
                  type: number
                  format: float
                  description: Valor de custos do produto
                peso_produto:
                  type: number
                  format: float
                  description: Peso do produto
                peso_liq_produto:
                  type: number
                  format: float
                  description: Peso líquido do produto
              required:
                - qtde_produto
                - id_produto
                - valor_unit_produto
                - desc_produto
              x-apidog-orders:
                - qtde_produto
                - id_produto
                - valor_unit_produto
                - desc_produto
                - desconto_produto
                - ipi_produto
                - icms_produto
                - valor_custo_produto
                - peso_produto
                - peso_liq_produto
            example:
              - qtde_produto: '3.00'
                id_produto: 123456
                valor_unit_produto: '15.00'
                desc_produto: Descrição produto
              - qtde_produto: '2.00'
                id_produto: 123456
                valor_unit_produto: '15.00'
                desc_produto: Descrição produto
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
                        qtde_produto:
                          type: string
                          description: Quantidade do produto
                        id_produto:
                          type: integer
                          description: ID do produto
                        valor_unit_produto:
                          type: string
                          description: Valor unitário do produto
                        desc_produto:
                          type: string
                          description: Descrição produto
                        desconto_produto:
                          type: integer
                          description: Valor do desconto
                        id_almoxarifado:
                          type: integer
                          description: ID almoxarifado
                        id_lote:
                          type: integer
                          description: ID lote
                        valor_total_produto:
                          type: integer
                          description: Valor total do produto
                        id_pedido:
                          type: integer
                          description: ID do pedido
                        id_ped_produto:
                          type: integer
                          description: ID do vínculo produto/pedido
                        ipi_produto:
                          type: number
                          description: Valor do IPI
                          format: float
                        icms_produto:
                          type: number
                          description: Valor do ICMS
                          format: float
                        valor_custo_produto:
                          type: number
                          description: Valor de custo do produto
                          format: float
                        peso_produto:
                          type: number
                          description: Peso do produto
                          format: float
                        peso_liq_produto:
                          type: number
                          description: Peso líquido do produto
                          format: float
                      required:
                        - qtde_produto
                        - id_produto
                        - valor_unit_produto
                        - desc_produto
                        - desconto_produto
                        - id_almoxarifado
                        - id_lote
                        - valor_total_produto
                        - id_pedido
                        - id_ped_produto
                      x-apidog-orders:
                        - qtde_produto
                        - id_produto
                        - valor_unit_produto
                        - desc_produto
                        - desconto_produto
                        - id_almoxarifado
                        - id_lote
                        - valor_total_produto
                        - id_pedido
                        - id_ped_produto
                        - ipi_produto
                        - icms_produto
                        - valor_custo_produto
                        - peso_produto
                        - peso_liq_produto
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
                  - qtde_produto: '3.00'
                    id_produto: 123456
                    valor_unit_produto: '15.00'
                    desc_produto: Descrição produto
                    desconto_produto: 0
                    id_almoxarifado: 0
                    id_lote: 0
                    valor_total_produto: 45
                    id_pedido: 123456
                    id_ped_produto: 123456
                  - qtde_produto: '2.00'
                    id_produto: 123456
                    valor_unit_produto: '15.00'
                    desc_produto: Descrição produto
                    desconto_produto: 0
                    id_almoxarifado: 0
                    id_lote: 0
                    valor_total_produto: 30
                    id_pedido: 123456
                    id_ped_produto: 123456
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
                data: Erro ao cadastrar o produto para o pedido!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16432157-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
