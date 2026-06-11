# Perguntas ao usuário — gate da Fase 0

A doc pública (specs OpenAPI em `docs/vhsys/raw/`) cobriu mais do que o esperado: endpoints, schemas
de request/response com exemplos, paginação (`limit` máx. 250 + `offset`), sync incremental
(`data_modificacao`), envelope de erro e o caveat de relogin dos webhooks. Mesmo assim, os pontos
abaixo dependem da SUA conta ou de material atrás de login. **Não inicio a Fase 1 sem estas
respostas.**

## (a) Manual e coleção
Você consegue exportar da sua conta e me enviar (colocar em `docs/vhsys/` serve):
- O manual de integração (PDF), se existir na central do app "Integração via API".
- A coleção Postman/Apidog exportada (o portal usa Apidog; deve haver "Export").

## (b) Tokens
- Existe ambiente de teste/sandbox no VHSYS ou só produção?
- Me confirme que você vai colocar `VHSYS_ACCESS_TOKEN` e `VHSYS_SECRET_ACCESS_TOKEN` em
  `.env.local` (nunca no repositório). Posso preparar o `.env.example` com os nomes.

## (c) Status reais da sua conta
Rode (ou me deixe rodar quando os tokens existirem) e cole a saída:

```bash
# histórico de status de um pedido real (pegue um id_ped de GET /pedidos)
curl -H "access-token: $TOKEN" -H "secret-access-token: $SECRET" \
     -H "User-Agent: MFD-CRM/0.1" \
  "https://api.vhsys.com/v2/pedidos/<id_ped>/status"

# e a listagem para vermos os valores reais de status_pedido em uso
curl -H "access-token: $TOKEN" -H "secret-access-token: $SECRET" \
     -H "User-Agent: MFD-CRM/0.1" \
  "https://api.vhsys.com/v2/pedidos?limit=50"
```
O mesmo para `/orcamentos`.

## (d) Modelo de status — A PERGUNTA MAIS IMPORTANTE
A doc pública mostra que `status_pedido`/`tipo_status` é um **enum fixo de 4 valores**:
`Em Aberto`, `Em Andamento`, `Atendido`, `Cancelado`. Não encontrei endpoint público que liste
status personalizados da conta.

- **(d1)** Na interface web do seu VHSYS, o Kanban de pedidos usa exatamente esses 4 status, ou
  vocês têm status personalizados (ex.: "Em separação", "Entrega parcial", "Entregue")? Se
  personalizados, eles aparecem em algum retorno da API (cole um pedido real de
  `GET /pedidos/{id_ped}` para conferirmos)?
- **(d2)** ✅ **RESPONDIDO (2026-06-11):** pagamento deriva da **situação do PEDIDO**, não do
  financeiro. Dimensão PAGAMENTO: `aguardando_pagamento` (inicial, ao emitir o pedido a partir do
  orçamento) → `pagamento_aprovado` (parcelado também conta como aprovado) | `cancelado`. Detecção
  por **polling** (`data_modificacao`), sem webhook. O gate de entrega habilita quando a situação =
  pagamento aprovado. Contas a Receber NÃO é fonte do gate (espelho futuro opcional para telas
  financeiras).
  - **(d2.1) Pendência derivada:** a spec pública só mostra `status_pedido` (enum-base: Em Aberto,
    Em Andamento, Atendido, Cancelado). No `GET /pedidos` REAL da sua conta, existe um campo
    `situacao` com os rótulos "aguardando pagamento"/"pagamento aprovado"? Se vier só o enum-base,
    mapearei (`aguardando pagamento`→`Em Aberto`; `pagamento aprovado`→`Em Andamento`/`Atendido`)
    e **reporto para sua aprovação antes de criar qualquer migration**. → cole a saída do item (c).
- **(d3)** ✅ **RESPONDIDO (2026-06-11):** dimensão ENTREGA é do APP:
  `nao_iniciada` → `em_separacao` → `entrega_parcial` → `entregue`, com origem no módulo de
  entregas local (não no VHSYS).

## (e) Webhooks
A spec pública lista como entidades possíveis apenas: `clientes`, `servico`, `vendas_balcao`,
`contas_receber`, `produtos`, `todos`. **Não há webhook de pedidos nem de orçamentos.**
- **(e1)** O manual logado confirma isso? Se sim, pedidos/orçamentos serão sincronizados por
  polling (a API tem `data_modificacao`, que serve bem para isso).
- **(e2)** Você consegue capturar/me passar um exemplo do PAYLOAD que o VHSYS envia ao webhook
  (ex.: de `produtos` ou `contas_receber`)? A doc pública não o descreve.
- **(e3)** Ciente do caveat oficial: após cadastrar/atualizar webhook, é preciso **deslogar e logar
  de novo no VHSYS** para os envios começarem.

## (f) Emitir pedido a partir de orçamento
Não existe endpoint público para isso. Na interface web há o botão "gerar pedido" a partir do
orçamento — mas via API, o caminho que vejo é: criar `POST /pedidos` copiando os dados, e marcar o
orçamento como `Atendido` + `referencia_pedido`. O manual logado menciona algo melhor? Como vocês
fazem hoje?

## (g) Rate limits
A doc pública não documenta limites de requisição. O manual/suporte informa algum (req/min, burst)?
Enquanto não soubermos, o client usará retry com backoff em 429/5xx e o polling será conservador.

## (h) URL pública do webhook receiver
- **Produção:** o app está na Vercel — confirma o domínio (ex.: `https://<projeto>.vercel.app/api/vhsys/webhook`)?
- **Dev:** posso usar um túnel (ex.: `ngrok`/`cloudflared`) apontando para `localhost:3000`? Lembrando
  que trocar a URL do webhook exige o relogin do item (e3).

---

## Checklist Fase 0

| Item | Status |
|---|---|
| Doc pública dos endpoints (produtos, clientes, vendedores, orçamentos, pedidos, parcelas, status, webhooks) | ✅ obtida e salva em `docs/vhsys/raw/` (37 specs OpenAPI) |
| Resumo operacional | ✅ `docs/vhsys/API_NOTES.md` |
| Base URL + auth + paginação + sync incremental | ✅ documentados |
| Caveat de relogin do webhook | ✅ documentado (texto oficial) |
| Manual PDF / coleção exportada | ⬜ aguardando (a) |
| Tokens | ✅ em `.env.local` (2026-06-11) |
| Saída real de status da conta | ✅ capturada read-only em `raw/exemplos/` (c) |
| Modelo de status (pagamento + fulfillment) | ✅ d1: conta usa situações personalizadas via `GET /situacoes` (não documentado); d2.1: campo `situacao` (ID) no pedido — 858 aguardando pagamento → 857 pagamento aprovado. Fallback p/ `status_pedido` em pedidos antigos (`situacao` null/0) |
| Webhooks: confirmação de entidades + payload | ⬜ aguardando (e1–e2) |
| Emissão de pedido a partir de orçamento | ⬜ aguardando (f) |
| Rate limits | ⬜ aguardando (g) |
| URL pública do receiver | ⬜ aguardando (h) |
