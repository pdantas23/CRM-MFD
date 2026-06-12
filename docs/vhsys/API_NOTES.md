# VHSYS API v2 — Notas de Integração

> **Fonte:** documentação pública oficial em https://developers.vhsys.com.br/api/ obtida em 2026-06-11
> via o índice `llms.txt` do portal. Cada página tem versão markdown com a spec OpenAPI completa
> (request/response/exemplos). As specs brutas estão salvas em `docs/vhsys/raw/*.md` — **elas são a
> âncora autoritativa**; este arquivo é o resumo operacional.
>
> A página de visão geral ("API V2") retornou 404 na versão `.md` e 403 no HTML (atrás de login).
> Itens não cobertos pela doc pública estão marcados como **[LACUNA]** e constam em
> `PERGUNTAS_AO_USUARIO.md`.

## Convenções gerais (observadas em todas as specs baixadas)

- **Base URL:** `https://api.vhsys.com/v2`
- **Auth:** headers `access-token` e `secret-access-token` em toda requisição (app "Integração via API" instalado na conta). Sem OAuth.
- **Header obrigatório:** `User-Agent` identificando a aplicação (ex.: `MinhaAplicacao/1.0`). Documentado como `required: true` nos endpoints de listagem.
- **Headers recomendados:** `Content-Type: application/json`, `Cache-Control: no-cache`.
- **Envelope de resposta:** sempre `{ code: number, status: "success" | "error", data: ... }`.
  Listagens incluem `paging: { total_count, total, offset, limit, limit_max }`.
- **Paginação:** query `limit` (máximo **250**, conforme `limit_max`) + `offset`. Ordenação via `order` (nome do campo, ex.: `data_mod_pedido`) e `sort` (`Asc` | `Desc`, default `Asc`).
- **Sync incremental:** listagens aceitam `data_modificacao` (date-time) — "registros criados ou modificados após a data informada". É a base da reconciliação por polling.
- **Soft delete:** registros excluídos ficam na "lixeira"; `lixeira=Sim` nas listagens os retorna. Listagens retornam o campo `lixeira: "Sim" | "Nao"` em cada registro.
- **⚠️ Erros:** "nenhum registro encontrado" retorna **HTTP 403** com `{ code: 403, status: "error", data: "Nenhum pedido encontrado!" }` — ou seja, 403 NÃO é só falha de auth; lista vazia também vem como 403. O client precisa tratar isso como resultado vazio, não como erro fatal. Webhooks documentam ainda 400, 401, 422 (`{ code, status, mensagem, erros[] }`) e 500.
- **Valores monetários:** strings decimais com ponto (`"10.00"`). Datas `YYYY-MM-DD`; timestamps `YYYY-MM-DD HH:MM:SS` (placeholders `0000-00-00` aparecem nos exemplos).
- **Rate limit (observado em produção, 2026-06-11):** headers `x-ratelimit-limit: 10000` e
  `x-ratelimit-remaining` em toda resposta. Janela não documentada; o client usa retry/backoff em
  429 + pausa de 150 ms entre páginas.

## Produtos (`docs/vhsys/raw/produtos-*.md`)

| Operação | Método/Path | Observações |
|---|---|---|
| Listar | `GET /produtos` | query: `cod_produto`, `marca_produto`, `desc_produto` (busca p/ autocomplete), `lista_preco`, `loja_visivel`, `lixeira`, `data_modificacao`, paginação |
| Consultar | `GET /produtos/{id_prod}` | query opcional `lista_preco` |

## Clientes (`raw/clientes-*.md`)

| Operação | Método/Path | Observações |
|---|---|---|
| Listar | `GET /clientes` | query: `tipo_pessoa`, `cnpj_cliente`, `razao_cliente`, `fantasia_cliente`, `lixeira`, `data_modificacao`, `data_cadastro`, paginação |
| Consultar | `GET /clientes/{id_cliente}` | |
| Cadastrar | `POST /clientes` | body: `razao_cliente` (obrig.), `tipo_pessoa`, `cnpj_cliente`, `endereco_cliente`, `numero_cliente`, `bairro_cliente`, `cep_cliente`, `cidade_cliente`, `uf_cliente`, `fone_cliente`, `celular_cliente`, `email_cliente`, `vendedor_cliente(_id)`, etc. |

