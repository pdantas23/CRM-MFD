# Cadastrar orçamento

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos:
    post:
      summary: Cadastrar orçamento
      deprecated: false
      description: Request para cadastro de orçamentos.
      tags:
        - Vendas/Orçamentos
      parameters:
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
                id_cliente:
                  type: integer
                  description: ID do cliente
                  maximum: 9
                nome_cliente:
                  type: string
                  description: Nome do cliente
                  maxLength: 255
                vendedor_pedido_id:
                  type: integer
                  description: ID do vendedor
                  maximum: 9
                vendedor_pedido:
                  type: string
                  description: Nome do vendedor
                  maxLength: 255
                desconto_pedido:
                  type: string
                  description: Valor total do desconto
                  maxLength: 12
                peso_total_nota:
                  type: string
                  description: Peso total do orçamento
                  maxLength: 12
                peso_total_nota_liq:
                  type: string
                  description: Peso liquido do orçamento
                  maxLength: 12
                frete_pedido:
                  type: string
                  description: Valor do frete
                  maxLength: 12
                valor_baseICMS:
                  type: string
                  description: Valor da base de ICMS
                  maxLength: 12
                valor_ICMS:
                  type: string
                  description: Valor do ICMS
                  maxLength: 12
                valor_baseST:
                  type: string
                  description: Valor da base de ST
                  maxLength: 12
                valor_ST:
                  type: string
                  description: Valor do ST
                  maxLength: 12
                valor_IPI:
                  type: string
                  description: Valor do IPI
                  maxLength: 12
                id_transportadora:
                  type: integer
                  description: ID da transportadora
                  maximum: 9
                transportadora_pedido:
                  type: string
                  description: Nome da transportadora
                  maxLength: 255
                data_pedido:
                  type: string
                  description: Data do orçamento
                  format: date
                prazo_orcamento:
                  type: integer
                  description: Prazo de entrega (Dias)
                  maximum: 20
                referencia_pedido:
                  type: string
                  description: Referência do orçamento
                  maxLength: 100
                valor_total_produtos:
                  type: integer
                  description: Volor total dos produtos
                  maximum: 12
                desconto_pedido_porc:
                  type: string
                  description: Desconto pedido porc
                  maxLength: 100
                valor_total_nota:
                  type: string
                  description: Valor total da nota
                  maxLength: 13
                frete_por_pedido:
                  type: integer
                  description: Modalidade de frete
                  enum:
                    - 0
                    - 1
                    - 9
                  x-apidog-enum:
                    - value: 0
                      name: ''
                      description: Remetente
                    - value: 1
                      name: ''
                      description: Destinatário
                    - value: 9
                      name: ''
                      description: Sem frete
                  maximum: 1
                  minimum: 1
                validade_orcamento:
                  type: string
                  description: Validade do orçamento
                  format: date
                obs_pedido:
                  type: string
                  description: Observações do orçamento
                obs_interno_pedido:
                  type: string
                  description: Observação interna do orçamento
                status_pedido:
                  type: string
                  description: Status do orçamento
                  enum:
                    - Em Aberto
                    - Em Andamento
                    - Atendido
                    - Cancelado
                  x-apidog-enum:
                    - value: Em Aberto
                      name: ''
                      description: Status
                    - value: Em Andamento
                      name: ''
                      description: Status
                    - value: Atendido
                      name: ''
                      description: Status
                    - value: Cancelado
                      name: ''
                      description: Status
              required:
                - nome_cliente
              x-apidog-orders:
                - id_cliente
                - nome_cliente
                - vendedor_pedido_id
                - vendedor_pedido
                - desconto_pedido
                - peso_total_nota
                - peso_total_nota_liq
                - frete_pedido
                - valor_baseICMS
                - valor_ICMS
                - valor_baseST
                - valor_ST
                - valor_IPI
                - id_transportadora
                - transportadora_pedido
                - data_pedido
                - prazo_orcamento
                - referencia_pedido
                - valor_total_produtos
                - desconto_pedido_porc
                - valor_total_nota
                - frete_por_pedido
                - validade_orcamento
                - obs_pedido
                - obs_interno_pedido
                - status_pedido
            example:
              id_cliente: 123456
              nome_cliente: Nome do cliente
              vendedor_pedido_id: 123456
              vendedor_pedido: Nome do vendedor
              desconto_pedido: '10.00'
              peso_total_nota: '0.00'
              peso_total_nota_liq: '0.00'
              frete_pedido: '10.00'
              valor_baseICMS: '0.00'
              valor_ICMS: '0.00'
              valor_baseST: '0.00'
              valor_ST: '0.00'
              valor_IPI: '0.00'
              id_transportadora: 123456
              transportadora_pedido: Nome da transportadora
              data_pedido: '0000-00-00'
              prazo_orcamento: 10
              referencia_pedido: Referência
              valor_total_produtos: 100
              desconto_pedido_porc: '0.00'
              valor_total_nota: '0.00'
              frete_por_pedido: 0
              validade_orcamento: '0000-00-00'
              obs_pedido: Observação
              obs_interno_pedido: Observação interna
              status_pedido: Em Aberto
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
                      id_cliente:
                        type: integer
                        description: ID do cliente
                      nome_cliente:
                        type: string
                        description: Nome do cliente
                      vendedor_pedido_id:
                        type: integer
                        description: ID do vendedor
                      vendedor_pedido:
                        type: string
                        description: Nome do vendedor
                      desconto_pedido:
                        type: string
                        description: Valor total do desconto
                      peso_total_nota:
                        type: string
                        description: Peso total do orçamento
                      peso_total_nota_liq:
                        type: string
                        description: Peso liquido do orçamento
                      frete_pedido:
                        type: string
                        description: Valor do frete
                      valor_ICMS:
                        type: string
                        description: Valor do ICMS
                      valor_baseST:
                        type: string
                        description: Valor da base de ST
                      valor_ST:
                        type: string
                        description: Valor do ST
                      valor_IPI:
                        type: string
                        description: Valor do IPI
                      id_transportadora:
                        type: integer
                        description: ID da transportadora
                      transportadora_pedido:
                        type: string
                        description: Nome da transportadora
                      data_pedido:
                        type: string
                        description: Data do orçamento
                      prazo_orcamento:
                        type: integer
                        description: Prazo de entrega (Dias)
                      referencia_pedido:
                        type: string
                        description: Referência do orçamento
                      valor_total_produtos:
                        type: integer
                        description: Valor total dos produtos
                      desconto_pedido_porc:
                        type: string
                        description: Desconto pedido porc
                      frete_por_pedido:
                        type: integer
                        description: Modalidade de frete
                      validade_orcamento:
                        type: string
                        description: Validade do orçamento
                      obs_pedido:
                        type: string
                        description: Observações do orçamento
                      obs_interno_pedido:
                        type: string
                        description: Observação interna do orçamento
                      status_pedido:
                        type: string
                        description: Status do orçamento
                      id_empresa:
                        type: integer
                        description: ID empresa
                      id_pedido:
                        type: integer
                        description: ID sequência orçamento
                      data_cad_pedido:
                        type: string
                        description: Data cadastrp orçamento
                      id_orcamento:
                        type: integer
                        description: ID orçamento
                      valor_baseICMS:
                        type: string
                        description: Valor da base de ICMS
                    required:
                      - id_cliente
                      - nome_cliente
                      - vendedor_pedido_id
                      - vendedor_pedido
                      - desconto_pedido
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - id_transportadora
                      - transportadora_pedido
                      - data_pedido
                      - prazo_orcamento
                      - referencia_pedido
                      - valor_total_produtos
                      - desconto_pedido_porc
                      - frete_por_pedido
                      - validade_orcamento
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - id_empresa
                      - id_pedido
                      - data_cad_pedido
                      - id_orcamento
                      - valor_baseICMS
                    description: Dados de Resposta
                    x-apidog-orders:
                      - id_cliente
                      - nome_cliente
                      - vendedor_pedido_id
                      - vendedor_pedido
                      - desconto_pedido
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - id_transportadora
                      - transportadora_pedido
                      - data_pedido
                      - prazo_orcamento
                      - referencia_pedido
                      - valor_total_produtos
                      - desconto_pedido_porc
                      - frete_por_pedido
                      - validade_orcamento
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - id_empresa
                      - id_pedido
                      - data_cad_pedido
                      - id_orcamento
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
                  id_cliente: 123456
                  nome_cliente: Nome do cliente
                  vendedor_pedido_id: 123456
                  vendedor_pedido: Nome vendedor
                  desconto_pedido: '10.00'
                  peso_total_nota: '0.00'
                  peso_total_nota_liq: '0.00'
                  frete_pedido: '10.00'
                  valor_ICMS: '0.00'
                  valor_baseST: '0.00'
                  valor_ST: '0.00'
                  valor_IPI: '0.00'
                  id_transportadora: 123456
                  transportadora_pedido: Nome da transportadora
                  data_pedido: '0000-00-00'
                  prazo_orcamento: 10
                  referencia_pedido: Referência
                  valor_total_produtos: 100
                  desconto_pedido_porc: '0.00'
                  frete_por_pedido: 0
                  validade_orcamento: '0000-00-00'
                  obs_pedido: Observação
                  obs_interno_pedido: Observação interna
                  status_pedido: Em Aberto
                  id_empresa: 123456
                  id_pedido: 123456
                  data_cad_pedido: '0000-00-00 00:00:00'
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
                data: Erro ao cadastrar o orçamento!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16285017-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
