# Cadastrar produto

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/produtos:
    post:
      summary: Cadastrar produto
      deprecated: false
      description: Request para cadastrar produtos no orçamento.
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                id_produto:
                  type: integer
                  description: ID do produto
                  maximum: 20
                desc_produto:
                  type: string
                  maxLength: 255
                  description: Nome do produto
                qtde_produto:
                  type: number
                  format: float
                  description: Quantidade do produto
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
                  description: Valor de custo do produto
                valor_unit_produto:
                  type: number
                  format: float
                  description: Valor unitário do produto
                peso_produto:
                  type: number
                  description: Peso do produto
                  format: float
                peso_liq_produto:
                  type: number
                  description: Peso líquido do produto
                  format: float
              x-apidog-orders:
                - id_produto
                - desc_produto
                - qtde_produto
                - desconto_produto
                - ipi_produto
                - icms_produto
                - valor_custo_produto
                - valor_unit_produto
                - peso_produto
                - peso_liq_produto
              required:
                - id_produto
                - desc_produto
                - qtde_produto
                - valor_unit_produto
            example:
              - id_produto: 123456
                desc_produto: Descrição produto 1
                qtde_produto: '3'
                valor_unit_produto: '15.00'
                desconto produto: '15.00'
                ipi_produto: '15.00'
                icms_produto: '15.00'
                peso produto: '15.00'
                peso_liq_produto: '15.00'
              - id_produto: 123456
                desc_produto: Descrição produto 2
                qtde_produto: '3'
                valor_unit_produto: '35.00'
                desconto produto: '5.00'
                ipi_produto: '7.00'
                icms_produto: '8.00'
                peso produto: '9.00'
                peso_liq_produto: '10.00'
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
                        id_produto:
                          type: integer
                          description: ID do produto
                        desc_produto:
                          type: string
                          description: Nome do produto
                        qtde_produto:
                          type: string
                          description: Quantidade do produto
                        valor_unit_produto:
                          type: string
                          description: Valor unitário do produto
                        ipi_produto:
                          type: string
                          description: Valor do IPI
                        icms_produto:
                          type: string
                          description: Valor do ICMS
                        peso_liq_produto:
                          type: string
                          description: Peso líquido do produto
                        valor_total_produto:
                          type: integer
                          description: Valor total do produto
                        id_orcamento:
                          type: integer
                          description: ID do orçamento
                        id_ped_produto:
                          type: integer
                          description: ID do vínculo produto/orçamento
                        desconto_produto:
                          type: number
                          description: Valor do desconto
                          format: float
                        valor_custo_produto:
                          type: number
                          description: Valor de custo do produto
                          format: float
                        peso_produto:
                          type: number
                          description: Peso do produto
                          format: float
                      required:
                        - id_produto
                        - desc_produto
                        - qtde_produto
                        - valor_unit_produto
                        - ipi_produto
                        - icms_produto
                        - peso_liq_produto
                        - valor_total_produto
                        - id_orcamento
                        - id_ped_produto
                      x-apidog-orders:
                        - id_produto
                        - desc_produto
                        - qtde_produto
                        - valor_unit_produto
                        - ipi_produto
                        - icms_produto
                        - peso_liq_produto
                        - valor_total_produto
                        - id_orcamento
                        - id_ped_produto
                        - desconto_produto
                        - valor_custo_produto
                        - peso_produto
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
                  - id_produto: 123456
                    desc_produto: Descrição produto 1
                    qtde_produto: '3.00'
                    valor_unit_produto: '15.00'
                    ipi_produto: '15.00'
                    icms_produto: '15.00'
                    peso_liq_produto: '15.00'
                    valor_total_produto: 45
                    id_orcamento: 123456
                    id_ped_produto: 123456
                  - id_produto: 123456
                    desc_produto: Descrição produto 2
                    qtde_produto: '3.00'
                    valor_unit_produto: '35.00'
                    ipi_produto: '7.00'
                    icms_produto: '8.00'
                    peso_liq_produto: '10.00'
                    valor_total_produto: 105
                    id_orcamento: 123456
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
                data: Erro ao cadastrar o produto para o orçamento!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16285596-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
