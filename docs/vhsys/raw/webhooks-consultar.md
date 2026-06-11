# Consultar webhook

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /webhook/{id_webhook}:
    get:
      summary: Consultar webhook
      deprecated: false
      description: Request para consultar webhook por ID
      tags:
        - Webhooks
      parameters:
        - name: id_webhook
          in: path
          description: ID do webhook
          required: true
          schema:
            type: integer
        - name: access-token
          in: header
          description: ''
          required: false
          example: '{{ACCESS_TOKEN}}'
          schema:
            type: string
        - name: secret-access-token
          in: header
          description: ''
          required: false
          example: '{{SECRET_ACCESS_TOKEN}}'
          schema:
            type: string
        - name: cache-control
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
                    description: Código da resposta
                  status:
                    type: string
                    description: Status da resposta
                  data:
                    type: object
                    properties:
                      id_webhook:
                        type: integer
                        description: ID do webhook
                      id_parceiro:
                        type: 'null'
                        description: ID do parceiro
                      entidade:
                        type: string
                        description: Entidade
                      url:
                        type: string
                        description: Url
                      user:
                        type: string
                        description: User
                      data_cad_webhook:
                        type: string
                        description: Data de Cadastro
                      data_mod_webhook:
                        type: string
                        description: Data de Atualizacao
                    required:
                      - id_webhook
                      - id_parceiro
                      - entidade
                      - url
                      - user
                      - data_cad_webhook
                      - data_mod_webhook
                    description: Dados de Resposta
                    x-apidog-orders:
                      - id_webhook
                      - id_parceiro
                      - entidade
                      - url
                      - user
                      - data_cad_webhook
                      - data_mod_webhook
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
                  id_webhook: 14772504
                  id_parceiro: null
                  entidade: produtos
                  url: https://biodegradable-kick.org/
                  user: foo
                  data_cad_webhook: '2025-04-09 17:22:28'
                  data_mod_webhook: '2026-01-13 18:22:52'
          headers: {}
          x-apidog-name: Success
        '401':
          description: ''
          headers: {}
          x-apidog-name: Unauthorized
        '404':
          description: ''
          headers: {}
          x-apidog-name: Not Found
        '500':
          description: ''
          headers: {}
          x-apidog-name: Internal Server Error
      security: []
      x-apidog-folder: Webhooks
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-32903496-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
