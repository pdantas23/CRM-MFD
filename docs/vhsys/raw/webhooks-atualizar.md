# Atualizar webhook

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /webhook/{id_webhook}:
    put:
      summary: Atualizar webhook
      deprecated: false
      description: >-
        Request para atualizar webhook por ID.


        Entidades possíveis:

        - clientes: Cadastro do clientes

        - ordem_servico: Ordens de serviço

        - vendas_balcao: PDV

        - contas_receber: Contas a receber

        - produtos: Cadastros de Produtos

        - todos: Todas as entidades


        > PS: Ao realizar uma inclusão ou atualização de webhooks, o usuário
        conectado no vhsys precisa realizar login novamente para iniciar os
        envios, pois as configurações ficam na sessão do usuario.
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                  description: URL do webhook
                  maxLength: 255
                  nullable: true
                user:
                  type: string
                  description: Usuário a ser cadastrado
                  maxLength: 255
                  nullable: true
                password:
                  type: string
                  description: Senha do usuário
                  maxLength: 255
                  nullable: true
                entidade:
                  type: string
                  description: Entidade do webhook
                  enum:
                    - clientes
                    - servico
                    - vendas_balcao
                    - contas_receber
                    - todos
                    - produtos
                  x-apidog-enum:
                    - value: clientes
                      name: ''
                      description: Cadastro de cliente
                    - value: servico
                      name: ''
                      description: Ordem de serviço
                    - value: vendas_balcao
                      name: ''
                      description: PDV
                    - value: contas_receber
                      name: ''
                      description: Contas a receber
                    - value: todos
                      name: ''
                      description: Todas
                    - value: produtos
                      name: ''
                      description: Produtos
                  nullable: true
              x-apidog-orders:
                - url
                - user
                - password
                - entidade
            example:
              url: https://webhook.com
              user: usuariowebhook
              password: '12345678'
              entidade: clientes
      responses:
        '204':
          description: ''
          headers: {}
          x-apidog-name: No Content
        '400':
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
                    type: string
                    description: Dados da resposta
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 400
                status: error
                data: >-
                  Para cadastrar um webhook para todas as entidades, é
                  necessário excluir os webhooks existentes
          headers: {}
          x-apidog-name: Bad Request
        '401':
          description: ''
          headers: {}
          x-apidog-name: Unauthorized
        '404':
          description: ''
          headers: {}
          x-apidog-name: Not Found
        '422':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  code:
                    type: integer
                    description: Codigo da resposta
                  status:
                    type: string
                    description: Status da resposta
                  mensagem:
                    type: string
                    description: Mensagem de erro
                  erros:
                    type: array
                    items:
                      type: string
                    description: Lista de erros de validacao
                required:
                  - code
                  - status
                  - mensagem
                  - erros
                x-apidog-orders:
                  - code
                  - status
                  - mensagem
                  - erros
              example:
                code: 422
                status: error
                mensagem: Não foi possível processar os dados enviados
                erros:
                  - O campo e-mail é obrigatório.
                  - A senha deve ter pelo menos 8 caracteres.
                  - O formato do e-mail é inválido.
          headers: {}
          x-apidog-name: Unprocessable Entity
        '500':
          description: ''
          headers: {}
          x-apidog-name: Internal Server Error
      security: []
      x-apidog-folder: Webhooks
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16288772-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
