# Consultar NF-e

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /notas-fiscais/{id_nfe}:
    get:
      summary: Consultar NF-e
      deprecated: false
      description: Request para consultar notas fiscais.
      tags:
        - Vendas/Notas fiscais
      parameters:
        - name: id_nfe
          in: path
          description: ID NF-e
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
                    description: Código do retorno da requisição
                  status:
                    type: string
                    description: Status
                  data:
                    type: object
                    properties:
                      id_venda:
                        type: integer
                        description: ID da venda
                      tp_nfe:
                        type: integer
                        description: Tipo da NF-e
                      serie_nota:
                        type: integer
                        description: Serie da nota fiscal
                      id_pedido:
                        type: integer
                        description: ID sequêncial da nota
                      id_cliente:
                        type: integer
                        description: ID do cliente
                      nome_cliente:
                        type: string
                        description: Nome do cliente
                      id_local_cobranca:
                        type: integer
                        description: ID local de cobrança
                      vendedor_pedido:
                        type: string
                        description: Nome do vendedor
                      vendedor_pedido_id:
                        type: integer
                        description: ID do vendedor
                      valor_total_produtos:
                        type: string
                        description: Valor total do desconto
                      desconto_pedido:
                        type: string
                        description: Valor do desconto
                      desconto_pedido_porc:
                        type: string
                        description: Valor do desconto porcentagem
                      peso_total_nota:
                        type: string
                        description: Peso total da nota fiscal
                      peso_total_nota_liq:
                        type: string
                        description: Peso liquido da nota fiscal
                      frete_pedido:
                        type: string
                        description: Valor do frete
                      valor_total_nota:
                        type: string
                        description: Valor total da nota
                      valor_baseICMS:
                        type: string
                        description: Valor da base de ICMS
                      valor_ICMS:
                        type: string
                        description: Valor do ICMS
                      valor_vICMSDeson_icms:
                        type: string
                        description: Valor do ICMS desonerado
                      valor_baseST:
                        type: string
                        description: Valor da base de ST
                      valor_ST:
                        type: string
                        description: Valor do ST
                      valor_IPI:
                        type: string
                        description: Valor do IPI
                      valor_despesas:
                        type: string
                        description: Valor das despesas
                      valor_desconto_blocked:
                        type: integer
                        description: Valor desconto bloqueado
                      valor_despesas_blocked:
                        type: integer
                        description: Valor despesas bloqueado
                      valor_frete_blocked:
                        type: integer
                        description: Valor frete bloqueado
                      condicao_pagamento:
                        type: integer
                        description: Condição de pagamento
                      frete_por_pedido:
                        type: integer
                        description: Tipo do frete
                      transportadora_pedido:
                        type: string
                        description: Nome da transportadora
                      id_transportadora:
                        type: integer
                        description: ID da transportadora
                      volumes_transporta:
                        type: integer
                        description: Volumes para transporte
                      especie_transporta:
                        type: string
                        description: 'Especie dos volumes Ex : Caixa'
                      marca_transporta:
                        type: string
                        description: Marca dos volumes
                      numeracao_transporta:
                        type: string
                        description: Numeração para a transportadora
                      placa_transporta:
                        type: string
                        description: Placa da transportadora
                      uf_placa_transporta:
                        type: string
                        description: Unidada da federação da placa
                      uf_embarque:
                        type: string
                        description: Unidade da federação do embarque
                      rntc_transporta:
                        type: string
                        description: RNTC transporta
                      local_embarque:
                        type: string
                        description: Local para embarque
                      data_pedido:
                        type: string
                        description: Data do pedido
                      data_pedido_hora:
                        type: string
                        description: Hora do pedido
                      data_emissao:
                        type: string
                        description: Data da emissão da nota
                      indPres_pedido:
                        type: integer
                        description: Tipo de atendimento
                      natureza_pedido:
                        type: string
                        description: Natureza de operação
                      finalidade_nfe:
                        type: integer
                        description: Finalidade da NF-e
                      obs_pedido:
                        type: string
                        description: Observações da nota fiscal
                      obs_interno_pedido:
                        type: string
                        description: Observações internas da nota fiscal
                      status_pedido:
                        type: string
                        description: Status da nota fiscal
                      contas_pedido:
                        type: integer
                        description: Contas lançadas
                      comissao_pedido:
                        type: integer
                        description: Comissão Lançada
                      boletos_pedido:
                        type: integer
                        description: Boleto gerado
                      estoque_pedido:
                        type: integer
                        description: Estoque Lançado
                      nota_emitida:
                        type: integer
                        description: Se a nota fiscal foi emitida
                      nota_chave:
                        type: string
                        description: Chave da nota fiscal
                      nota_protocolo:
                        type: string
                        description: Protocolo da nota fiscal
                      nota_codigov:
                        type: 'null'
                        description: Código da nota fiscal
                      nota_recibo:
                        type: string
                        description: Recibo da nota fiscal
                      nota_data_autorizacao:
                        type: string
                        description: Data da autorização da nota fisca
                      nota_usuario_autorizacao:
                        type: string
                        description: Usuário que emitiu a nota fiscal
                      nota_data_cancelamento:
                        type: 'null'
                        description: Data do cancelamento da nota
                      nota_usuario_cancelamento:
                        type: 'null'
                        description: Usuário que cancelou a nota
                      nota_motivo_cancelamento:
                        type: 'null'
                        description: Motivo do cancelamento
                      nota_denegada:
                        type: 'null'
                        description: Se a nota foi denegada
                      nota_importada:
                        type: integer
                        description: Se a nota foi importada para o sistema
                      nota_scan:
                        type: integer
                        description: Se a nota foi emitida no ambiente de SCAN
                      xml_importado:
                        type: integer
                        description: XML importado
                      id_almoxarifado:
                        type: integer
                        description: ID almoxarifado
                      data_cad_pedido:
                        type: string
                        description: Data de cadastro da nota fiscal
                      data_mod_pedido:
                        type: string
                        description: Data da última modificação
                      ambiente:
                        type: integer
                        description: Ambiente de emissão
                      seguro_pedido:
                        type: string
                        description: Seguro nota fiscal
                      lixeira:
                        type: string
                        description: Situação da nota fiscal no sistema
                      valor_seguro_blocked:
                        type: integer
                        description: Valor seguro bloqueado
                      id_pedido_ref:
                        type: integer
                        description: ID pedido referênciado
                      chave_ref_produtos:
                        type: integer
                        description: Chave referênciado produtos
                      cnpj_intermediador:
                        type: string
                        description: CNPJ intermediador
                      ident_no_intermediador:
                        type: string
                        description: Número identidade intermediador
                      tipo_intermediador:
                        type: integer
                        description: Tipo intermediador
                      qBCMono:
                        type: string
                        description: Base de calculo ICMS monofásico
                      vICMSMono:
                        type: string
                        description: Valor ICMS monofásico
                      qBCMonoReten:
                        type: string
                        description: Base de calculo ICMS monofásico retenção
                      vICMSMonoReten:
                        type: string
                        description: Valor ICMS monofásico retenção
                      qBCMonoRet:
                        type: string
                        description: Base de calculo ICMS monofásico retido
                      vICMSMonoRet:
                        type: string
                        description: Valor ICMS monofásico retido
                    required:
                      - id_venda
                      - tp_nfe
                      - serie_nota
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - id_local_cobranca
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - valor_total_produtos
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_total_nota
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_vICMSDeson_icms
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - valor_despesas
                      - valor_desconto_blocked
                      - valor_despesas_blocked
                      - valor_frete_blocked
                      - condicao_pagamento
                      - frete_por_pedido
                      - transportadora_pedido
                      - id_transportadora
                      - volumes_transporta
                      - especie_transporta
                      - marca_transporta
                      - numeracao_transporta
                      - placa_transporta
                      - uf_placa_transporta
                      - uf_embarque
                      - rntc_transporta
                      - local_embarque
                      - data_pedido
                      - data_pedido_hora
                      - data_emissao
                      - indPres_pedido
                      - natureza_pedido
                      - finalidade_nfe
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - contas_pedido
                      - comissao_pedido
                      - boletos_pedido
                      - estoque_pedido
                      - nota_emitida
                      - nota_chave
                      - nota_protocolo
                      - nota_codigov
                      - nota_recibo
                      - nota_data_autorizacao
                      - nota_usuario_autorizacao
                      - nota_data_cancelamento
                      - nota_usuario_cancelamento
                      - nota_motivo_cancelamento
                      - nota_denegada
                      - nota_importada
                      - nota_scan
                      - xml_importado
                      - id_almoxarifado
                      - data_cad_pedido
                      - data_mod_pedido
                      - ambiente
                      - seguro_pedido
                      - lixeira
                      - valor_seguro_blocked
                      - id_pedido_ref
                      - chave_ref_produtos
                      - cnpj_intermediador
                      - ident_no_intermediador
                      - tipo_intermediador
                      - qBCMono
                      - vICMSMono
                      - qBCMonoReten
                      - vICMSMonoReten
                      - qBCMonoRet
                      - vICMSMonoRet
                    x-apidog-orders:
                      - id_venda
                      - tp_nfe
                      - serie_nota
                      - id_pedido
                      - id_cliente
                      - nome_cliente
                      - id_local_cobranca
                      - vendedor_pedido
                      - vendedor_pedido_id
                      - valor_total_produtos
                      - desconto_pedido
                      - desconto_pedido_porc
                      - peso_total_nota
                      - peso_total_nota_liq
                      - frete_pedido
                      - valor_total_nota
                      - valor_baseICMS
                      - valor_ICMS
                      - valor_vICMSDeson_icms
                      - valor_baseST
                      - valor_ST
                      - valor_IPI
                      - valor_despesas
                      - valor_desconto_blocked
                      - valor_despesas_blocked
                      - valor_frete_blocked
                      - condicao_pagamento
                      - frete_por_pedido
                      - transportadora_pedido
                      - id_transportadora
                      - volumes_transporta
                      - especie_transporta
                      - marca_transporta
                      - numeracao_transporta
                      - placa_transporta
                      - uf_placa_transporta
                      - uf_embarque
                      - rntc_transporta
                      - local_embarque
                      - data_pedido
                      - data_pedido_hora
                      - data_emissao
                      - indPres_pedido
                      - natureza_pedido
                      - finalidade_nfe
                      - obs_pedido
                      - obs_interno_pedido
                      - status_pedido
                      - contas_pedido
                      - comissao_pedido
                      - boletos_pedido
                      - estoque_pedido
                      - nota_emitida
                      - nota_chave
                      - nota_protocolo
                      - nota_codigov
                      - nota_recibo
                      - nota_data_autorizacao
                      - nota_usuario_autorizacao
                      - nota_data_cancelamento
                      - nota_usuario_cancelamento
                      - nota_motivo_cancelamento
                      - nota_denegada
                      - nota_importada
                      - nota_scan
                      - xml_importado
                      - id_almoxarifado
                      - data_cad_pedido
                      - data_mod_pedido
                      - ambiente
                      - seguro_pedido
                      - lixeira
                      - valor_seguro_blocked
                      - id_pedido_ref
                      - chave_ref_produtos
                      - cnpj_intermediador
                      - ident_no_intermediador
                      - tipo_intermediador
                      - qBCMono
                      - vICMSMono
                      - qBCMonoReten
                      - vICMSMonoReten
                      - qBCMonoRet
                      - vICMSMonoRet
                    description: Dados da nota fiscal
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
                  id_venda: 123456
                  tp_nfe: 1
                  serie_nota: 123
                  id_pedido: 123456
                  id_cliente: 123456
                  nome_cliente: Nome Cliente
                  id_local_cobranca: 0
                  vendedor_pedido: Nome Vendedor
                  vendedor_pedido_id: 255162123456
                  valor_total_produtos: '100.00'
                  desconto_pedido: '0.00'
                  desconto_pedido_porc: '0.00'
                  peso_total_nota: '10.0000'
                  peso_total_nota_liq: '8.0000'
                  frete_pedido: '0.00'
                  valor_total_nota: '100.00'
                  valor_baseICMS: '100.00'
                  valor_ICMS: '10.00'
                  valor_vICMSDeson_icms: '0.00'
                  valor_baseST: '0.00'
                  valor_ST: '0.00'
                  valor_IPI: '0.00'
                  valor_despesas: '0.00'
                  valor_desconto_blocked: 0
                  valor_despesas_blocked: 0
                  valor_frete_blocked: 0
                  condicao_pagamento: 3
                  frete_por_pedido: 9
                  transportadora_pedido: ''
                  id_transportadora: 0
                  volumes_transporta: 1
                  especie_transporta: CX
                  marca_transporta: Marca
                  numeracao_transporta: '123'
                  placa_transporta: ''
                  uf_placa_transporta: ''
                  uf_embarque: ''
                  rntc_transporta: ''
                  local_embarque: ''
                  data_pedido: '0000-00-00'
                  data_pedido_hora: '00:00:00'
                  data_emissao: '0000-00-00'
                  indPres_pedido: 0
                  natureza_pedido: Venda de mercadoria adquirida ou recebida de terceiros
                  finalidade_nfe: 1
                  obs_pedido: ''
                  obs_interno_pedido: ''
                  status_pedido: Atendido
                  contas_pedido: 0
                  comissao_pedido: 0
                  boletos_pedido: 0
                  estoque_pedido: 0
                  nota_emitida: 1
                  nota_chave: '123456789101112'
                  nota_protocolo: '123456789'
                  nota_codigov: null
                  nota_recibo: '123456789'
                  nota_data_autorizacao: '0000-00-00 00:00:00'
                  nota_usuario_autorizacao: usuário
                  nota_data_cancelamento: null
                  nota_usuario_cancelamento: null
                  nota_motivo_cancelamento: null
                  nota_denegada: null
                  nota_importada: 0
                  nota_scan: 0
                  xml_importado: 0
                  id_almoxarifado: 0
                  data_cad_pedido: '0000-00-00 00:00:00'
                  data_mod_pedido: 20000-00-00 00:00:00
                  ambiente: 2
                  seguro_pedido: '0.00'
                  lixeira: Nao
                  valor_seguro_blocked: 0
                  id_pedido_ref: 0
                  chave_ref_produtos: 0
                  cnpj_intermediador: ''
                  ident_no_intermediador: ''
                  tipo_intermediador: 1
                  qBCMono: '0.00'
                  vICMSMono: '0.00'
                  qBCMonoReten: '0.00'
                  vICMSMonoReten: '0.00'
                  qBCMonoRet: '0.00'
                  vICMSMonoRet: '0.00'
          headers: {}
          x-apidog-name: Success
        '403':
          description: ''
          content:
            application/json:
              schema:
                title: ''
                type: object
                properties:
                  code:
                    type: number
                    description: Código do retorno da requisição
                  status:
                    type: string
                    description: status
                  data:
                    type: string
                    description: Dados da nota fiscal
                x-apidog-orders:
                  - code
                  - status
                  - data
              example:
                code: 403
                status: error
                data: Nenhuma nota fiscal encontrada!
          headers: {}
          x-apidog-name: Proibido
      security: []
      x-apidog-folder: Vendas/Notas fiscais
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/876772/apis/api-16361484-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```