## Vendedores (`raw/vendedores-listar.md`)

| Operação | Método/Path | Observações |
|---|---|---|
| Listar | `GET /vendedores` | query: `cnpj_vendedor`, `razao_vendedor`, `fantasia_vendedor`, `lixeira`, `data_modificacao`, paginação |

## Orçamentos (`raw/orcamentos-*.md`)

| Operação | Método/Path | Observações |
|---|---|---|
| Listar | `GET /orcamentos` | query: `nome_cliente`, `vendedor`, `status`, `lixeira`, `data_modificacao`, paginação |
| Consultar | `GET /orcamentos/{id_orcamento}` | |
| Cadastrar | `POST /orcamentos` | obrig.: apenas `nome_cliente`. Campos: `id_cliente`, `vendedor_pedido(_id)`, `desconto_pedido`, `frete_pedido`, `data_pedido`, `prazo_orcamento`, `validade_orcamento`, `referencia_pedido`, `obs_pedido`, `obs_interno_pedido`, `status_pedido`, `frete_por_pedido` (0=Remetente, 1=Destinatário, 9=Sem frete)… Response traz **`id_orcamento`** (PK) e **`id_pedido`** ("ID sequência orçamento" = número exibível) |
| Atualizar | `PUT /orcamentos/{id_orcamento}` | mesmos campos do cadastro (sem parcelas/validade no body conforme spec) |
| Excluir | `DELETE /orcamentos/{id_orcamento}` | vai para a lixeira |
| Itens — listar | `GET /orcamentos/{id_orcamento}/produtos` | |
| Itens — cadastrar | `POST /orcamentos/{id_orcamento}/produtos` | body: `id_produto`, `desc_produto`, `qtde_produto`, `valor_unit_produto`, `desconto_produto`, `ipi_produto`, `icms_produto`, `valor_custo_produto`, `peso_produto`, `peso_liq_produto` |
| Itens — alterar | `PUT /orcamentos/{id_orcamento}/produtos/{id_orcamento_prod}` | |
| Itens — excluir | `DELETE /orcamentos/{id_orcamento}/produtos/{id_orcamento_prod}` | |
| Status — listar | `GET /orcamentos/{id_orcamento}/status` | **histórico de status DO orçamento** (não é lista de status da conta) |
| Status — cadastrar | `POST /orcamentos/{id_orcamento}/status` | body: `data_status` (obrig.), `obs_status`, `tipo_status` (obrig.) |
| Parcelas — listar | `GET /orcamentos/{id_orcamento}/parcelas` | |
| Parcelas — cadastrar | `POST /orcamentos/{id_orcamento}/parcelas` | substitui TODAS as parcelas anteriores |

## Pedidos (`raw/pedidos-*.md`)

