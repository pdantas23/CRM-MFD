# Arquitetura de integração VHSYS ↔ CRM — PROPOSTA (aguardando aprovação)

> Status: **esboço para aprovação**. Ajustada ao que a doc pública confirmou
> (ver `API_NOTES.md`). Pontos marcados com ❓ dependem das respostas em
> `PERGUNTAS_AO_USUARIO.md` e podem alterar o desenho.

## Princípio

**VHSYS é a fonte da verdade.** O Supabase é um espelho de leitura:

```
                    ┌────────────────────────────────────────┐
   escreve          │              VHSYS (ERP)               │
  ┌────────────────►│  produtos · clientes · vendedores ·    │
  │                 │  orçamentos · pedidos · parcelas ·     │
  │                 │  contas a receber                      │
  │                 └────────┬──────────────────┬────────────┘
  │                          │ webhooks         │ polling (data_modificacao)
  │                          │ (clientes,       │ (pedidos, orçamentos —
  │                          │  produtos,       │  SEM webhook na API)
  │                          │  contas_receber) │
  │                          ▼                  ▼
┌─┴──────────────┐   ┌──────────────────────────────────────┐
│ Server Actions │   │   /api/vhsys/webhook  +  /api/cron   │
│ (Next.js, só   │   │        upsert no espelho             │
│  server-side)  │   └────────────────┬─────────────────────┘
└─▲──────────────┘                    ▼
  │                 ┌────────────────────────────────────────┐
  │     lê          │        Supabase (espelho + app)        │
┌─┴─────────────────┤  espelho VHSYS + entregas (próprias)   │
│   UI (App Router) │◄── Realtime ───────────────────────────┘
└───────────────────┘
```

- **Leitura:** a UI lê SEMPRE do Supabase (rápido) e assina Supabase Realtime para refletir
  mudanças do espelho sem refresh.
- **Escrita:** server actions chamam a API VHSYS primeiro; em caso de sucesso, fazem upsert
  imediato no espelho (não esperam o ciclo de sync). Tokens só em env server-side
  (`VHSYS_ACCESS_TOKEN`, `VHSYS_SECRET_ACCESS_TOKEN`); nenhuma chamada VHSYS no browser.

## Camadas

### 1. Cliente VHSYS — `src/lib/vhsys/`
- `client.ts`: `fetch` tipado com base URL por conta (default `https://api.vhsys.com/v2`),
  credenciais da conta ativa injetadas via AsyncLocalStorage (`runComTokensVhsys`),
  `User-Agent` configurável (`APP_USER_AGENT`, default `CRM/<versão>`), parse do envelope
  `{code, status, data, paging}`.
  - Trata o contrato real de erro: **403 com "Nenhum … encontrado" = resultado vazio**, não exceção.
  - Retry com backoff exponencial para 429/5xx/erros de rede (❓ rate limits — pergunta g).
- `paginacao.ts`: iterador que percorre `limit=250`/`offset` até `paging.total_count`.
- `tipos.ts`: tipos gerados a partir das specs em `docs/vhsys/raw/` (sem inventar campos).
- Módulos por entidade: `produtos.ts`, `clientes.ts`, `vendedores.ts`, `orcamentos.ts`, `pedidos.ts`, `webhooks.ts`.

### 2. Inbound
- **Webhook receiver** `src/app/api/vhsys/webhook/route.ts`:
  - Valida as credenciais `user`/`password` cadastradas no `POST /webhook` (Basic Auth do request
    que o VHSYS envia — ❓ formato do payload, pergunta e2).
  - Upsert no espelho por `id_vhsys`.
  - Cobre apenas `clientes`, `produtos`, `contas_receber` (entidades que a API suporta).
  - Documentar no runbook: **relogin no VHSYS após cadastrar/atualizar o webhook**.
- **Polling** `src/app/api/cron/vhsys-sync/route.ts` (protegida por secret; Vercel Cron):
  - Pedidos e orçamentos: relistar com `data_modificacao > último sync` (não há webhook para eles).
  - Reconciliação periódica completa (ex.: 1×/dia) para corrigir o que webhook/polling perderem,
    incluindo lixeira (`lixeira=Sim`) para propagar exclusões.

### 3. Espelho no Supabase (migration SÓ depois da Fase 0 aprovada)
Tabelas (todas com `id_vhsys` único + `numero` próprio do VHSYS onde existir + `sincronizado_em`):
- `vhsys_produtos`, `vhsys_clientes`, `vhsys_vendedores`
- `vhsys_orcamentos` (+ `vhsys_orcamento_itens`) — `id_vhsys = id_orcamento`, `numero = id_pedido` (assim nomeado pela API)
- `vhsys_pedidos` (+ `vhsys_pedido_itens`, `vhsys_pedido_parcelas`) — `id_vhsys = id_ped`, `numero = id_pedido`
- `vhsys_status_historico` (por entidade, espelha `GET .../status`)
- `vhsys_contas_receber` — **fora do escopo do gate de pagamento** (decisão d2); espelho futuro
  opcional apenas para telas financeiras
- RLS: leitura para usuários autenticados; escrita somente via service role (webhook/cron/actions).

### 4. Entregas (camada própria do app)
A Entrega local (data, período, ordem, bairro, endereço, anexo) continua sendo logística NOSSA,
com nova FK `pedido_id → vhsys_pedidos.id`. **Decisão (d3):** a dimensão ENTREGA é do app —
`nao_iniciada → em_separacao → entrega_parcial → entregue` — com origem no módulo de entregas
local, não no VHSYS.

### 5. Status — modelo em DUAS dimensões (decisão d2/d3 de 2026-06-11)

