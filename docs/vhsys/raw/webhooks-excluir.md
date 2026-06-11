# Excluir webhook

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /webhook/{id_webhook}:
    delete:
      summary: Excluir webhook
      deprecated: false
      description: Request para excluir webhook por ID
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
        '204':
          description: ''
          headers: {}
          x-apidog-name: No Content
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
          content:
            application/json:
              schema:
                type: object
                properties: {}
          headers: {}
          x-apidog-name: Internal Server Error
      security: []
      x-apidog-folder: Webhooks
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16352541-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
