# Consultar orçamento

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /orcamentos/{id_orcamento}:
    get:
      summary: Consultar orçamento
      deprecated: false
      description: Request para consultar dados de um orçamento.
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
                    type: object
                    properties:
                      id_orcamento:
                        type: integer
                        description: ID orçamento
                      id_empresa:
                        type: integer
                        description: ID empresa
                      id_pedido:
                        type: integer
                        description: ID sequencia orçamento
                      id_cliente:
                        type: integer
                        description: ID cliente
                      nome_cliente:
                        type: string
                        description: Nome do cliente
                      id_local_entrega:
                        type: integer
                        description: ID local de entrega
                      id_local_retirada:
                        type: integer
                        description: ID local de retirada
                      id_local_cobranca:
                        type: integer
                        description: ID local cobrança
                      vendedor_pedido:
                        type: string
                        description: Nome do vendedor
                      vendedor_pedido_id:
                        type: integer
                        description: ID do vendedor
                      listapreco_produtos:
                        type: integer
                        description: Lista de preço
                      valor_total_produtos:
                        type: string
                        description: Valor total dos produtos
                      desconto_pedido:
                        type: string
                        description: Descronto orçamento
                      desconto_pedido_porc:
                        type: string
                        description: Descronto orçamento porc
                      peso_total_nota:
                        type: string
                        description: Peso total orçamento
                      peso_total_nota_liq:
                        type: string
                        description: Peso liquido orçamento
                      frete_pedido:
                        type: string
                        description: Valor do frete
                      valor_total_nota:
                        type: string
                        description: Valor total do orçamento
                      valor_baseICMS:
                        type: string
                        description: Valor da base do ICMS
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
                      condicao_pagamento_id:
                        type: integer
                        description: ID condição de pagamento
                      condicao_pagamento:
                        type: string
                        description: Condição de pagamento
                      frete_por_pedido:
                        type: integer
                        description: Modalidade de frete
                      transportadora_pedido:
                        type: string
                        description: Nome da transportadora
                      id_transportadora:
                        type: integer
                        description: ID da transportadora
                      data_pedido:
                        type: string
                        description: Data do orçamento
                      validade_orcamento:
                        type: string
                        description: Validade orçamento
                      prazo_orcamento:
                        type: string
                        description: Prazo de entrega (Dias)
                      referencia_pedido:
                        type: string
                        description: Referência do orçamento
                      obs_pedido:
                        type: string
                        description: Observações do orçamento
                      obs_interno_pedido:
                        type: string
                        description: Observações internas do orçamento
                      status_pedido:
                        type: string
                        description: Status do orçamento
                      contas_pedido:
                        type: integer
                        description: Contas lançadas
                      comissao_pedido:
                        type: integer
                        description: Comissão Lançada
                      estoque_pedido:
                        type: integer
                        description: Estoque Lançado
                      pdv_emitido:
                        type: integer
                        description: PDV emitido
                      pedido_emitido:
                        type: integer
                        description: Pedido emitido
                      nota_emitida:
                        type: integer
                        description: Nota emitida
                      funil_emitido:
                        type: integer
                        description: Orçamento gerado no funil de vendas
                      agrupado:
                        type: integer
                        description: Se agrupado
                      id_almoxarifado:
                        type: integer
                        description: ID almoxarifado
                      data_cad_pedido:
                        type: string
                        description: Data de cadastro do orçamento
                      data_mod_pedido:
                        type: string
                        description: Data da última modificação
                      lixeira:
                        type: string
                        description: Situação do orçamento no sistema
                    required:
                      - id_orcamento
                      - id_empresa
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - id_local_entrega
                      - id_local_retirada
                      - id_local_cobranca
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - listapreco_produtos
                      - valor_total_produtos
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_total_nota
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - condicao_pagamento_id
                      - condicao_pagamento
                      - frete_por_pedido
                      - transportadora_pedido
                      - id_transportadora
                      - data_pedido
                      - validade_orcamento
                      - prazo_orcamento
                      - referencia_pedido
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - contas_pedido
                      - comissao_pedido
                      - estoque_pedido
                      - pdv_emitido
                      - pedido_emitido
                      - nota_emitida
                      - funil_emitido
                      - agrupado
                      - id_almoxarifado
                      - data_cad_pedido
                      - data_mod_pedido
                      - lixeira
                    description: Dados de Resposta
                    x-apidog-orders:
                      - id_orcamento
                      - id_empresa
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - id_local_entrega
                      - id_local_retirada
                      - id_local_cobranca
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - listapreco_produtos
                      - valor_total_produtos
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_total_nota
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - condicao_pagamento_id
                      - condicao_pagamento
                      - frete_por_pedido
                      - transportadora_pedido
                      - id_transportadora
                      - data_pedido
                      - validade_orcamento
                      - prazo_orcamento
                      - referencia_pedido
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - contas_pedido
                      - comissao_pedido
                      - estoque_pedido
                      - pdv_emitido
                      - pedido_emitido
                      - nota_emitida
                      - funil_emitido
                      - agrupado
                      - id_almoxarifado
                      - data_cad_pedido
                      - data_mod_pedido
                      - lixeira
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
                  id_orcamento: 123456
                  id_empresa: 123456
                  id_pedido: 123456
                  id_cliente: 123456
                  nome_cliente: Nome do cliente
                  id_local_entrega: 0
                  id_local_retirada: 0
                  id_local_cobranca: 0
                  vendedor_pedido: Vendedor 1
                  vendedor_pedido_id: 123456
                  listapreco_produtos: 0
                  valor_total_produtos: '100.00'
                  desconto_pedido: '10.00'
                  desconto_pedido_porc: '0.00'
                  peso_total_nota: '0.00'
                  peso_total_nota_liq: '0.0000'
                  frete_pedido: '10.00'
                  valor_total_nota: '0.00'
                  valor_baseICMS: '0.00'
                  valor_ICMS: '0.00'
                  valor_baseST: '0.00'
                  valor_ST: '0.00'
                  valor_IPI: '0.00'
                  condicao_pagamento_id: 123456
                  condicao_pagamento: Condição de pagamento
                  frete_por_pedido: 0
                  transportadora_pedido: Nome da transportadora
                  id_transportadora: 123456
                  data_pedido: '0000-00-00'
                  validade_orcamento: '0000-00-00'
                  prazo_orcamento: '10'
                  referencia_pedido: Referência
                  obs_pedido: Observação
                  obs_interno_pedido: Observação interna
                  status_pedido: Em Aberto
                  contas_pedido: 0
                  comissao_pedido: 0
                  estoque_pedido: 0
                  pdv_emitido: 0
                  pedido_emitido: 0
                  nota_emitida: 0
                  funil_emitido: 0
                  agrupado: 0
                  id_almoxarifado: 1
                  data_cad_pedido: '0000-00-00 00:00:00'
                  data_mod_pedido: '0000-00-00 00:00:00'
                  lixeira: Sim
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
                data: Nenhum orçamento encontrado!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Orçamentos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16285203-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