| Operação | Método/Path | Observações |
|---|---|---|
| Listar | `GET /pedidos` | query: `id_pedido`, `nome_cliente`, `vendedor`, `status`, `lixeira`, `data_modificacao`, paginação. Cada registro traz **`id_ped`** (PK p/ sub-recursos) e **`id_pedido`** ("ID sequencial" = número exibível), `status_pedido`, `valor_total_nota`, `data_pedido`, `vendedor_pedido(_id)`, `transportadora_pedido`, `frete_pedido`, `obs_pedido`, `data_cad_pedido`, `data_mod_pedido`, `contas_pedido`, `estoque_pedido`… |
| Consultar | `GET /pedidos/{id_ped}` | |
| Cadastrar | `POST /pedidos` | campos como orçamento + `prazo_entrega`, `estoque_pedido` (lançar estoque), `contas_pedido` (lançar contas) |
| Atualizar | `PUT /pedidos/{id_ped}` | |
| Excluir | `DELETE /pedidos/{id_ped}` | lixeira |
| Itens | `GET/POST /pedidos/{id_ped}/produtos`, `PUT/DELETE /pedidos/{id_ped}/produtos/{id_ped_prod}` | mesmo schema de item dos orçamentos |
| Status — listar | `GET /pedidos/{id_ped}/status` | **histórico** do pedido: `{ id_status, id_pedido, data_status, obs_status, tipo_status, id_usuario, nome_usuario }` |
| Status — cadastrar | `POST /pedidos/{id_ped}/status` | body: `data_status` (obrig.), `obs_status` (≤255), `tipo_status` (obrig.) |
| Parcelas — listar | `GET /pedidos/{id_ped}/parcelas` | retorna `{ id_parcela, id_pedido, data_parcela, valor_parcela, forma_pagamento, observacoes_parcela }` — **NÃO retorna** `conta_liquidada`/`valor_pago` |
| Parcelas — cadastrar | `POST /pedidos/{id_ped}/parcelas` | substitui as anteriores. body por parcela: `data_parcela` (obrig.), `valor_parcela` (obrig.), `forma_pagamento` (enum: Dinheiro, PIX, Boleto, Cartão de Crédito/Débito, Transferência…), `observacoes_parcela`, **`conta_liquidada` ('0'\|'1')**, **`valor_pago`**, **`data_pagamento`** |

### ✅ Modelo de status — RESOLVIDO com a API real da conta (2026-06-11)

Sondagem read-only contra produção (exemplos mascarados em `raw/exemplos/`):

- **`GET /situacoes`** — endpoint **não documentado publicamente**, mas existente — retorna as
  situações personalizadas da conta, agrupadas por entidade (`Pedidos`, `Orcamentos`,
  `OrdemServico`). Schema: `{ id_situacao, id_empresa, tipo_pedido (1=pedido, 2=orçamento),
  tipo_status (enum-base), nome_situacao, ordem, lixeira, data_cad, data_mod }`.
  ⚠️ Peculiaridades: envelope com `status: "sucesso"` (pt-BR) e acentos com encoding duplo
  ("Em separaÃ§Ã£o") — normalizar no client.
- **Situações da conta — Pedidos (atualizado 2026-06-11):** 858 "Aguardando pagamento" (Em Aberto,
  ordem 1) → **1179 "Pagamento Parcial" (Em Aberto, ordem 2)** → 857 "Pagamento aprovado" (Em
  Andamento, 3) → 859 "Em separação" (Em Andamento, 4) → **1180 "Entrega Parcial" (Em Aberto,
  ordem 5)** → 777 "Entregue" (Atendido, 6) | 778 "Cancelado" (Cancelado, 7).
  Situações novas criadas em 2026-06-11 16:43:54. Ver `raw/exemplos/situacoes-atual.json`.
- **Situações da conta — Orçamentos:** 860 "Em negociação" (Em Aberto, 1) → 768 "Aprovado"
  (Atendido, 2) | 769 "Perdido" (Cancelado, 3).
- **`GET /pedidos` real** traz, além do documentado, o campo **`situacao`** (ID numérico da
  situação personalizada) e `pagamento_com_pagar_me`. Pedidos anteriores à criação das situações
  (abr/2026) têm `situacao: null` ou `0` — o espelho/Kanban precisa de fallback para o enum-base
  `status_pedido` nesses casos.
- **`GET /pedidos/{id}/status` real** também inclui `situacao` em cada item do histórico.
- **Detecção de pagamento (decisão d2):** ler `situacao` do pedido via polling
  (`data_modificacao`): 858 = aguardando pagamento → 857 = pagamento aprovado (gate de entrega).
