# Listar Vendedores

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /vendedores:
    get:
      summary: Listar Vendedores
      deprecated: false
      description: Request para consultar diversos vendedores.
      tags:
        - Cadastros/Vendedores
      parameters:
        - name: order
          in: query
          description: 'Nome do campo para ordenação EX: data_mod_vendedor'
          required: false
          schema:
            type: string
        - name: sort
          in: query
          description: Tipo de ordenação
          required: false
          schema:
            type: string
            enum:
              - Asc
              - ' Desc'
            x-apidog-enum:
              - value: Asc
                name: ''
                description: Tipo de ordenação
              - value: ' Desc'
                name: ''
                description: Tipo de ordenação
            default: Asc
        - name: limit
          in: query
          description: Limite de registros
          required: false
          schema:
            type: integer
        - name: offset
          in: query
          description: Registro inicial da consulta
          required: false
          schema:
            type: integer
        - name: cnpj_vendedor
          in: query
          description: CNPJ / CPF do Vendedor
          required: false
          schema:
            type: string
        - name: razao_vendedor
          in: query
          description: Razão social ou Nome do vendedor
          required: false
          schema:
            type: string
        - name: fantasia_vendedor
          in: query
          description: Nome Fantasia do vendedor
          required: false
          schema:
            type: string
        - name: lixeira
          in: query
          description: Excluído
          required: false
          schema:
            type: string
            enum:
              - ' Sim'
              - ' Nao'
            x-apidog-enum:
              - value: ' Sim'
                name: ''
                description: Excluído
              - value: ' Nao'
                name: ''
                description: Excluído
            default: 'null'
        - name: data_modificacao
          in: query
          description: Registros modificados após a data informada
          required: false
          schema:
            type: string
            format: date-time
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
                    description: Código da resposta
                  status:
                    type: string
                    description: Status da resposta
                  paging:
                    type: object
                    properties:
                      total_count:
                        type: integer
                      total:
                        type: integer
                        description: Total de vendedores no sistema
                      offset:
                        type: integer
                        description: Offset da busca
                      limit:
                        type: integer
                        description: Limite da busca
                      limit_max:
                        type: integer
                        description: Limite máximo da busca
                    required:
                      - total_count
                      - total
                      - offset
                      - limit
                      - limit_max
                    x-apidog-orders:
                      - total_count
                      - total
                      - offset
                      - limit
                      - limit_max
                    description: Dados de paginação
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id_vendedor:
                          type: integer
                          description: ID do vendedor
                        id_registro:
                          type: integer
                          description: ID registro
                        tipo_pessoa:
                          type: string
                          description: Tipo do cadastro
                        cnpj_vendedor:
                          type: string
                          description: CNPJ / CPF do vendedor
                        razao_vendedor:
                          type: string
                          description: Razão social ou nome
                        fantasia_vendedor:
                          type: string
                          description: Nome Fantasia
                        endereco_vendedor:
                          type: string
                          description: Endereço
                        numero_vendedor:
                          type: string
                          description: Número endereço
                        bairro_vendedor:
                          type: string
                          description: Bairro
                        complemento_vendedor:
                          type: string
                          description: Complemento
                        cep_vendedor:
                          type: string
                          description: CEP
                        cidade_vendedor:
                          type: string
                          description: Cidade
                        uf_vendedor:
                          type: string
                          description: Estado
                        contato_vendedor:
                          type: string
                          description: Nome do contato do vendedor
                        fone_vendedor:
                          type: string
                          description: Telefone do vendedor
                        fone_ramal_vendedor:
                          type: string
                          description: Número do ramal
                        celular_vendedor:
                          type: string
                          description: Celular do vendedor
                        email_vendedor:
                          type: string
                          description: E-mail do vendedor
                        website_vendedor:
                          type: string
                          description: Website
                        listapreco_vendedor:
                          type: 'null'
                          description: Lista de preço vendedor
                        banco_vendedor:
                          type: string
                          description: Nome do banco
                        banco_agencia:
                          type: string
                          description: Agencia
                        banco_conta:
                          type: string
                          description: Conta
                        banco_salario:
                          type: string
                          description: Salário
                        situacao_vendedor:
                          type: string
                          description: Situação vendedor
                        comissao_usuario:
                          type: string
                          description: Valor da comissão
                        comissao_regra:
                          type: integer
                          description: Regra para comissão
                        usuario_vendedor:
                          type: 'null'
                          description: Usuário vinculado ao vendedor
                        observacoes_vendedor:
                          type: string
                          description: Observações do cadastro
                        data_cad_vendedor:
                          type: string
                          description: Data de cadastro do vendedor
                        data_mod_vendedor:
                          type: string
                          description: Data da última modificação
                        lixeira:
                          type: string
                          description: Situação do vendedor no sistema
                      x-apidog-orders:
                        - id_vendedor
                        - id_registro
                        - tipo_pessoa
                        - cnpj_vendedor
                        - razao_vendedor
                        - fantasia_vendedor
                        - endereco_vendedor
                        - numero_vendedor
                        - bairro_vendedor
                        - complemento_vendedor
                        - cep_vendedor
                        - cidade_vendedor
                        - uf_vendedor
                        - contato_vendedor
                        - fone_vendedor
                        - fone_ramal_vendedor
                        - celular_vendedor
                        - email_vendedor
                        - website_vendedor
                        - listapreco_vendedor
                        - banco_vendedor
                        - banco_agencia
                        - banco_conta
                        - banco_salario
                        - situacao_vendedor
                        - comissao_usuario
                        - comissao_regra
                        - usuario_vendedor
                        - observacoes_vendedor
                        - data_cad_vendedor
                        - data_mod_vendedor
                        - lixeira
                    description: Dados de Resposta
                required:
                  - code
                  - status
                  - paging
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - paging
                  - data
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
                    description: status do retorno
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
                data: Nenhum vendedor encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Cadastros/Vendedores
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-15955963-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
