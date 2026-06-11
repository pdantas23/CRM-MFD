# Cadastrar status

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /pedidos/{id_ped}/status:
    post:
      summary: Cadastrar status
      deprecated: false
      description: Requisição para cadastro de status do pedido.
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
                data_status:
                  type: string
                  description: Data do status
                  format: date
                obs_status:
                  type: string
                  maxLength: 255
                  description: Observação do status
                tipo_status:
                  type: string
                  description: Tipo do status
                  enum:
                    - Em Aberto
                    - Em Andamento
                    - Cancelado
                    - Atendido
                  x-apidog-enum:
                    - value: Em Aberto
                      name: ''
                      description: Tipo do status
                    - value: Em Andamento
                      name: ''
                      description: Tipo do status
                    - value: Cancelado
                      name: ''
                      description: Tipo do status
                    - value: Atendido
                      name: ''
                      description: Tipo do status
              required:
                - data_status
                - tipo_status
              x-apidog-orders:
                - data_status
                - obs_status
                - tipo_status
            example:
              data_status: '0000-00-00'
              obs_status: Observação do status
              tipo_status: Cancelado
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
                      data_status:
                        type: string
                        description: Data do status
                      obs_status:
                        type: string
                        description: Observação do status
                      tipo_status:
                        type: string
                        description: Tipo do status
                      id_pedido:
                        type: integer
                        description: ID do pedido
                    required:
                      - data_status
                      - obs_status
                      - tipo_status
                      - id_pedido
                    description: Dados de Resposta
                    x-apidog-orders:
                      - data_status
                      - obs_status
                      - tipo_status
                      - id_pedido
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
                  data_status: '0000-00-00'
                  obs_status: Observação do status
                  tipo_status: Cancelado
                  id_pedido: 123456
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
                data: Erro ao cadastrar o status para o pedido!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Pedidos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16434450-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