- **✅ LACUNA RESOLVIDA EM TESTE (2026-06-11):** `POST /pedidos/{id}/status` aceita o campo extra
  **`situacao`** (id numérico da situação personalizada) além do `tipo_status` obrigatório. Quando
  enviado, o VHSYS registra a situação personalizada corretamente (confirmado: pedido TESTE-APAGAR
  id_ped=49342019 teve situacao atualizada para 1179 com sucesso). O campo alternativo `id_situacao`
  foi testado e ignorado pela API. Protocolo de escrita: sempre enviar `tipo_status` + `situacao`.

### ✅ Contas a Receber — RESOLVIDO (2026-06-11)

- **Endpoint:** `GET /contas-receber` (confirmado). Outros caminhos (`/contas_receber`,
  `/receitas`, etc.) retornam 404.
- **⚠️ `id_registro` NÃO vincula ao pedido (corrigido na validação em massa de 2026-06-11):**
  a sondagem inicial (n=2) sugeria `id_registro` = número do pedido, mas a validação com os 3.540
  registros mostrou COLISÃO entre origens — o cliente conferia em ~2% dos casos (ex.: conta
  `id_registro=1933` de "NORDEO ENGENHARIA" R$ 40.225 vs pedido 1933 de "OSMAR DE OLIVEIRA"
  R$ 36). `id_registro` é um id interno da origem do lançamento, não o pedido. O filtro
  `?id_registro=` continua funcionando, mas filtra por esse id cru. Parâmetros `id_pedido=`,
  `nome_conta=` (busca exata) NÃO funcionam.
- **Outros filtros testados:** `liquidado` (`Sim`|`Nao`), `data_modificacao`, `valor_rec`,
  `valor_pago`, `data_vencimento`, `data_pagamento`, `parciais` (`1`|`0`), paginação padrão.
- **Sem filtro por situação do pedido** — não existe `situacao=857` no endpoint de contas.
- **✅ Vínculo confiável ao pedido (validado em 3.540 contas):**
  `identificacao = "Ped_<id_ped>"` (PK do pedido) e `nome_conta = "Pedido <numero>"` — nas 1.963
  contas com esse padrão, id, número E cliente conferiram em 100%; com esse vínculo, 1.848 de
  1.859 pedidos fecham Σ contas = valor_total (99,4%). Contas `identificacao = "NFe_<id>"`
  (1.229) NÃO têm campo de pedido — a NF-e não é resolvível para pedido só com os campos da conta
  (**lacuna conhecida**; exigiria espelhar notas fiscais). ~350 contas manuais também ficam sem
  vínculo. Implementação: `supabase/vhsys_vinculo_contas_fix.sql` + extração no sync.
- **Campos de liquidação na leitura (confirmado):** `liquidado_rec` (`"Sim"`|`"Nao"`),
  `valor_pago`, `valor_baixa`, `data_pagamento`, `situacao` (string livre, ex.:
  `"Conta Liquidada."` | `"Liquidado via NFe venda."` | `null`), `status` (int: `3` = liquidado,
  `null` = não pago).
- **`parciais=1`:** adiciona array `parciais` no response — cada item: `{ id_recebimento,
  id_contas_rec, data_pagamento, valor_pago, valor_juros, valor_desconto, valor_acrescimo,
  valor_taxa, forma_pagamento, obs_pagamento, id_banco_cad, id_pagamento_ob }`.
- **Pagamento parcial empírico:** `valor_pago` < `valor_rec` mas `liquidado_rec: "Sim"` é possível
  (ex.: pedido 2900: `valor_rec: "10498.20"`, `valor_pago: "9391.20"`, `valor_baixa: "9391.20"`).
  O VHSYS marca como "liquidado" quando o operador registra o pagamento, mesmo que o valor seja
  menor — NÃO há flag automática de "parcialmente pago" na conta. A comparação
  `parseFloat(valor_pago) < parseFloat(valor_rec)` é o critério programático.
