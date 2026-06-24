# Migrations — Supabase

Execute os arquivos **em ordem numérica** no Supabase SQL Editor. Todos são
**idempotentes** (`create … if not exists`, `create or replace`, `drop … if
exists` antes de cada `create policy`), então podem ser reaplicados sem efeito
colateral — útil para provisionar um banco novo do zero.

## Ordem e dependências

| # | Arquivo | O que faz |
|---|---------|-----------|
| 0001 | `setup` | `profiles`, `entregas`, bucket de anexos, trigger de novo usuário, `is_admin()` |
| 0002 | `make_bucket_public` | Bucket de anexos público |
| 0003 | `add_ordem_column` | `entregas.ordem` |
| 0004 | `add_periodo_noite` | Turno "noite" em `entregas.periodo` |
| 0005 | `entrega_anexos_e_vinculo` | Tabela `entrega_anexos` + vínculos |
| 0006 | `entregas_marcar_entregue` | `entregas.entregue_em/entregue_por` |
| 0007 | `vhsys_espelho_catalogos` | `vhsys_produtos/clientes/vendedores` + `vhsys_sync_estado` |
| 0008 | `vhsys_espelho_nucleo` | `vhsys_situacoes/pedidos/orcamentos/contas_receber` + view financeira |
| 0009 | `vhsys_vinculo_contas_fix` | Colunas de vínculo conta↔pedido |
| 0010 | `vhsys_notas_fiscais` | `vhsys_notas_fiscais` + ajustes |
| 0011 | `vhsys_pedido_resolvido` | `pedido_resolvido` + view reescrita + reconciliação |
| 0012 | `pedidos_data_situacao` | `vhsys_pedidos.data_situacao` |
| 0013 | `indices_perf` | Índices de performance (pg_trgm) |
| 0014 | `rpc_metricas` | RPCs `pedidos_metricas` / `orcamentos_metricas` |
| 0015 | `roles_vendedor` | Role `vendedor` + `profiles.vendedor_id` |
| 0016 | `rls_vendedor_visibilidade` | RLS restritiva por vendedor |
| 0017 | `fix_rls_recursion` | Corrige recursão de RLS em `profiles`/`entregas` |
| 0018 | `superadmin_e_config` | Role `superadmin` |
| **0019** | **`accounts`** | **Tabela `accounts` (multi-conta, credenciais cifradas)** |
| **0020** | **`multiconta_espelho`** | **`conta_id` em todo o espelho + RLS restritiva por conta + view/reconciliação conta-aware + `conta_id_do_usuario()`** |
| **0021** | **`multiconta_rpc_metricas`** | **RPCs de métricas com `p_conta_id`** |
| **0022** | **`role_owner`** | **Role `owner` (gere contas no CRM, acesso separado) — não é admin operacional** |
| **0023** | **`nome_login_unico`** | **Índice único `lower(nome)` em profiles (login por nome; superadmins de contas distintas usam sufixo)** |

As migrations **0019–0021** habilitam o multi-conta. Pré-requisito de runtime:
`APP_MASTER_KEY` no ambiente e `scripts/seed-accounts.ts` rodado para popular
`accounts`.

## Notas de isolamento (multi-conta)

- A unicidade de `id_vhsys` passou de **global** para **composta** `(conta_id, id_vhsys)`.
- A FK `profiles.vendedor_id → vhsys_vendedores(id_vhsys)` foi **removida** (id_vhsys
  deixou de ser único global); o vínculo segue como coluna, usado só como filtro.
- A policy de conta é **RESTRICTIVE**: compõe (AND) com as policies permissivas
  existentes (leitura autenticada / restrição por vendedor), sem afrouxá-las.
- `conta_id_do_usuario()` é a fronteira de **entitlement** (qual conta o usuário pode
  ver). O filtro da **conta ativa** (cookie) é aplicado na camada de aplicação — o RLS
  não enxerga o cookie.
