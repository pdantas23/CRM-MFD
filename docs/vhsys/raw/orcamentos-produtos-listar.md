# Listar produtos

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/produtos:
    get:
      summary: Listar produtos
      deprecated: false
      description: Request para listar todos produtos do orçamento.
      tags:
        - Vendas/Orçamentos
      parameters:
        - name: id_orcamento
          in: path
          description: ID do orçamento
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
                          description: ID do vínculo produto/orçamento
                        id_orcamento:
                          type: integer
                          description: ID do orçamento
                        id_produto:
                          type: integer
                          description: ID do produto
                        id_almoxarifado:
                          type: integer
                          nullable: true
                        id_lote:
                          type: integer
                          nullable: true
                        desc_produto:
                          type: string
                          description: Nome do produto
                        qtde_produto:
                          type: string
                          description: Quantidade do produto
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
                          type: integer
                          description: Valor total do produto
                        valor_desconto:
                          type: string
                        peso_produto:
                          type: string
                          description: Peso do produto
                        peso_liq_produto:
                          type: string
                          description: Peso líquido do produto
                        info_adicional:
                          type: string
                          nullable: true
                        desconto_produto:
                          type: number
                          description: Valor do desconto
                          format: float
                      required:
                        - id_ped_produto
                        - id_orcamento
                        - id_produto
                        - id_almoxarifado
                        - id_lote
                        - desc_produto
                        - qtde_produto
                        - ipi_produto
                        - icms_produto
                        - valor_unit_produto
                        - valor_custo_produto
                        - valor_total_produto
                        - valor_desconto
                        - peso_produto
                        - peso_liq_produto
                        - info_adicional
                      x-apidog-orders:
                        - id_ped_produto
                        - id_orcamento
                        - id_produto
                        - id_almoxarifado
                        - id_lote
                        - desc_produto
                        - qtde_produto
                        - ipi_produto
                        - icms_produto
                        - valor_unit_produto
                        - valor_custo_produto
                        - valor_total_produto
                        - valor_desconto
                        - peso_produto
                        - peso_liq_produto
                        - info_adicional
                        - desconto_produto
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
                    id_orcamento: 123456
                    id_produto: 123456
                    id_almoxarifado: 0
                    id_lote: 0
                    desc_produto: Descrição produto 1
                    qtde_produto: '1.0000'
                    ipi_produto: '10.00'
                    icms_produto: '0.00'
                    valor_unit_produto: '429.000000'
                    valor_custo_produto: '150.000000'
                    valor_total_produto: 429
                    valor_desconto: '0.00'
                    peso_produto: '0.00'
                    peso_liq_produto: '0.00'
                    info_adicional: ''
                  - id_ped_produto: 123456
                    id_orcamento: 123456
                    id_produto: 123456
                    id_almoxarifado: null
                    id_lote: null
                    desc_produto: Descrição produto 2
                    qtde_produto: '3.0000'
                    ipi_produto: '7.00'
                    icms_produto: '8.00'
                    valor_unit_produto: '35.000000'
                    valor_custo_produto: '0.000000'
                    valor_total_produto: 105
                    valor_desconto: '0.00'
                    peso_produto: '0.00'
                    peso_liq_produto: '10.00'
                    info_adicional: null
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
                data: Nenhum produto para o orçamento encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16287947-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
