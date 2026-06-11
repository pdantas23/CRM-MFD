# Cadastrar cliente

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /clientes:
    post:
      summary: Cadastrar cliente
      deprecated: false
      description: Request para cadastrar clientes
      tags:
        - Cadastros/Clientes
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                razao_cliente:
                  type: string
                  description: Razão social
                  maxLength: 255
                tipo_pessoa:
                  type: string
                  description: Tipo do cadastro
                  enum:
                    - PJ
                    - PF
                  x-apidog-enum:
                    - value: PJ
                      name: ''
                      description: Tipo do cadastro
                    - value: PF
                      name: ''
                      description: Tipo do cadastro
                  default: PJ
                tipo_cadastro:
                  type: string
                  description: Tipo do cadastro do cliente
                  enum:
                    - Cliente
                    - Fornecedor
                    - Ambos
                  x-apidog-enum:
                    - value: Cliente
                      name: ''
                      description: Tipo do cadastro do cliente
                    - value: Fornecedor
                      name: ''
                      description: Tipo do cadastro do cliente
                    - value: Ambos
                      name: ''
                      description: Tipo do cadastro do cliente
                  default: Cliente
                cnpj_cliente:
                  type: string
                  description: CNPJ / CPF do cliente
                  maxLength: 18
                fantasia_cliente:
                  type: string
                  description: Nome Fantasia
                  maxLength: 255
                endereco_cliente:
                  type: string
                  description: Endereço
                  maxLength: 255
                numero_cliente:
                  type: string
                  description: Número
                  maxLength: 7
                bairro_cliente:
                  type: string
                  description: Bairro
                  maxLength: 45
                complemento_cliente:
                  type: string
                  description: Complemento
                  maxLength: 45
                cep_cliente:
                  type: string
                  description: CEP
                  maxLength: 10
                cidade_cliente:
                  type: string
                  description: Cidade
                  maxLength: 255
                uf_cliente:
                  type: string
                  description: Estado
                  maxLength: 2
                contato_cliente:
                  type: string
                  description: Nome do contato do cliente
                  maxLength: 255
                fone_cliente:
                  type: string
                  description: Telefone do cliente
                  maxLength: 20
                celular_cliente:
                  type: string
                  description: Celular do cliente
                  maxLength: 20
                email_cliente:
                  type: string
                  description: Email do cliente
                  maxLength: 255
                insc_estadual_cliente:
                  type: string
                  description: Inscrição Estadual do cliente
                  maxLength: 45
                insc_municipal_cliente:
                  type: string
                  description: Inscrição Municipal do cliente
                  maxLength: 45
                insc_produtor_cliente:
                  type: string
                  description: Inscrição de produtor rural
                  maxLength: 20
                insc_suframa_cliente:
                  type: string
                  description: Inscrição do SUFRAMA
                  maxLength: 20
                situacao_cliente:
                  type: string
                  description: Status do cliente
                  enum:
                    - Ativo
                    - Inativo
                  x-apidog-enum:
                    - value: Ativo
                      name: ''
                      description: Status do cliente
                    - value: Inativo
                      name: ''
                      description: Status do cliente
                  default: Ativo
                vendedor_cliente:
                  type: string
                  description: Nome do vendedor vinculado
                  maxLength: 255
                vendedor_cliente_id:
                  type: integer
                  description: ID do vendedor vinculado
                data_nasc_cliente:
                  type: string
                  description: Data de nascimento do cliente
                  format: date
                observacoes_cliente:
                  type: string
                  description: Observações do cadastro
              required:
                - razao_cliente
              x-apidog-orders:
                - razao_cliente
                - tipo_pessoa
                - tipo_cadastro
                - cnpj_cliente
                - fantasia_cliente
                - endereco_cliente
                - numero_cliente
                - bairro_cliente
                - complemento_cliente
                - cep_cliente
                - cidade_cliente
                - uf_cliente
                - contato_cliente
                - fone_cliente
                - celular_cliente
                - email_cliente
                - insc_estadual_cliente
                - insc_municipal_cliente
                - insc_produtor_cliente
                - insc_suframa_cliente
                - situacao_cliente
                - vendedor_cliente
                - vendedor_cliente_id
                - data_nasc_cliente
                - observacoes_cliente
            example:
              razao_cliente: Razão Social
              tipo_pessoa: PJ
              tipo_cadastro: Cliente
              cnpj_cliente: 00.000.000/0000-00
              fantasia_cliente: Nome Fantasia
              endereco_cliente: Endereço do cliente
              numero_cliente: '0000'
              bairro_cliente: Bairro do cliente
              complemento_cliente: Casa
              cep_cliente: 00.000-000
              cidade_cliente: Cidade do cliente
              uf_cliente: PR
              contato_cliente: Nome do contato
              fone_cliente: (00) 00000-0000
              celular_cliente: (00) 00000-0000
              email_cliente: email@contato.com.br
              insc_estadual_cliente: '0123456789'
              insc_municipal_cliente: '0123456789'
              insc_produtor_cliente: '0123456789'
              insc_suframa_cliente: '0123456789'
              situacao_cliente: Ativo
              vendedor_cliente: Nome do vendedor
              vendedor_cliente_id: '123'
              data_nasc_cliente: '1992-12-12'
              observacoes_cliente: Observações do cadastro
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
                      razao_cliente:
                        type: string
                        description: ID do cliente
                      tipo_pessoa:
                        type: string
                        description: Tipo do cadastro
                      tipo_cadastro:
                        type: string
                        description: Tipo do cadastro do cliente
                      cnpj_cliente:
                        type: string
                        description: CNPJ / CPF do cliente
                      fantasia_cliente:
                        type: string
                        description: Razão social
                      endereco_cliente:
                        type: string
                        description: Número
                      numero_cliente:
                        type: string
                        description: Endereço
                      bairro_cliente:
                        type: string
                        description: Bairro
                      complemento_cliente:
                        type: string
                        description: Complemento
                      cep_cliente:
                        type: string
                        description: CEP
                      cidade_cliente:
                        type: string
                        description: Cidade
                      uf_cliente:
                        type: string
                        description: Unidade da federação
                      contato_cliente:
                        type: string
                        description: Nome do contato do cliente
                      fone_cliente:
                        type: string
                        description: Telefone do cliente
                      celular_cliente:
                        type: string
                        description: Celular do contato
                      email_cliente:
                        type: string
                        description: E-mail cliente
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
                      situacao_cliente:
                        type: string
                        description: Status do cliente
                      vendedor_cliente:
                        type: 'null'
                        description: Nome do vendedor vinculado
                      vendedor_cliente_id:
                        type: integer
                        description: ID do vendedor vinculado
                      data_nasc_cliente:
                        type: string
                        description: Data de nascimento do cliente
                      observacoes_cliente:
                        type: string
                        description: Observações do cadastro
                      id_registro:
                        type: boolean
                        description: ID registro
                      data_cad_cliente:
                        type: string
                        description: Data de cadastro do cliente
                      id_empresa:
                        type: integer
                        description: ID empresa
                      cidade_cliente_cod:
                        type: string
                        description: Códifo da cidade
                      lixeira:
                        type: string
                        description: Situação do cliente no sistema
                      id_categoria:
                        type: integer
                        description: Categoria cliente
                      id_cliente:
                        type: integer
                        description: ID cliente
                      categoria:
                        type: array
                        items:
                          type: string
                        description: Categorias
                    required:
                      - razao_cliente
                      - tipo_pessoa
                      - tipo_cadastro
                      - cnpj_cliente
                      - fantasia_cliente
                      - endereco_cliente
                      - numero_cliente
                      - bairro_cliente
                      - complemento_cliente
                      - cep_cliente
                      - cidade_cliente
                      - uf_cliente
                      - contato_cliente
                      - fone_cliente
                      - celular_cliente
                      - email_cliente
                      - insc_estadual_cliente
                      - insc_municipal_cliente
                      - insc_produtor_cliente
                      - insc_suframa_cliente
                      - situacao_cliente
                      - vendedor_cliente
                      - vendedor_cliente_id
                      - data_nasc_cliente
                      - observacoes_cliente
                      - id_registro
                      - data_cad_cliente
                      - id_empresa
                      - cidade_cliente_cod
                      - lixeira
                      - id_categoria
                      - id_cliente
                      - categoria
                    x-apidog-orders:
                      - razao_cliente
                      - tipo_pessoa
                      - tipo_cadastro
                      - cnpj_cliente
                      - fantasia_cliente
                      - endereco_cliente
                      - numero_cliente
                      - bairro_cliente
                      - complemento_cliente
                      - cep_cliente
                      - cidade_cliente
                      - uf_cliente
                      - contato_cliente
                      - fone_cliente
                      - celular_cliente
                      - email_cliente
                      - insc_estadual_cliente
                      - insc_municipal_cliente
                      - insc_produtor_cliente
                      - insc_suframa_cliente
                      - situacao_cliente
                      - vendedor_cliente
                      - vendedor_cliente_id
                      - data_nasc_cliente
                      - observacoes_cliente
                      - id_registro
                      - data_cad_cliente
                      - id_empresa
                      - cidade_cliente_cod
                      - lixeira
                      - id_categoria
                      - id_cliente
                      - categoria
                    description: Dados de Resposta
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
              examples:
                '1':
                  summary: Sucesso
                  value:
                    code: 200
                    status: success
                    data:
                      razao_cliente: Razão Social
                      tipo_pessoa: PJ
                      tipo_cadastro: Cliente
                      cnpj_cliente: 00.000.000/0000-01
                      fantasia_cliente: Nome Fantasia
                      endereco_cliente: Endereço do cliente
                      numero_cliente: '0000'
                      bairro_cliente: Bairro do cliente
                      complemento_cliente: Casa
                      cep_cliente: 00.000-000
                      cidade_cliente: Cidade do cliente
                      uf_cliente: PR
                      contato_cliente: Nome do contato
                      fone_cliente: (00) 00000-0000
                      celular_cliente: (00) 00000-0000
                      email_cliente: email@contato.com.br
                      insc_estadual_cliente: '0123456789'
                      insc_municipal_cliente: '0123456789'
                      insc_produtor_cliente: '0123456789'
                      insc_suframa_cliente: '0123456789'
                      situacao_cliente: Ativo
                      vendedor_cliente: null
                      vendedor_cliente_id: 0
                      data_nasc_cliente: '1992-12-12'
                      observacoes_cliente: Observações do cadastro
                      id_registro: false
                      data_cad_cliente: '2025-05-12 15:41:15'
                      id_empresa: 850486
                      cidade_cliente_cod: '0'
                      lixeira: Nao
                      id_categoria: 0
                      id_cliente: 1000021056
                      categoria: []
                '2':
                  summary: Sucesso
                  value:
                    code: 403
                    status: error
                    data: Erro ao cadastrar o cliente!
                '3':
                  summary: Sucesso
                  value:
                    entidade: clientes
                    operacao: create
                    dados:
                      id_cliente: 123456
                      tipo_cadastro: Cliente
                      tipo_pessoa: PJ
                      nome_categoria: null
                      situacao_cliente: Ativo
                      razao_cliente: Razão Social
                      data_nasc_cliente: '0000-00-00'
                      genero_cliente: null
                      cnpj_cliente: 00.000.000/0000-02
                      celular_cliente: (00) 00000-0000
                      celular_contato_cliente: null
                      tel_destinatario_cliente: null
                      fone_ramal_cliente: null
                      fax_cliente: null
                      email_cliente: email@contato.com.br
                      email_contato_cliente: null
                      website_cliente: null
                      observacoes_cliente: Observações do cadastro
                      rg_cliente: null
                      orgao_expedidor_rg_cliente: null
                      data_emissao_rg_cliente: null
                      passaporte_cliente: null
                      nif: null
                      estrangeiro_cliente: null
                      insc_produtor_cliente: '0123456789'
                      profissao_cliente: null
                      empregador_cliente: null
                      aposentado_cliente: null
                      estado_civil_cliente: null
                      data_inicio_cliente: null
                      data_final_cliente: null
                      atividade_encerrada_cliente: null
                      nome_lista: null
                      nome_condicao: null
                      vendedor_cliente: null
                      modalidade_frete: Sem Frete
                      desc_transportadora: null
                      limite_credito: 0
                      ultrapassar_limite_credito: 1
                      consumidor_final: '1'
                      contribuinte_icms: 0
                      obs_notafiscal_cliente: null
                      enderecos: []
                      contatos: []
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
        x-200:Webhook:
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  entidade:
                    type: string
                    description: Entidade
                  operacao:
                    type: string
                    description: Operação efetuada
                  dados:
                    type: object
                    properties:
                      id_cliente:
                        type: integer
                        description: ID do cliente
                      tipo_cadastro:
                        type: string
                        description: Tipo do cadastro do cliente
                      tipo_pessoa:
                        type: string
                        description: Tipo do cadastro
                      nome_categoria:
                        type: string
                        description: Nome categoria
                      situacao_cliente:
                        type: string
                        description: Status do cliente
                      razao_cliente:
                        type: string
                        description: Razão social
                      data_nasc_cliente:
                        type: string
                        description: Data de nascimento do cliente
                      genero_cliente:
                        type: string
                        description: Gênero
                      cnpj_cliente:
                        type: string
                        description: CNPJ / CPF do cliente
                      celular_cliente:
                        type: string
                        description: Número celular
                      celular_contato_cliente:
                        type: string
                        description: Celular do contato
                      tel_destinatario_cliente:
                        type: string
                        description: Telefone destinatário cliente
                      fone_ramal_cliente:
                        type: string
                        description: Número do ramal
                      fax_cliente:
                        type: string
                        description: Número do Fax
                      email_cliente:
                        type: string
                        description: E-mail cliente
                      email_contato_cliente:
                        type: string
                        description: Email do contato
                      website_cliente:
                        type: string
                        description: Website
                      observacoes_cliente:
                        type: string
                        description: Observações do cadastro
                      rg_cliente:
                        type: string
                        description: Registro geral do cliente
                      orgao_expedidor_rg_cliente:
                        type: string
                        description: Orgão expedidor registro geral
                      data_emissao_rg_cliente:
                        type: string
                        description: Data emissão registro geral
                      passaporte_cliente:
                        type: string
                        description: Passaporte cliente
                      nif:
                        type: string
                        description: NIF
                      estrangeiro_cliente:
                        type: integer
                        description: Estrangeiro
                      insc_produtor_cliente:
                        type: string
                        description: Inscrição de produtor rural
                      profissao_cliente:
                        type: string
                        description: Profissão
                      empregador_cliente:
                        type: string
                        description: Empregador
                      aposentado_cliente:
                        type: integer
                        description: Aposentado
                      estado_civil_cliente:
                        type: string
                        description: Estado civel
                      data_inicio_cliente:
                        type: string
                        description: Data atividade
                      data_final_cliente:
                        type: string
                        description: Data fim atividade
                      atividade_encerrada_cliente:
                        type: integer
                        description: Atividade enderrada
                      nome_lista:
                        type: string
                        description: Nome lista
                      nome_condicao:
                        type: string
                        description: Nome condição
                      vendedor_cliente:
                        type: string
                        description: Vendedir cliente
                      modalidade_frete:
                        type: string
                        description: Modalidade frete
                      desc_transportadora:
                        type: string
                        description: Nome transportadora
                      limite_credito:
                        type: integer
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
                      obs_notafiscal_cliente:
                        type: string
                        description: Observação nota fiscal
                      enderecos:
                        type: array
                        items:
                          type: string
                        description: Endereços
                      contatos:
                        type: array
                        items:
                          type: string
                        description: Contatos
                    required:
                      - id_cliente
                      - tipo_cadastro
                      - tipo_pessoa
                      - nome_categoria
                      - situacao_cliente
                      - razao_cliente
                      - data_nasc_cliente
                      - genero_cliente
                      - cnpj_cliente
                      - celular_cliente
                      - celular_contato_cliente
                      - tel_destinatario_cliente
                      - fone_ramal_cliente
                      - fax_cliente
                      - email_cliente
                      - email_contato_cliente
                      - website_cliente
                      - observacoes_cliente
                      - rg_cliente
                      - orgao_expedidor_rg_cliente
                      - data_emissao_rg_cliente
                      - passaporte_cliente
                      - nif
                      - estrangeiro_cliente
                      - insc_produtor_cliente
                      - profissao_cliente
                      - empregador_cliente
                      - aposentado_cliente
                      - estado_civil_cliente
                      - data_inicio_cliente
                      - data_final_cliente
                      - atividade_encerrada_cliente
                      - nome_lista
                      - nome_condicao
                      - vendedor_cliente
                      - modalidade_frete
                      - desc_transportadora
                      - limite_credito
                      - ultrapassar_limite_credito
                      - consumidor_final
                      - contribuinte_icms
                      - obs_notafiscal_cliente
                      - enderecos
                      - contatos
                    x-apidog-orders:
                      - id_cliente
                      - tipo_cadastro
                      - tipo_pessoa
                      - nome_categoria
                      - situacao_cliente
                      - razao_cliente
                      - data_nasc_cliente
                      - genero_cliente
                      - cnpj_cliente
                      - celular_cliente
                      - celular_contato_cliente
                      - tel_destinatario_cliente
                      - fone_ramal_cliente
                      - fax_cliente
                      - email_cliente
                      - email_contato_cliente
                      - website_cliente
                      - observacoes_cliente
                      - rg_cliente
                      - orgao_expedidor_rg_cliente
                      - data_emissao_rg_cliente
                      - passaporte_cliente
                      - nif
                      - estrangeiro_cliente
                      - insc_produtor_cliente
                      - profissao_cliente
                      - empregador_cliente
                      - aposentado_cliente
                      - estado_civil_cliente
                      - data_inicio_cliente
                      - data_final_cliente
                      - atividade_encerrada_cliente
                      - nome_lista
                      - nome_condicao
                      - vendedor_cliente
                      - modalidade_frete
                      - desc_transportadora
                      - limite_credito
                      - ultrapassar_limite_credito
                      - consumidor_final
                      - contribuinte_icms
                      - obs_notafiscal_cliente
                      - enderecos
                      - contatos
                    description: Dados de Resposta
                required:
                  - entidade
                  - operacao
                  - dados
                x-apidog-orders:
                  - entidade
                  - operacao
                  - dados
          headers: {}
          x-apidog-name: Webhook
      security: []
      x-apidog-folder: Cadastros/Clientes
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-15846154-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
