# Cadastrar webhook

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /webhook:
    post:
      summary: Cadastrar webhook
      deprecated: false
      description: >-
        Request para cadastro de webhooks.


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
                  minLength: 8
                  examples:
                    - http://domain.com
                user:
                  type: string
                  maxLength: 255
                  minLength: 8
                  description: Usuário a ser cadastrado
                password:
                  type: string
                  maxLength: 255
                  minLength: 8
                  description: Senha do usuário
                entidade:
                  type: string
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
                  description: Entidade do webhook
              required:
                - url
                - user
                - password
                - entidade
              x-apidog-orders:
                - url
                - user
                - password
                - entidade
            example:
              url: https://webhook.com
              user: usuariowebhook
              password: '12345678'
              entidade: vendas_balcao
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
                      user:
                        type: string
                        description: Usuário a ser cadastrado
                      entidade:
                        type: string
                        description: Entidade do webhook
                      url:
                        type: string
                        description: URL do webhook
                      id_parceiro:
                        type: 'null'
                        description: ID Parceiro
                      data_mod_webhook:
                        type: string
                        description: Data de Cadastro
                      data_cad_webhook:
                        type: string
                        description: Data de Atualizacao
                      id_webhook:
                        type: integer
                        description: ID webhook
                    required:
                      - user
                      - entidade
                      - url
                      - id_parceiro
                      - data_mod_webhook
                      - data_cad_webhook
                      - id_webhook
                    x-apidog-orders:
                      - user
                      - entidade
                      - url
                      - id_parceiro
                      - data_mod_webhook
                      - data_cad_webhook
                      - id_webhook
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
                code: 201
                status: success
                data:
                  url: https://super-hydrolyze.net/
                  user: ex est incididunt
                  entidade: nulla ut amet Duis nostrud
                  id_webhook: null
                  data_mod_webhook: '2026-04-08 14:31:29'
                  data_cad_webhook: '2026-04-08 14:31:29'
          headers: {}
          x-apidog-name: Success
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
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16288524-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
