# Performance — vhsys_pedidos_financeiro / pedidos_metricas

## 1. Problema

A view `vhsys_pedidos_financeiro` (definida em `supabase/vhsys_notas_fiscais.sql`)
junta os pedidos a um CTE `contas_resolvidas` por:

```sql
coalesce(c.pedido_id_vhsys, nf.pedido_id_vhsys) = p.id_vhsys
```

O `COALESCE(...)` no predicado do join é **não-indexável**: o planner não
consegue usar índice sobre uma expressão calculada por linha, então cai num
**Nested Loop de ~10,9M linhas**. A RPC `pedidos_metricas`, que consome a view,
leva ~28s e **estoura o `statement_timeout`**.

## 2. ANTES (medições capturadas por EXPLAIN ANALYZE)

| Cenário | Tempo | Buffers |
|---|---|---|
| RPC `pedidos_metricas` (últimos 30 dias) | **28.551 ms** | 17,3M |
| View por 50 ids/números | **31.651 ms** | — |
| Agregação interna isolada (sem o join COALESCE) | **9 ms** | — |

A agregação em si é trivial (9ms); todo o custo está no join não-indexável.

## 3. Solução (migration `supabase/vhsys_pedido_resolvido.sql`)

1. **Coluna precomputada** `pedido_resolvido bigint` em `vhsys_contas_receber`,
   guardando `coalesce(pedido_id_vhsys, <pedido da NF via nfe_id_vhsys>)`.
2. **Função `reconciliar_pedido_resolvido()`** = fonte única da verdade do
   cálculo; o backfill e o sync apenas a chamam (nenhum UPDATE duplicado).
3. **Índice parcial** `idx_contas_receber_pedido_resolvido` sobre
   `(pedido_resolvido) where pedido_resolvido is not null and lixeira = false`.
4. **View reescrita** com join direto e indexável
   (`c.pedido_resolvido = p.id_vhsys and c.lixeira = false`), mantendo
   exatamente o mesmo contract de saída (`pedido_id`, `numero`,
   `valor_total_pedido`, `total_contas`, `recebido`, `saldo`, `divergente`).
5. **Reconciliação no sync** (`src/lib/vhsys/sync.ts`): após o loop de
   `ENTIDADES` (contas E notas já upsertadas), chama
   `supabase.rpc("reconciliar_pedido_resolvido")`. Posicionada pós-loop porque
   `contas_receber` sincroniza ANTES de `notas_fiscais`, e o `pedido_resolvido`
   das contas "NFe_" depende da nota já estar presente.

A migration é idempotente e traz um bloco de rollback comentado.

## 4. DEPOIS (medições reais — migration aplicada 2026-06-12)

| Cenário | ANTES | DEPOIS | Ganho |
|---|---:|---:|---:|
| RPC `pedidos_metricas` (30d) | 28.551 ms | **452 ms** | **63×** |
| View por 50 ids/números | 31.651 ms | **160 ms** | **198×** |
| Buffers (RPC) | 17.277.669 | 20.335 | **850×** menos I/O |

Backfill: 3.101/3.411 contas não-lixeira resolvidas (91%); 310 sem vínculo
(contas manuais sem `Ped_`/`NFe_` — lacuna conhecida, ficam com `pedido_resolvido`
null e não entram no índice parcial).

O plano DEPOIS troca o `Nested Loop` de 10,9M por
`Index Scan using idx_contas_receber_pedido_resolvido` com
`Index Cond: (pedido_resolvido = p.id_vhsys)`. Como 452ms < ~8s do
`statement_timeout`, a RPC `pedidos_metricas` agora **completa** — o app deixa de
cair no fallback de lotes.

> Nota: a view ainda agrega os ~3.210 pedidos por chamada (GroupAggregate); com o
> join indexado isso custa ~70ms (era ~31s). Micro-otimização futura possível
> (empurrar o filtro de pedidos para dentro da agregação), mas hoje é irrelevante.

### 4.1 RPC `pedidos_metricas`

```sql
begin;
set local statement_timeout = '120s';
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', id, 'role', 'authenticated')::text
     from public.profiles where role = 'admin' limit 1),
  true);
set local role authenticated;
explain (analyze, buffers, verbose)
select * from public.pedidos_metricas(
  null, null, null, null, true, false,
  (current_date - interval '30 days')::date, current_date);
rollback;
```

Resultado: `Function Scan on pedidos_metricas (actual time=452.277..452.279 rows=1)`,
`Buffers: shared hit=20335`, **Execution Time: 452.374 ms** (era 28.551 ms).

### 4.2 View `vhsys_pedidos_financeiro` por 50 números

```sql
begin;
set local statement_timeout = '120s';
select set_config(
  'request.jwt.claims',
  (select json_build_object('sub', id, 'role', 'authenticated')::text
     from public.profiles where role = 'admin' limit 1),
  true);
set local role authenticated;
explain (analyze, buffers, verbose)
select * from public.vhsys_pedidos_financeiro
where numero in (
  select numero from public.vhsys_pedidos
  where lixeira = false order by numero desc limit 50);
rollback;
```

Resultado: `Index Scan using idx_contas_receber_pedido_resolvido on
vhsys_contas_receber c` (`Index Cond: pedido_resolvido = p.id_vhsys`, 0.003ms/loop),
`Buffers: shared hit=25231`, **Execution Time: 160.401 ms** (era 31.651 ms). O
`Nested Loop` com 10,9M linhas removidas desapareceu.
