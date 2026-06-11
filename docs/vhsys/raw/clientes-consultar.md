# Consultar cliente

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /clientes/{id_cliente}:
    get:
      summary: Consultar cliente
      deprecated: false
      description: Request para a consulta de dados do cliente.
      tags:
        - Cadastros/Clientes
      parameters:
        - name: id_cliente
          in: path
          description: ID cliente
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
                        type: integer
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
                        description: Nome do contato do cliente
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
                        type: integer
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
                      id_categoria:
                        type: 'null'
                        description: ID categoria
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
                        type: 'null'
                        description: ID transportadora
                      desc_transportadora:
                        type: 'null'
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
                        type: integer
                        description: Data encerramente atividade
                      data_nasc_cliente:
                        type: 'null'
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
                        type: 'null'
                      pRedutor:
                        type: 'null'
                      categoria:
                        type: array
                        items:
                          type: string
                        description: Categoria cliente
                      veiculos:
                        type: array
                        items:
                          $ref: '#/components/schemas/Ve%C3%ADculo'
                    required:
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
                      - id_categoria
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
                      - categoria
                      - veiculos
                    description: Dados de Resposta
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
                      - id_categoria
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
                      - categoria
                      - veiculos
                    x-apidog-ignore-properties: []
                required:
                  - code
                  - status
                  - data
                x-apidog-orders:
                  - code
                  - status
                  - data
                x-apidog-ignore-properties: []
              examples:
                '1':
                  summary: Sucesso
                  value:
                    code: 200
                    status: success
                    data:
                      id_cliente: 123456
                      id_registro: 1
                      tipo_pessoa: PJ
                      tipo_cadastro: Cliente
                      cnpj_cliente: ''
                      rg_cliente: ''
                      data_emissao_rg_cliente: '0000-00-00'
                      orgao_expedidor_rg_cliente: ''
                      passaporte_cliente: ''
                      estrangeiro_cliente: 0
                      razao_cliente: Razão Social 4
                      fantasia_cliente: Nome Fantasia
                      endereco_cliente: Endereço do cliente
                      numero_cliente: '0000'
                      bairro_cliente: Bairro do cliente
                      complemento_cliente: Casa
                      referencia_cliente: ''
                      cep_cliente: 00.000-000
                      cidade_cliente: Cidade do cliente
                      cidade_cliente_cod: 0
                      uf_cliente: PR
                      tel_destinatario_cliente: ''
                      doc_destinatario_cliente: ''
                      nome_destinatario_cliente: Testhi
                      contato_cliente: Nome do contato
                      fone_cliente: (00) 00000-0000
                      fone_contato_cliente: ''
                      fone_ramal_cliente: ''
                      fax_cliente: ''
                      celular_cliente: (00) 00000-0000
                      email_cliente: email@contato.com.br
                      email_contato_cliente: ''
                      celular_contato_cliente: ''
                      estado_civil_cliente: ''
                      website_cliente: ''
                      aposentado_cliente: 0
                      empregador_cliente: ''
                      profissao_cliente: ''
                      genero_cliente: ''
                      insc_estadual_cliente: '0123456789'
                      insc_municipal_cliente: '0123456789'
                      insc_produtor_cliente: '0123456789'
                      insc_suframa_cliente: '0123456789'
                      nif: ''
                      id_categoria: null
                      situacao_cliente: Ativo
                      vendedor_cliente: Nome do vendedor
                      vendedor_cliente_id: 123456
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
                      atividade_encerrada_cliente: 0
                      data_nasc_cliente: null
                      data_cad_cliente: '2025-03-27 17:37:20'
                      data_mod_cliente: '2025-05-12 18:16:49'
                      lixeira: Sim
                      tpEnteGov: null
                      pRedutor: null
                      categoria: []
                '2':
                  summary: Sucesso
                  value:
                    code: 403
                    status: error
                    data: Nenhum cliente encontrado!
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
                x-apidog-ignore-properties: []
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Cadastros/Clientes
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16392475-run
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