| Dimensão | Estados | Origem | Detecção |
|---|---|---|---|
| **PAGAMENTO** | `aguardando_pagamento` → `pagamento_aprovado` \| `cancelado` | situação do PEDIDO no VHSYS | **polling** (`data_modificacao`) — sem webhook |
| **ENTREGA** | `nao_iniciada` → `em_separacao` → `entrega_parcial` → `entregue` | módulo de entregas do app | local (Realtime) |

- "Aguardando pagamento" é a situação inicial ao emitir o pedido a partir do orçamento; pedido
  parcelado também entra como `pagamento_aprovado`. Contas a Receber NÃO participa do gate.
- **Gate de entrega:** o cadastro de entrega habilita quando a situação do pedido =
  `pagamento_aprovado`.
- ❓ **Pendência (d2.1):** a spec pública só expõe `status_pedido` (enum-base de 4 valores). Se o
  `GET /pedidos` real trouxer os rótulos de pagamento num campo `situacao`, lemos direto dele; se
  vier só o enum-base, mapeamos (`aguardando pagamento`→`Em Aberto`;
  `pagamento_aprovado`→`Em Andamento`/`Atendido`) e **reportamos antes de criar a migration**.
- Colunas do Kanban de pedidos: lidas de tabela semeada a partir dos valores reais da conta
  (validar com (c)/(d1)), não hardcoded na UI.
- Mover card ⇒ server action: `POST /pedidos/{id_ped}/status` (e/ou `PUT /pedidos/{id_ped}` com
  `status_pedido`) ⇒ upsert no espelho ⇒ Realtime atualiza a UI. ❓ qual dos dois mecanismos a
  conta usa de fato — validar com (c).

## Controle de acesso (DECISÕES FECHADAS — 2026-06-11)

**Roles:** `admin`, `vendedor`, `entregador`. `profiles` ganha o role novo + coluna
`vendedor_id bigint null → vhsys_vendedores.id_vhsys` (migration `supabase/roles_vendedor.sql`).
Não há endpoint de usuários na API VHSYS (confirmado no índice público) ⇒ **mapeamento manual**
via tela de admin no CRM (criar/editar conta, definir role + vendedor_id; criação de usuário via
Auth Admin API com service role no servidor).

**RLS por tabela (alvo final):**

| Tabela | admin | vendedor | entregador |
|---|---|---|---|
| vhsys_produtos, vhsys_situacoes, vhsys_vendedores | SELECT | SELECT | SELECT |
| vhsys_clientes | SELECT | SELECT | SELECT |
| vhsys_pedidos, vhsys_orcamentos | todos | só `vendedor_id = profiles.vendedor_id` | — |
| entregas | todas | só entregas de pedidos do próprio `vendedor_id` (join entrega→pedido; exige FK `entregas.pedido_id`) | todas |
| profiles | gerencia todos | só o próprio | só o próprio |

Helper `public.vendedor_id_do_usuario(uid)` (security definer) já criado para essas policies.

**⚠️ GUARDRAIL ANTI-LOCKOUT:** as policies restritivas de pedidos/orçamentos/entregas só serão
aplicadas quando (1) as tabelas espelho existirem e (2) houver pelo menos UMA conta admin mapeada.
Até lá, leitura autenticada aberta. As policies restritivas serão entregues em SQL separado
(`supabase/rls_restritivo.sql`, a criar junto com o espelho de pedidos/orçamentos) — nunca
embutidas na migration das tabelas.

**Escrita (fase futura):** vendedor cria pedido/orçamento sempre com o próprio `vendedor_id`;
admin pode criar para qualquer vendedor.

## Runbook do sync (implementado na Fase 1 / Parte B)

- **Rota:** `GET /api/cron/vhsys-sync` (incremental) e `?modo=completo` (reconciliação total,
  inclui `lixeira=Sim` para propagar exclusões). Auth: header `Authorization: Bearer <CRON_SECRET>`.
  O middleware isenta `/api/cron/*` do redirect de login (a rota tem auth própria).
- **Env vars (server-side):** `VHSYS_API_BASE`, `VHSYS_ACCESS_TOKEN`, `VHSYS_SECRET_ACCESS_TOKEN`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
- **Cursor:** tabela `vhsys_sync_estado` guarda `ultima_sync_em` por entidade; o incremental relê
  com 5 min de sobreposição para não perder registros modificados durante a execução.
- **Agendamento (decidir no checkpoint):** Vercel Cron envia o Bearer automaticamente quando
  `CRON_SECRET` existe. ⚠️ Plano Hobby limita cron a 1×/dia por job — polling de minutos exige
  plano Pro ou um disparador externo (ex.: cron-job.org chamando a rota com o header). Proposta:
  incremental a cada 5–15 min + reconciliação completa 1×/dia (madrugada).
- **Pull inicial:** primeira execução sem cursor lista tudo (volumes atuais: 362 produtos,
  641 clientes, 3 vendedores — minutos, dentro do `maxDuration` de 300 s).

## Decisões já fechadas pela doc pública

1. Paginação: `limit` máx. 250 + `offset`; iterar até `total_count`.
2. Sync incremental por `data_modificacao` em todas as listagens usadas.
3. Webhook não cobre pedidos/orçamentos ⇒ polling é obrigatório para o núcleo do CRM.
4. "Emitir pedido a partir de orçamento" não existe como endpoint ⇒ provável criar `POST /pedidos`
   + marcar orçamento `Atendido` (❓ confirmar em (f)).
5. Tratamento de 403-como-vazio no client.
6. Exclusões propagadas via `lixeira=Sim` na reconciliação.
