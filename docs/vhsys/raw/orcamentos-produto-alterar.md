# Alterar produto

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/produtos/{id_orcamento_prod}:
    put:
      summary: Alterar produto
      deprecated: false
      description: Request para alterar um produto de um orçamento.
      tags:
        - Vendas/Orçamentos
      parameters:
        - name: id_orcamento
          in: path
          description: ID do orçamento
          required: true
          schema:
            type: string
        - name: id_orcamento_prod
          in: path
          description: ID do vínculo produto/orçamento
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
            example:
              id_produto: 123456
              desc_produto: Descrição do produto
              qtde_produto: '1.00'
              desconto_produto: '10.00'
              ipi_produto: '1.50'
              icms_produto: '2.50'
              valor_unit_produto: '450.00'
              valor_custo_produto: '400.00'
              peso_produto: '1.10'
              peso_liq_produto: '1.10'
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
                        description: ID almoxarifado
                      id_lote:
                        type: integer
                        description: ID lote
                      desc_produto:
                        type: string
                        description: Descrição do produto
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
                        description: Valor total produto
                      valor_desconto:
                        type: string
                        description: Valor do desconto
                      peso_produto:
                        type: string
                        description: Peso do produto
                      peso_liq_produto:
                        type: string
                        description: Peso líquido do produto
                      info_adicional:
                        type: 'null'
                        description: Informação adicional
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
                    description: Dados de Resposta
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
                  id_ped_produto: 123456
                  id_orcamento: 123456
                  id_produto: 123456
                  id_almoxarifado: 0
                  id_lote: 0
                  desc_produto: Descrição do produto
                  qtde_produto: '1.00'
                  ipi_produto: '1.50'
                  icms_produto: '2.50'
                  valor_unit_produto: '450.00'
                  valor_custo_produto: '400.00'
                  valor_total_produto: 450
                  valor_desconto: '0.00'
                  peso_produto: '1.10'
                  peso_liq_produto: '1.10'
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
                data: Erro ao alterar o produto do orçamento!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16285690-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
