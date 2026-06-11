# Listar parcelas

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/parcelas:
    get:
      summary: Listar parcelas
      deprecated: false
      description: Request para a consulta das parcelas de um orçamento.
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
                        id_orcamento:
                          type: integer
                          description: ID do orçamento
                        data_parcela:
                          type: string
                          description: Data da parcela
                        valor_parcela:
                          type: string
                          description: Valor da parcela
                        forma_pagamento:
                          type: string
                          description: Forma de pagamento
                        observacoes_parcela:
                          type: string
                          description: Observação da parcela
                      required:
                        - id_orcamento
                        - data_parcela
                        - valor_parcela
                        - forma_pagamento
                        - observacoes_parcela
                      x-apidog-orders:
                        - id_orcamento
                        - data_parcela
                        - valor_parcela
                        - forma_pagamento
                        - observacoes_parcela
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
                  - id_orcamento: 123456
                    data_parcela: '0000-00-00'
                    valor_parcela: '100.00'
                    forma_pagamento: Boleto
                    observacoes_parcela: Observação
                  - id_orcamento: 123456
                    data_parcela: '0000-00-00'
                    valor_parcela: '100.00'
                    forma_pagamento: Boleto
                    observacoes_parcela: Observação
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
                data: Nenhuma parcela para o orçamento encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16287968-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
