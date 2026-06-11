# Listar produtos 

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /produtos:
    get:
      summary: 'Listar produtos '
      deprecated: false
      description: Request para listar diversos produtos..
      tags:
        - Cadastros/Produtos
      parameters:
        - name: order
          in: query
          description: 'Nome do campo para ordenação EX: data_mod_produto'
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
              - Desc
            x-apidog-enum:
              - value: Asc
                name: ''
                description: Tipo de ordenação
              - value: Desc
                name: ''
                description: Tipo de ordenação
            default: Asc
        - name: limit
          in: query
          description: Limite de registros
          required: false
          schema:
            type: string
            maxLength: 250
        - name: offset
          in: query
          description: Registro inicial da consulta
          required: false
          schema:
            type: integer
        - name: cod_produto
          in: query
          description: Código do produto
          required: false
          schema:
            type: string
        - name: marca_produto
          in: query
          description: Marca do produto
          required: false
          schema:
            type: string
        - name: desc_produto
          in: query
          description: Nome do produto
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
              - Sim
              - Nao
            x-apidog-enum:
              - value: Sim
                name: ''
                description: Excluído
              - value: Nao
                name: ''
                description: Excluído
            default: 'null'
        - name: data_modificacao
          in: query
          description: Registros criados ou modificados após a data informada
          required: false
          schema:
            type: string
            format: date-time
        - name: lista_preco
          in: query
          description: Retorna as listas de preço vinculados a esse produto
          required: false
          schema:
            type: string
            default: 'null'
            enum:
              - '1'
              - '0'
            x-apidog-enum:
              - value: '1'
                name: ''
                description: ''
              - value: '0'
                name: ''
                description: ''
        - name: loja_visivel
          in: query
          description: Produto visível na loja virtual
          required: false
          schema:
            type: string
            enum:
              - '1'
              - '0'
            x-apidog-enum:
              - value: '1'
                name: ''
                description: Sim
              - value: '0'
                name: ''
                description: Não
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
        - name: partner-token
          in: header
          description: token do parceiro
          required: false
          example: '{{PARTNER_TOKEN}}'
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
                  paging:
                    type: object
                    properties:
                      total_count:
                        type: integer
                      total:
                        type: integer
                        description: Total de produtos no sistema
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
                        id_produto:
                          type: integer
                          description: ID do produto
                        id_registro:
                          type: integer
                          description: ID do registro
                        id_empresa:
                          type: integer
                          description: ID empresa
                        id_categoria:
                          type: integer
                          description: ID da categoria
                        cod_produto:
                          type: string
                          description: Código do produto
                        marca_produto:
                          type: string
                          description: Marca do produto
                        desc_produto:
                          type: string
                          description: Descrição produto
                        atalho_produto:
                          type: string
                          description: Atalho para o produto
                        fornecedor_produto:
                          type: string
                          description: Nome do Fornecedor
                        fornecedor_produto_id:
                          type: integer
                          description: ID do Fornecedor
                        produto_variado:
                          type: integer
                          description: Informa se é um Produto Variado
                        id_produto_parent:
                          type: integer
                          description: Id produto parent
                        minimo_produto:
                          type: string
                          description: Estoque minimo para produto
                        maximo_produto:
                          type: string
                          description: Estoque máximo para o produto
                        estoque_produto:
                          type: string
                          description: Estoque atual do produto
                        unidade_produto:
                          type: string
                          description: Unidade de medida do produto
                        valor_produto:
                          type: string
                          description: Valor do produto
                        valor_custo_produto:
                          type: string
                          description: Valor de custo para o produto
                        peso_produto:
                          type: string
                          description: Peso do produto
                        peso_liq_produto:
                          type: string
                          description: Peso liquido do produto
                        icms_produto:
                          type: string
                          description: ICMS do produto
                        ipi_produto:
                          type: string
                          description: IPI do produto
                        pis_produto:
                          type: string
                          description: PIS do produto
                        cofins_produto:
                          type: string
                          description: COFINS do produto
                        unidade_tributavel:
                          type: string
                          description: Unidade tributavel
                        cest_produto:
                          type: string
                          description: CEST do produto
                        beneficio_fiscal:
                          type: string
                          description: Beneficio fiscal
                        ncm_produto:
                          type: string
                          description: NCM do produto
                        origem_produto:
                          type: integer
                          description: Origem mercadoria
                        codigo_barra_produto:
                          type: string
                          description: Código de barras
                        codigo_barras_internos:
                          type: string
                          description: Código de barras interno
                        obs_produto:
                          type: string
                          description: Observação do produto
                        tipo_produto:
                          type: string
                          description: Tipo do produto
                        tamanho_produto:
                          type: string
                          description: Tamanho do produto
                        localizacao_produto:
                          type: string
                          description: Localização do produto no estoque
                        kit_produto:
                          type: string
                          description: Se o produto é um Kit
                        baixar_kit:
                          type: integer
                          description: Baixa estoque kit
                        desmembrar_kit:
                          type: integer
                          description: Desmenbra produtos kit
                        loja_visivel:
                          type: integer
                          description: Visível loja
                        loja_video_url:
                          type: string
                          description: URl vídeo loja
                        valor_tributos:
                          type: string
                          description: Valor tributos
                        valor_tributosEst:
                          type: string
                          description: Valor tributos est
                        status_produto:
                          type: string
                          description: Status do produto
                        id_comissionamento:
                          type: integer
                          description: ID comissão
                        id_regra_comissionamento_servico:
                          type: integer
                          description: ID regração comissão serviço
                        data_cad_produto:
                          type: string
                          description: Data de cadastro do produto
                        data_mod_produto:
                          type: string
                          description: Data de modificação do produto
                        data_mod_estoque:
                          type: 'null'
                          description: Data de modificação do estoque
                        lixeira:
                          type: string
                          description: Produto Excluído
                        endereco_fixo:
                          type: integer
                          description: Endereço fixo
                        controla_lote:
                          type: integer
                          description: Controla lote
                        controla_validade:
                          type: integer
                          description: Controla validade
                        lista_preco:
                          type: 'null'
                          description: Listas de preço vinculadas ao produto
                        subcategoria:
                          type: array
                          items:
                            type: string
                        grades:
                          type: array
                          items:
                            type: string
                          description: Grades do produto
                        variacoes:
                          type: array
                          items:
                            type: string
                          description: Variações do Produto
                        imagens:
                          type: array
                          items:
                            type: string
                          description: Imagens do produto
                      x-apidog-orders:
                        - id_produto
                        - id_registro
                        - id_empresa
                        - id_categoria
                        - cod_produto
                        - marca_produto
                        - desc_produto
                        - atalho_produto
                        - fornecedor_produto
                        - fornecedor_produto_id
                        - produto_variado
                        - id_produto_parent
                        - minimo_produto
                        - maximo_produto
                        - estoque_produto
                        - unidade_produto
                        - valor_produto
                        - valor_custo_produto
                        - peso_produto
                        - peso_liq_produto
                        - icms_produto
                        - ipi_produto
                        - pis_produto
                        - cofins_produto
                        - unidade_tributavel
                        - cest_produto
                        - beneficio_fiscal
                        - ncm_produto
                        - origem_produto
                        - codigo_barra_produto
                        - codigo_barras_internos
                        - obs_produto
                        - tipo_produto
                        - tamanho_produto
                        - localizacao_produto
                        - kit_produto
                        - baixar_kit
                        - desmembrar_kit
                        - loja_visivel
                        - loja_video_url
                        - valor_tributos
                        - valor_tributosEst
                        - status_produto
                        - id_comissionamento
                        - id_regra_comissionamento_servico
                        - data_cad_produto
                        - data_mod_produto
                        - data_mod_estoque
                        - lixeira
                        - endereco_fixo
                        - controla_lote
                        - controla_validade
                        - lista_preco
                        - subcategoria
                        - grades
                        - variacoes
                        - imagens
                    description: Dados do retorno
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
                    description: Status do retorno
                  data:
                    type: string
                    description: Dados do erro
                x-apidog-orders:
                  - code
                  - status
                  - data
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Cadastros/Produtos
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16211257-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
