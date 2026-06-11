# Listar status

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}/status:
    get:
      summary: Listar status
      deprecated: false
      description: Request para a consulta dos status do orçamento.
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
                        id_status:
                          type: integer
                          description: Id do status
                        id_orcamento:
                          type: integer
                          description: ID do orçamento
                        data_status:
                          type: string
                          description: Data de cadastro do status
                        obs_status:
                          type: string
                          description: Descrição do status
                        tipo_status:
                          type: string
                          description: Tipo do status
                        id_usuario:
                          type: integer
                          nullable: true
                        nome_usuario:
                          type: string
                          nullable: true
                      required:
                        - id_status
                        - id_orcamento
                        - data_status
                        - obs_status
                        - tipo_status
                        - id_usuario
                        - nome_usuario
                      x-apidog-orders:
                        - id_status
                        - id_orcamento
                        - data_status
                        - obs_status
                        - tipo_status
                        - id_usuario
                        - nome_usuario
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
                  - id_status: 123456
                    id_orcamento: 123456
                    data_status: '0000-00-00'
                    obs_status: Observação do status
                    tipo_status: Em Aberto
                    id_usuario: 123456
                    nome_usuario: usuário
                  - id_status: 123456
                    id_orcamento: 123456
                    data_status: '0000-00-00'
                    obs_status: Observação do status
                    tipo_status: Cancelado
                    id_usuario: null
                    nome_usuario: null
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
                    description: Código da retorno
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
                data: Nenhum status para o orçamento encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16287963-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
