# Cadastrar parcelas

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/parcelas:
    post:
      summary: Cadastrar parcelas
      deprecated: false
      description: >-
        Request para cadastro de parcelas no orçamento, ao cadastrar novas
        parcelas em um orçamento, as parcelas anteriores serão removidas.
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
                data_parcela:
                  type: string
                  description: Data da parcela
                  format: date
                valor_parcela:
                  type: number
                  format: float
                  description: Valor da parcela
                forma_pagamento:
                  type: string
                  description: Forma de pagamento
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
                observacoes_parcela:
                  type: string
                  description: Observação da parcela
                  maxLength: 255
              x-apidog-orders:
                - data_parcela
                - valor_parcela
                - forma_pagamento
                - observacoes_parcela
              required:
                - data_parcela
                - valor_parcela
            example:
              - data_parcela: '0000-00-00'
                valor_parcela: '100.00'
                forma_pagamento: Boleto
                observacoes_parcela: Observação
              - data_parcela: '0000-00-00'
                valor_parcela: '100.00'
                forma_pagamento: Boleto
                observacoes_parcela: Observação
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
                        id_orcamento:
                          type: integer
                          description: ID do orçamento
                      required:
                        - data_parcela
                        - valor_parcela
                        - forma_pagamento
                        - observacoes_parcela
                        - id_orcamento
                      x-apidog-orders:
                        - data_parcela
                        - valor_parcela
                        - forma_pagamento
                        - observacoes_parcela
                        - id_orcamento
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
                  - data_parcela: '0000-00-00'
                    valor_parcela: '100.00'
                    forma_pagamento: Boleto
                    observacoes_parcela: Observação
                    id_orcamento: 123456
                  - data_parcela: '0000-00-00'
                    valor_parcela: '100.00'
                    forma_pagamento: Boleto
                    observacoes_parcela: Observação
                    id_orcamento: 123456
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
                data: Erro ao cadastrar a parcela para o orçamento!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16287924-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
