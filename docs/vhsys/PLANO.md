# Plano de implementação — CRM + VHSYS

> TODO list viva. Checkpoint do usuário ao fim de cada fase; nenhuma fase começa sem o gate
> anterior fechado.

## Fase 0 — Documentação e perguntas [GATE — EM ANDAMENTO]
- [x] Baixar doc pública (37 specs OpenAPI em `docs/vhsys/raw/`)
- [x] `API_NOTES.md` (base URL, auth, paginação, erros, endpoints, lacunas)
- [x] `PERGUNTAS_AO_USUARIO.md` (itens a–h)
- [x] `ARQUITETURA.md` (esboço para aprovação)
- [x] d2/d3 respondidos: pagamento = situação do pedido (polling); entrega = dimensão do app
- [ ] Demais respostas a–h (bloqueantes: c, d1, d2.1 — campo real da situação no `GET /pedidos`)
- [ ] Aprovação da arquitetura
- [ ] OK explícito do usuário para a Fase 1

## Fase 1 — Fundação de integração
- [x] 1.1 `src/lib/vhsys/` (client tipado, auth, erros 403-vazio, retry, paginação,
      `data_modificacao`, fix de encoding) — GET only nesta etapa
- [x] 1.2 Migration do espelho de CATÁLOGOS (`supabase/vhsys_espelho_catalogos.sql`:
      produtos, clientes, vendedores, sync_estado) — **pendente rodar no SQL Editor**.
      Pedidos/orçamentos/situações: aguardando aprovação do achado da Parte A
- [x] 1.3 Sync de catálogos (`src/lib/vhsys/sync.ts`): pull inicial + incremental por
      `data_modificacao` + reconciliação completa com lixeira
- [ ] 1.4 Webhook receiver `/api/vhsys/webhook` (clientes/produtos/contas_receber) + validação + runbook do relogin
- [x] 1.5 Esqueleto do polling: rota `/api/cron/vhsys-sync` (Bearer CRON_SECRET; `?modo=completo`
      p/ reconciliação) + isenção no middleware — agendamento Vercel/externo a decidir (plano Hobby
      limita cron a 1×/dia)

## Fase 2 — Orçamentos
- [x] 2.1 Tipos + tabela espelho (`vhsys_orcamentos`, sync ativo)
- [x] 2.2 Listagem `/orcamentos` (leitura): filtros por situação + busca de cliente + paginação
      na URL (filtros avançados completos ficam na Fase 5)
- [ ] 2.3 Form de cadastro com autocomplete de produtos VHSYS — ESCRITA, aguardando autorização
- [ ] 2.4 Outbound criar/atualizar/excluir — ESCRITA, aguardando autorização
- [ ] 2.5 Ação "Emitir pedido" — ESCRITA, aguardando autorização

## Lacuna NF-e (saldo) — RESOLVIDA no modelo (2026-06-11)
- [x] Descoberta read-only: conta `NFe_<id_venda>` → NF-e (`id_venda`) → `id_pedido_ref` (id_ped)
- [x] `supabase/vhsys_notas_fiscais.sql` (tabela + coluna `nfe_id_vhsys` nas contas + view
      resolvendo pedido direto OU via NF-e) — **pendente rodar no SQL Editor**
- [x] Sync de notas fiscais no motor (incremental por `data_modificacao`)
- [ ] Re-sync + revalidação do saldo (depende do SQL acima)

## Fase 3 — Pedidos (ex-vendas)
- [x] 3.1 Aba Vendas (mock) substituída por Pedidos (espelho real); mock removido
- [x] 3.2 Kanban com colunas dinâmicas das situações reais (858→1179→857→859→1180→777;
      778 fora; segmentos pagamento|entrega; nomes/ordem do espelho `vhsys_situacoes`)
- [ ] 3.3 Mover card → alterar situação no VHSYS → espelho (ESCRITA — deferida até autorização
      + teste em pedido descartável)
- [ ] 3.4 Visão Lista
- [ ] 3.5 Filtros avançados
- [x] 3.6 Pagamento pela situação do pedido via polling; fallback legado (situacao null/0 →
      enum-base, origem='legado'); financeiro display-only (Total/Recebido/Saldo aritmético +
      flag de divergência)

## Fase 4 — Entrega integrada
- [x] 4.1 Gate por situação: habilitada em {1179,857,859,1180,777}, bloqueada em {858,778}
      (escrita situacao→859 ao cadastrar entrega: deferida junto com a fase de escrita)
- [x] 4.2 Pré-preenchimento a partir do pedido (cliente do espelho: cpf/cnpj, bairro, endereço)
- [x] 4.3 Vínculo pedido ↔ entrega (`entregas.pedido_id`, FK na migration do núcleo)
- [ ] 4.4 Fulfillment pós-entrega em Kanban + Lista — dimensão do APP (decisão d3):
      `nao_iniciada → em_separacao → entrega_parcial → entregue`

## Controle de acesso (transversal — decisões fechadas em 2026-06-11)
- [x] Migration segura: role 'vendedor' + `profiles.vendedor_id` + helper
      (`supabase/roles_vendedor.sql`) — **pendente rodar no SQL Editor, após o espelho de catálogos**
- [ ] Tela de admin: criar/editar usuário, definir role e vincular vendedor_id (mapeamento manual;
      sem endpoint de usuários na API VHSYS)
- [ ] FK `entregas.pedido_id → vhsys_pedidos` (junto com o espelho de pedidos — Fase 3/4)
- [ ] `supabase/rls_restritivo.sql`: policies por role (pedidos/orçamentos por vendedor_id;
      entregas via join; profiles próprio registro) — **só ativar com ≥1 admin mapeado (guardrail
      anti-lockout)**
- [ ] Escrita futura: vendedor cria pedido/orçamento com o próprio vendedor_id; admin para qualquer um

## Fase 5 — Filtros, navegação e polimento
- [ ] 5.1 Componente de filtros reutilizável com persistência na URL
- [ ] 5.2 Sidebar: Orçamentos, Pedidos
- [ ] 5.3 Estados de loading/erro/realtime
- [ ] 5.4 Teste do fluxo orçamento → pedido → pagamento → entrega → entregue

## Definition of Done (todas as fases)
- Tokens só server-side; nenhuma chamada VHSYS no client
- Cada endpoint usado tem entrada em `API_NOTES.md`
- `npm run build` + `npm run lint` verdes ao fim de cada fase
- Não quebrar auth/middleware/dashboard/entregas existentes
