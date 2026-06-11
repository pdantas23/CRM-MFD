# Listar webhooks

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /webhook:
    get:
      summary: Listar webhooks
      deprecated: false
      description: Request para listar os webhooks.
      tags:
        - Webhooks
      parameters:
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
                    type: array
                    items:
                      type: object
                      properties:
                        id_webhook:
                          type: integer
                          description: ID webhook
                        id_parceiro:
                          type: 'null'
                          description: ID parceiro
                        entidade:
                          type: string
                          description: Entidade do webhook
                        url:
                          type: string
                          description: URL do webhook
                        user:
                          type: string
                          description: Usuário cadastrado
                        data_cad_webhook:
                          type: string
                          description: Data de cadastro webhook
                        data_mod_webhook:
                          type: string
                          description: Data da ultima alteração webhook
                      required:
                        - id_webhook
                        - id_parceiro
                        - entidade
                        - url
                        - user
                        - data_cad_webhook
                        - data_mod_webhook
                      x-apidog-orders:
                        - id_webhook
                        - id_parceiro
                        - entidade
                        - url
                        - user
                        - data_cad_webhook
                        - data_mod_webhook
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
                  - id_webhook: -97193569
                    id_parceiro: null
                    entidade: produtos
                    url: https://sneaky-tuxedo.com/
                    user: foo
                    data_cad_webhook: '2025-05-28 17:23:19'
                    data_mod_webhook: '2026-01-13 18:22:52'
                  - id_webhook: 91680606
                    id_parceiro: null
                    entidade: vendas_balcao
                    url: https://amused-heartbeat.info/
                    user: foo
                    data_cad_webhook: '2025-05-28 17:23:19'
                    data_mod_webhook: '2026-01-13 18:22:52'
          headers: {}
          x-apidog-name: Success
        '401':
          description: ''
          headers: {}
          x-apidog-name: Unauthorized
        '500':
          description: ''
          headers: {}
          x-apidog-name: Internal Server Error
      security: []
      x-apidog-folder: Webhooks
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16288074-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