- **Shape completo de receita:** ver `raw/exemplos/receita-pedido-pagamento-aprovado.json`.
- **Filtro `status` de pedidos:** aceita apenas o enum-base (`Em Aberto`, `Em Andamento`,
  `Atendido`, `Cancelado`). Não aceita nomes de situações personalizadas (ex.:
  `status=Pagamento Parcial` retorna 403).

### Contexto anterior (doc pública apenas — mantido para referência)

- `status_pedido` (campo do pedido/orçamento) e `tipo_status` (histórico) usam um **enum FIXO de 4 valores**:
  `Em Aberto`, `Em Andamento`, `Atendido`, `Cancelado`.
- `GET .../status` lista o **histórico de mudanças de UM registro**, não os status configuráveis da conta.
- **Não existe na doc pública** um endpoint que liste status personalizados da conta (os status
  exibidos no Kanban da interface web do VHSYS). Se a conta usa status customizados, a API pública
  não parece expô-los. → ver pergunta (d1) em `PERGUNTAS_AO_USUARIO.md`. **Não montar Kanban
  dinâmico sem resolver isto.**
- Pagamento — **DECISÃO DO USUÁRIO (2026-06-11):** o estado de pagamento deriva do campo de
  situação do PEDIDO (`aguardando pagamento` → `pagamento aprovado` | `cancelado`), detectado por
  **polling** com `data_modificacao`. Contas a Receber NÃO é fonte do gate (pode ser espelhada no
  futuro só para telas financeiras). Pendência: a spec pública só mostra o campo `status_pedido`
  com o enum-base de 4 valores — falta confirmar no `GET /pedidos` real se existe um campo
  `situacao` com os rótulos de pagamento ou se será preciso mapear
  (`aguardando pagamento`→`Em Aberto`; `pagamento aprovado`→`Em Andamento`/`Atendido`) e
  reportar antes de criar migration. (Para referência: as parcelas têm
  `conta_liquidada`/`valor_pago` apenas na escrita; a leitura não os retorna.)

## Webhooks (`raw/webhooks-*.md`)

| Operação | Método/Path |
|---|---|
| Listar | `GET /webhook` |
| Consultar | `GET /webhook/{id_webhook}` |
| Cadastrar | `POST /webhook` — body: `url` (https, 8–255), `user` (≥8), `password` (≥8), `entidade` |
| Atualizar | `PUT /webhook/{id_webhook}` |
| Excluir | `DELETE /webhook/{id_webhook}` |

- **Entidades suportadas (enum da spec):** `clientes`, `servico` (ordem de serviço), `vendas_balcao` (PDV), `contas_receber`, `produtos`, `todos`.
- **⚠️ NÃO há entidade de webhook para `pedidos` nem `orcamentos`.** Sync dessas entidades terá de ser por **polling** com `data_modificacao` (a menos que o manual logado diga o contrário → pergunta (e)).
- `todos` exige excluir os webhooks existentes antes (erro 400 documentado).
- `user`/`password` são credenciais que o VHSYS usará ao chamar nossa URL (autenticação do receiver).
- **Caveat oficial (texto da doc):** *"Ao realizar uma inclusão ou atualização de webhooks, o usuário conectado no vhsys precisa realizar login novamente para iniciar os envios, pois as configurações ficam na sessão do usuário."*
- **[LACUNA] Payload do evento:** a doc pública descreve o cadastro do webhook, mas não o corpo do POST que o VHSYS envia ao nosso endpoint. → pergunta (e2).

## Lacunas consolidadas (dependem de acesso logado / da conta do usuário)

1. Rate limits e política de throttling.
2. Endpoint/fluxo de "emitir pedido a partir de orçamento" (não existe na doc pública).
3. Status personalizados da conta (Kanban da UI) — existem via API?
4. Payload real dos eventos de webhook (por entidade).
5. Schema completo de `GET /pedidos/{id_ped}` (consultar individual) vs listar — conferir com resposta real da conta.
6. Confirmação de que `403 + "Nenhum ... encontrado"` é mesmo o contrato para lista vazia em produção.
