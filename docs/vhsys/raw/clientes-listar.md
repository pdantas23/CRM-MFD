# Listar clientes

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /clientes:
    get:
      summary: Listar clientes
      deprecated: false
      description: Request para a consulta de diversos clientes.
      tags:
        - Cadastros/Clientes
      parameters:
        - name: order
          in: query
          description: Nome do campo para ordenação EX:data_mod_cliente
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
            type: integer
            maximum: 250
        - name: offset
          in: query
          description: Registro inicial da consulta
          required: false
          schema:
            type: integer
        - name: tipo_pessoa
          in: query
          description: Tipo do cadastro de cliente
          required: false
          schema:
            type: string
            enum:
              - PJ
              - PF
            x-apidog-enum:
              - value: PJ
                name: ''
                description: Tipo do cadastro de cliente
              - value: PF
                name: ''
                description: Tipo do cadastro de cliente
        - name: cnpj_cliente
          in: query
          description: CNPJ / CPF do cliente
          required: false
          schema:
            type: string
        - name: razao_cliente
          in: query
          description: Razão social do cliente
          required: false
          schema:
            type: string
        - name: fantasia_cliente
          in: query
          description: Nome Fantasia do cliente
          required: false
          schema:
            type: string
        - name: lixeira
          in: query
          description: Excluído
          required: false
          example: Nao
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
        - name: data_cadastro
          in: query
          description: Registros criados após a data informada
          required: false
          schema:
            type: string
            format: date
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
                  data:
                    type: array
                    items:
                      oneOf:
                        - properties:
                            'cliente: ':
                              type: array
                              items:
                                type: object
                                properties:
                                  id_cliente:
                                    type: integer
                                    description: ID cliente
                                  id_registro:
                                    type: integer
                                    description: ID registro
                                  tipo_pessoa:
                                    type: string
                                    description: Tipo do cadastro de cliente
                                  tipo_cadastro:
                                    type: string
                                    description: Tipo do cadastro do cliente
                                  cnpj_cliente:
                                    type: string
                                    description: CNPJ / CPF do cliente
                                  rg_cliente:
                                    type: string
                                    description: Registro geral cliente
                                  data_emissao_rg_cliente:
                                    type: string
                                    description: Data emissão registro geral
                                  orgao_expedidor_rg_cliente:
                                    type: string
                                    description: Orgão expedidor registro geral
                                  passaporte_cliente:
                                    type: string
                                    description: Passaporte cliente
                                  estrangeiro_cliente:
                                    type: string
                                    description: Cliente estrangeiro
                                  razao_cliente:
                                    type: string
                                    description: Razão social
                                  fantasia_cliente:
                                    type: string
                                    description: Nome Fantasia
                                  endereco_cliente:
                                    type: string
                                    description: Endereço
                                  numero_cliente:
                                    type: string
                                    description: Número
                                  bairro_cliente:
                                    type: string
                                    description: Bairro
                                  complemento_cliente:
                                    type: string
                                    description: Complemento
                                  referencia_cliente:
                                    type: string
                                    description: Referência cliente
                                  cep_cliente:
                                    type: string
                                    description: CEP
                                  cidade_cliente:
                                    type: string
                                    description: Cidade
                                  cidade_cliente_cod:
                                    type: integer
                                    description: Código da cidade
                                  uf_cliente:
                                    type: string
                                    description: Unidade da federeção
                                  tel_destinatario_cliente:
                                    type: string
                                    description: Telefone destinatário cliente
                                  doc_destinatario_cliente:
                                    type: string
                                    description: Documento destinatário cliente
                                  nome_destinatario_cliente:
                                    type: string
                                    description: Nome destinatário cliente
                                  contato_cliente:
                                    type: string
                                    description: Telefone destinatário cliente
                                  fone_cliente:
                                    type: string
                                    description: Telefone do cliente
                                  fone_contato_cliente:
                                    type: string
                                    description: Telefone do contato
                                  fone_ramal_cliente:
                                    type: string
                                    description: Número do ramal
                                  fax_cliente:
                                    type: string
                                    description: Número do Fax
                                  celular_cliente:
                                    type: string
                                    description: Celular do cliente
                                  email_cliente:
                                    type: string
                                    description: E-mail do cliente
                                  email_contato_cliente:
                                    type: string
                                    description: E-mail do contato
                                  celular_contato_cliente:
                                    type: string
                                    description: Celular contato cliente
                                  estado_civil_cliente:
                                    type: string
                                    description: Estado civil cliente
                                  website_cliente:
                                    type: string
                                    description: Website
                                  aposentado_cliente:
                                    type: string
                                    description: Aposentado
                                  empregador_cliente:
                                    type: string
                                    description: Empregador
                                  profissao_cliente:
                                    type: string
                                    description: Profissão
                                  genero_cliente:
                                    type: string
                                    description: Genero
                                  insc_estadual_cliente:
                                    type: string
                                    description: Inscrição Estadual do cliente
                                  insc_municipal_cliente:
                                    type: string
                                    description: Inscrição Municipal do cliente
                                  insc_produtor_cliente:
                                    type: string
                                    description: Inscrição de produtor rural
                                  insc_suframa_cliente:
                                    type: string
                                    description: Inscrição do SUFRAMA
                                  nif:
                                    type: string
                                    description: NIF
                                  situacao_cliente:
                                    type: string
                                    description: Status do cliente
                                  vendedor_cliente:
                                    type: string
                                    description: Nome do vendedor vinculado
                                  vendedor_cliente_id:
                                    type: integer
                                    description: ID do vendedor vinculado
                                  modalidade_frete:
                                    type: integer
                                    description: Modalidade frete
                                  id_transportadora:
                                    type: integer
                                    description: ID transportadora
                                  desc_transportadora:
                                    type: string
                                    description: Nome transportadora
                                  observacoes_cliente:
                                    type: string
                                    description: Observações do cadastro
                                  listapreco_cliente:
                                    type: integer
                                    description: Lista de preço cliente
                                  condicaopag_cliente:
                                    type: integer
                                    description: Condição de pagamento cliente
                                  limite_credito:
                                    type: string
                                    description: Limite de crédito
                                  ultrapassar_limite_credito:
                                    type: integer
                                    description: Ultrapassa limite
                                  consumidor_final:
                                    type: string
                                    description: Consumidor final
                                  contribuinte_icms:
                                    type: integer
                                    description: Contribuinte de ICMS
                                  atividade_encerrada_cliente:
                                    type: string
                                    description: Data encerramente atividade
                                  data_nasc_cliente:
                                    type: string
                                    description: Data de nascimento do cliente
                                  data_cad_cliente:
                                    type: string
                                    description: Data de cadastro do cliente
                                  data_mod_cliente:
                                    type: string
                                    description: Data da última modificação
                                  lixeira:
                                    type: string
                                    description: Situação do cliente no sistema
                                  tpEnteGov:
                                    type: string
                                  pRedutor:
                                    type: string
                                  veiculos:
                                    type: array
                                    items:
                                      $ref: '#/components/schemas/Ve%C3%ADculo'
                                x-apidog-orders:
                                  - id_cliente
                                  - id_registro
                                  - tipo_pessoa
                                  - tipo_cadastro
                                  - cnpj_cliente
                                  - rg_cliente
                                  - data_emissao_rg_cliente
                                  - orgao_expedidor_rg_cliente
                                  - passaporte_cliente
                                  - estrangeiro_cliente
                                  - razao_cliente
                                  - fantasia_cliente
                                  - endereco_cliente
                                  - numero_cliente
                                  - bairro_cliente
                                  - complemento_cliente
                                  - referencia_cliente
                                  - cep_cliente
                                  - cidade_cliente
                                  - cidade_cliente_cod
                                  - uf_cliente
                                  - tel_destinatario_cliente
                                  - doc_destinatario_cliente
                                  - nome_destinatario_cliente
                                  - contato_cliente
                                  - fone_cliente
                                  - fone_contato_cliente
                                  - fone_ramal_cliente
                                  - fax_cliente
                                  - celular_cliente
                                  - email_cliente
                                  - email_contato_cliente
                                  - celular_contato_cliente
                                  - estado_civil_cliente
                                  - website_cliente
                                  - aposentado_cliente
                                  - empregador_cliente
                                  - profissao_cliente
                                  - genero_cliente
                                  - insc_estadual_cliente
                                  - insc_municipal_cliente
                                  - insc_produtor_cliente
                                  - insc_suframa_cliente
                                  - nif
                                  - situacao_cliente
                                  - vendedor_cliente
                                  - vendedor_cliente_id
                                  - modalidade_frete
                                  - id_transportadora
                                  - desc_transportadora
                                  - observacoes_cliente
                                  - listapreco_cliente
                                  - condicaopag_cliente
                                  - limite_credito
                                  - ultrapassar_limite_credito
                                  - consumidor_final
                                  - contribuinte_icms
                                  - atividade_encerrada_cliente
                                  - data_nasc_cliente
                                  - data_cad_cliente
                                  - data_mod_cliente
                                  - lixeira
                                  - tpEnteGov
                                  - pRedutor
                                  - veiculos
                                required:
                                  - veiculos
                                x-apidog-ignore-properties: []
                          type: object
                          x-apidog-orders:
                            - 'cliente: '
                          x-apidog-ignore-properties: []
                        - type: boolean
                    description: Dados de Resposta
                  paging:
                    type: object
                    properties:
                      total_count:
                        type: integer
                      total:
                        type: integer
                      offset:
                        type: integer
                      limit:
                        type: integer
                      limit_max:
                        type: integer
                    x-apidog-orders:
                      - total_count
                      - total
                      - offset
                      - limit
                      - limit_max
                    description: Paginação
                    x-apidog-ignore-properties: []
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
                  - paging
                x-apidog-ignore-properties: []
              example:
                code: 200
                status: success
                data:
                  - 'cliente: ':
                      - id_cliente: 123456
                        id_registro: 0
                        tipo_pessoa: PJ
                        tipo_cadastro: Cliente
                        cnpj_cliente: 00.000.000/0000-01
                        rg_cliente: null
                        data_emissao_rg_cliente: null
                        orgao_expedidor_rg_cliente: null
                        passaporte_cliente: null
                        estrangeiro_cliente: null
                        razao_cliente: Razão Social
                        fantasia_cliente: Nome Fantasia
                        endereco_cliente: Endereço do cliente
                        numero_cliente: '0000'
                        bairro_cliente: Bairro do cliente
                        complemento_cliente: Casa
                        referencia_cliente: null
                        cep_cliente: 00.000-000
                        cidade_cliente: Cidade do cliente
                        cidade_cliente_cod: 0
                        uf_cliente: PR
                        tel_destinatario_cliente: null
                        doc_destinatario_cliente: null
                        nome_destinatario_cliente: null
                        contato_cliente: Nome do contato
                        fone_cliente: (00) 00000-0000
                        fone_contato_cliente: null
                        fone_ramal_cliente: null
                        fax_cliente: null
                        celular_cliente: (00) 00000-0000
                        email_cliente: email@contato.com.br
                        email_contato_cliente: null
                        celular_contato_cliente: null
                        estado_civil_cliente: null
                        website_cliente: null
                        aposentado_cliente: null
                        empregador_cliente: null
                        profissao_cliente: null
                        genero_cliente: null
                        insc_estadual_cliente: '0123456789'
                        insc_municipal_cliente: '0123456789'
                        insc_produtor_cliente: '0123456789'
                        insc_suframa_cliente: '0123456789'
                        nif: null
                        situacao_cliente: Ativo
                        vendedor_cliente: null
                        vendedor_cliente_id: 0
                        modalidade_frete: 9
                        id_transportadora: null
                        desc_transportadora: null
                        observacoes_cliente: Observações do cadastro
                        listapreco_cliente: 0
                        condicaopag_cliente: 0
                        limite_credito: '0.00'
                        ultrapassar_limite_credito: 1
                        consumidor_final: '1'
                        contribuinte_icms: 0
                        atividade_encerrada_cliente: null
                        data_nasc_cliente: '0000-00-00'
                        data_cad_cliente: '0000-00-00 00:00:00'
                        data_mod_cliente: null
                        lixeira: Nao
                        tpEnteGov: null
                        pRedutor: null
                  - true
          headers: {}
          x-apidog-name: Success
      security: []
      x-apidog-folder: Cadastros/Clientes
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16392482-run
components:
  schemas:
    Veículo:
      type: object
      properties:
        id_cliente_veiculo:
          type: integer
          description: ID do veículo do cliente
        id_veiculo:
          type: integer
          description: ID do tipo de veículo
        id_marca:
          type: integer
          description: ID da marca do veículo
        id_modelo:
          type: integer
          description: ID do modelo do veículo
        id_combustivel:
          type: integer
          description: ID do tipo de combustível
        id_cor:
          type: integer
          description: ID da cor do veículo
        placa:
          type: string
          description: Placa do veículo (Modelo antigo ou Mercosul)
          pattern: ^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$
          examples:
            - ABC-1234
            - ABC1D23
        renavam:
          type: string
          description: Renavam do veículo
        ano_fabricacao:
          type: string
          description: Ano de fabricação do veículo
        ano_modelo:
          type: string
          description: Ano do modelo do veículo
        km:
          type: string
          description: Quilometragem do veículo
        chassi:
          type: string
          description: Chassi do veículo
        data_cad:
          type: string
          description: Data de cadastro do veículo
        data_mod:
          type: string
          description: Data da ultima atualização do veículo
        usuario_cad:
          type: integer
          description: Usuário que realizou o cadastro do veículo
        usuario_mod:
          type: integer
          description: Ultimo usuário a realizar uma alteração no veículo
        status:
          type: string
          description: Status do Veículo
          default: Ativo
          enum:
            - Ativo
            - Inativo
          x-apidog-enum:
            - value: Ativo
              name: ''
              description: ''
            - value: Inativo
              name: ''
              description: ''
        lixeira:
          type: string
          description: Flag de soft delete
          default: Nao
          enum:
            - Sim
            - Nao
          x-apidog-enum:
            - value: Sim
              name: ''
              description: ''
            - value: Nao
              name: ''
              description: ''
      x-apidog-orders:
        - id_cliente_veiculo
        - id_veiculo
        - id_marca
        - id_modelo
        - id_combustivel
        - id_cor
        - placa
        - renavam
        - ano_fabricacao
        - ano_modelo
        - km
        - chassi
        - data_cad
        - data_mod
        - usuario_cad
        - usuario_mod
        - status
        - lixeira
      required:
        - placa
      x-apidog-ignore-properties: []
      x-apidog-folder: ''
  securitySchemes: {}
servers: []
security: []

```
