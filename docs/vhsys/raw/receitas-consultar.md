# Consultar receita

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /contas-receber/{id_receita}:
    get:
      summary: Consultar receita
      deprecated: false
      description: Request para consultar contas a receber.
      tags:
        - Financeiro/Contas a receber
      parameters:
        - name: id_receita
          in: path
          description: ID contas a receber
          required: true
          schema:
            type: string
        - name: parciais
          in: query
          description: |-
            Retornar as parciais
            para retornar as parciais: ?parciais=1

            Valor padrão: 0
            Valores permitidos: 1, 0
          required: false
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
                01JRJJRMAZ12JJP6GBT2EHASWX:
                  type: string
              x-apidog-orders:
                - 01JRJJRMAZ12JJP6GBT2EHASWX
              required:
                - 01JRJJRMAZ12JJP6GBT2EHASWX
            example: ''
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
                        id_conta_rec:
                          type: integer
                          description: ID da receita
                        id_empresa:
                          type: integer
                          description: ID empresa
                        id_registro:
                          type: integer
                          description: ID do registro
                        identificacao:
                          type: string
                          description: Identificação
                        nome_conta:
                          type: string
                          description: Nome da receita
                        id_categoria:
                          type: integer
                          description: ID da categoria
                        categoria_rec:
                          type: string
                          description: Nome da categoria
                        id_banco:
                          type: integer
                          description: ID do banco
                        id_cliente:
                          type: integer
                          description: ID do cliente
                        id_boleto:
                          type: integer
                          description: Id boleto
                        nome_cliente:
                          type: string
                          description: Nome do cliente
                        vencimento_rec:
                          type: string
                          description: Data do vencimento
                        valor_rec:
                          type: string
                          description: Valor da receita
                        valor_pago:
                          type: string
                          description: Valor pago
                        data_emissao:
                          type: string
                          description: Data da emissão
                        vencimento_original:
                          type: 'null'
                          description: Valor original
                        n_documento_rec:
                          type: string
                          description: Número do documento
                        observacoes_rec:
                          type: string
                          description: Observações da receita
                        id_centro_custos:
                          type: integer
                          description: ID do centro de custo
                        centro_custos_rec:
                          type: string
                          description: Nome do centro de custo
                        praca_pagamento:
                          type: string
                          description: Praça pagamento
                        liquidado_rec:
                          type: string
                          description: Se a conta esta liquidada
                        data_pagamento:
                          type: 'null'
                          description: Data do pagamento
                        obs_pagamento:
                          type: 'null'
                          description: Observação do pagamento
                        forma_pagamento:
                          type: string
                          description: Forma de pagamento
                        valor_juros:
                          type: string
                          description: Valor dos juros
                        valor_desconto:
                          type: 'null'
                          description: Valor do desconto
                        valor_acrescimo:
                          type: 'null'
                          description: Valor do acrescimo
                        valor_taxa:
                          type: string
                          description: Valor taxa
                        retorno_pagamento:
                          type: integer
                          description: Retorno pagamento
                        tipo_conta:
                          type: string
                          description: Tipo da conta
                        data_cad_rec:
                          type: string
                          description: Data de cadastro da receita
                        data_mod_rec:
                          type: string
                          description: Data da última modificação
                        boleto_enviado:
                          type: integer
                          description: Boleto enviado
                        boleto_original:
                          type: integer
                          description: Boleto original
                        duplicata_enviado:
                          type: integer
                          description: Duplicata enviado
                        remetido:
                          type: integer
                          description: Remetido
                        registrado:
                          type: integer
                          description: Registrado
                        protestar:
                          type: integer
                          description: Protesto
                        dias_protestar:
                          type: integer
                          description: Dias protesto
                        NossoNumero:
                          type: string
                          description: Nosso número boleto
                        agrupado:
                          type: integer
                          description: Se essa receita foi agrupada com outras
                        agrupado_data:
                          type: string
                          description: Data do agrupamento da receita
                        agrupado_user:
                          type: string
                          description: Usuário que efetuou o agrupamento
                        agrupamento:
                          type: integer
                          description: Se essa receita é o resultado de um agrupamento
                        fluxo:
                          type: integer
                          description: Fluxo
                        lixeira:
                          type: string
                          description: Situação da receita no sistema
                        id_pagamento_ob:
                          type: string
                          description: ID pagamento observação
                        situacao:
                          type: string
                          description: Situação
                        status:
                          type: integer
                          description: Status
                        valor_baixa:
                          type: string
                          description: Valor baixa
                        link_boleto:
                          type: string
                          description: Link do boleto gerado
                        brcode:
                          type: string
                          description: >-
                            Código “copia e cola” do pix de cobrança gerado.
                            (disponível somente quando a conta é do tipo “Pix“ e
                            vinculada a uma conta PJ Stone)
                      x-apidog-orders:
                        - id_conta_rec
                        - id_empresa
                        - id_registro
                        - identificacao
                        - nome_conta
                        - id_categoria
                        - categoria_rec
                        - id_banco
                        - id_cliente
                        - id_boleto
                        - nome_cliente
                        - vencimento_rec
                        - valor_rec
                        - valor_pago
                        - data_emissao
                        - vencimento_original
                        - n_documento_rec
                        - observacoes_rec
                        - id_centro_custos
                        - centro_custos_rec
                        - praca_pagamento
                        - liquidado_rec
                        - data_pagamento
                        - obs_pagamento
                        - forma_pagamento
                        - valor_juros
                        - valor_desconto
                        - valor_acrescimo
                        - valor_taxa
                        - retorno_pagamento
                        - tipo_conta
                        - data_cad_rec
                        - data_mod_rec
                        - boleto_enviado
                        - boleto_original
                        - duplicata_enviado
                        - remetido
                        - registrado
                        - protestar
                        - dias_protestar
                        - NossoNumero
                        - agrupado
                        - agrupado_data
                        - agrupado_user
                        - agrupamento
                        - fluxo
                        - lixeira
                        - id_pagamento_ob
                        - situacao
                        - status
                        - valor_baixa
                        - link_boleto
                        - brcode
                      required:
                        - brcode
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
                  - id_conta_rec: 123456
                    id_empresa: 123456
                    id_registro: 1
                    identificacao: ''
                    nome_conta: Nome da conta
                    id_categoria: 0
                    categoria_rec: Outras Receitas
                    id_banco: 123456
                    id_cliente: 123456
                    id_boleto: 0
                    nome_cliente: Nome do cliente
                    vencimento_rec: 000-00-00
                    valor_rec: '0.00'
                    valor_pago: '0.00'
                    data_emissao: 000-00-00
                    vencimento_original: null
                    n_documento_rec: ''
                    observacoes_rec: ''
                    id_centro_custos: 0
                    centro_custos_rec: ''
                    praca_pagamento: ''
                    liquidado_rec: Nao
                    data_pagamento: null
                    obs_pagamento: null
                    forma_pagamento: ''
                    valor_juros: '0.00'
                    valor_desconto: null
                    valor_acrescimo: null
                    valor_taxa: '0.00'
                    retorno_pagamento: 0
                    tipo_conta: Conta
                    data_cad_rec: '0000-00-00 00:00:00'
                    data_mod_rec: '0000-00-00 00:00:00'
                    boleto_enviado: 0
                    boleto_original: 0
                    duplicata_enviado: 0
                    remetido: 0
                    registrado: 0
                    protestar: 0
                    dias_protestar: 0
                    NossoNumero: null
                    agrupado: 0
                    agrupado_data: null
                    agrupado_user: null
                    agrupamento: 0
                    fluxo: 0
                    lixeira: Nao
                    id_pagamento_ob: null
                    situacao: null
                    status: 1
                    valor_baixa: '0.00'
                    link_boleto: null
                    brcode: 00020101021226890014br.gov.bcb.pix2567pix-h.stone.com.br
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
                    type: integer
                    description: Código da resposta
                  status:
                    type: string
                    description: Status da resposta
                  data:
                    type: string
                    description: Dados do erro
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 403
                status: error
                data: Nenhuma receita encontrada!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Financeiro/Contas a receber
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-15847145-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
