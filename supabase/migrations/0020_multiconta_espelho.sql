-- ============================================================
-- MULTI-CONTA — isolamento por conta_id no espelho VHSYS.
-- Pré-requisito: accounts.sql (tabela public.accounts) já aplicada.
-- Rode DEPOIS de todas as migrations do espelho e de vhsys_pedido_resolvido.sql.
--
-- O que faz (idempotente):
--   1. Adiciona conta_id (FK→accounts) às tabelas-espelho, entregas e profiles.
--   2. Troca a unicidade GLOBAL de id_vhsys por COMPOSTA (conta_id, id_vhsys).
--   3. Backfill automático quando existe exatamente UMA conta.
--   4. Reescreve a view financeira e a reconciliação para serem conta-aware.
--   5. RLS de leitura escopada por conta (entitlement) nas tabelas-espelho.
--   6. vhsys_sync_estado passa a ter cursor por (conta_id, entidade).
--
-- NOTA: a FK profiles.vendedor_id → vhsys_vendedores(id_vhsys) é REMOVIDA porque
-- id_vhsys deixa de ser único globalmente. O vínculo vira coluna simples (já é
-- usado apenas como filtro de visibilidade do vendedor, não para integridade).
-- ============================================================

-- 0. Remover FKs que travam a mudança de unicidade de id_vhsys.
alter table public.profiles drop constraint if exists profiles_vendedor_id_fkey;

-- 1. conta_id + unicidade composta nas tabelas-espelho (loop DRY, idempotente).
do $$
declare
  t            text;
  conta_unica  uuid;
  n_null       bigint;
  tabelas      text[] := array[
    'vhsys_situacoes','vhsys_produtos','vhsys_clientes','vhsys_vendedores',
    'vhsys_pedidos','vhsys_orcamentos','vhsys_contas_receber','vhsys_notas_fiscais'
  ];
begin
  -- Conta única p/ backfill: só quando há EXATAMENTE uma conta cadastrada.
  if (select count(*) from public.accounts) = 1 then
    select id into conta_unica from public.accounts limit 1;
  end if;

  foreach t in array tabelas loop
    -- 1a. coluna conta_id
    execute format(
      'alter table public.%I add column if not exists conta_id uuid references public.accounts(id)', t);

    -- 1b. backfill (single-conta)
    if conta_unica is not null then
      execute format('update public.%I set conta_id = %L where conta_id is null', t, conta_unica);
    end if;

    -- 1c. troca unicidade global → composta (conta_id, id_vhsys)
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_id_vhsys_key');
    execute format(
      'create unique index if not exists %I on public.%I (conta_id, id_vhsys)',
      t || '_conta_idvhsys_uidx', t);

    -- 1d. índice de conta
    execute format('create index if not exists %I on public.%I (conta_id)', t || '_conta_idx', t);

    -- 1e. NOT NULL quando não houver linhas órfãs (seguro p/ multi-conta sem backfill)
    execute format('select count(*) from public.%I where conta_id is null', t) into n_null;
    if n_null = 0 then
      execute format('alter table public.%I alter column conta_id set not null', t);
    end if;
  end loop;
end $$;

-- 2. profiles.conta_id (null = usuário com acesso a todas as contas).
alter table public.profiles add column if not exists conta_id uuid references public.accounts(id);
create index if not exists profiles_conta_id_idx on public.profiles (conta_id);

-- 3. entregas.conta_id (entregas são por conta; app sempre grava conta ativa).
do $$
declare conta_unica uuid;
begin
  alter table public.entregas add column if not exists conta_id uuid references public.accounts(id);
  if (select count(*) from public.accounts) = 1 then
    select id into conta_unica from public.accounts limit 1;
    update public.entregas set conta_id = conta_unica where conta_id is null;
  end if;
end $$;
create index if not exists entregas_conta_id_idx on public.entregas (conta_id);

-- 4. Helper de entitlement: conta à qual o usuário está fixado (null = todas).
create or replace function public.conta_id_do_usuario(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select conta_id from public.profiles where id = uid;
$$;
grant execute on function public.conta_id_do_usuario(uuid) to authenticated;

-- 5. RLS de leitura escopada por conta (entitlement). Usuário fixado a uma conta
--    só lê aquela; usuário sem fixação (null) lê todas (o app estreita pela
--    conta ATIVA do cookie — RLS aqui é a fronteira de entitlement, não o filtro
--    de conta ativa). Escrita no espelho continua só via service role (bypassa RLS).
--    IMPORTANTE: a policy de conta é RESTRICTIVE (AND), não permissive. Assim ela
--    COMPÕE com as policies permissivas existentes (leitura autenticada e/ou a
--    restrição por vendedor de rls_vendedor_visibilidade.sql) em vez de afrouxá-las:
--    visível = (permissivas OR) AND (conta entitlement). NÃO removemos as policies
--    base — apenas adicionamos a trava de conta por cima.
do $$
declare
  t       text;
  tabelas text[] := array[
    'vhsys_situacoes','vhsys_produtos','vhsys_clientes','vhsys_vendedores',
    'vhsys_pedidos','vhsys_orcamentos','vhsys_contas_receber','vhsys_notas_fiscais'
  ];
begin
  foreach t in array tabelas loop
    execute format('drop policy if exists %I on public.%I', 'conta_restritiva_' || t, t);
    -- RESTRICTIVE: pinado a uma conta → só aquela; sem pino (null) → todas
    -- (o app estreita pela conta ativa do cookie).
    execute format($p$
      create policy %I on public.%I as restrictive for select using (
        public.conta_id_do_usuario(auth.uid()) is null
        or conta_id = public.conta_id_do_usuario(auth.uid())
      )
    $p$, 'conta_restritiva_' || t, t);
  end loop;
end $$;

-- 6. View financeira conta-aware. conta_id é ADICIONADA AO FINAL das colunas
--    (mantém create-or-replace válido). O join passa a casar a conta também,
--    evitando somar contas a receber de outra conta com mesmo id_vhsys/numero.
create or replace view public.vhsys_pedidos_financeiro
with (security_invoker = true) as
select
  p.id as pedido_id,
  p.numero,
  p.valor_total as valor_total_pedido,
  coalesce(sum(c.valor), 0)::numeric(14,2) as total_contas,
  coalesce(sum(c.valor_pago), 0)::numeric(14,2) as recebido,
  coalesce(sum(c.valor - c.valor_pago), 0)::numeric(14,2) as saldo,
  (count(c.id) > 0 and coalesce(sum(c.valor), 0) <> coalesce(p.valor_total, 0)) as divergente,
  p.conta_id
from public.vhsys_pedidos p
left join public.vhsys_contas_receber c
  on c.pedido_resolvido = p.id_vhsys
  and c.conta_id = p.conta_id
  and c.lixeira = false
group by p.id, p.numero, p.valor_total, p.conta_id;

-- 7. Reconciliação conta-aware: a busca da NFe pela id_vhsys também casa a conta.
create or replace function public.reconciliar_pedido_resolvido()
returns void
language sql
security definer
set search_path = public
as $$
  update public.vhsys_contas_receber c
  set pedido_resolvido = coalesce(
    c.pedido_id_vhsys,
    (select nf.pedido_id_vhsys from public.vhsys_notas_fiscais nf
      where nf.id_vhsys = c.nfe_id_vhsys
        and nf.conta_id = c.conta_id
        and nf.lixeira = false)
  );
$$;
revoke all on function public.reconciliar_pedido_resolvido() from anon, authenticated;
grant execute on function public.reconciliar_pedido_resolvido() to service_role;

-- 8. Cursor de sync por conta: vhsys_sync_estado passa a ser (conta_id, entidade).
--    vhsys_sync_estado guarda apenas CURSORES efêmeros — é seguro truncar para
--    reconstruir a PK como (conta_id, entidade) sem o impasse "conta_id NULL não
--    pode entrar na PK". O próximo sync refaz os cursores (incremental sem cursor
--    = pull completo da entidade). A PK composta é o alvo do onConflict
--    "conta_id,entidade" usado pelo sync — sem ela, o upsert do cursor falharia.
alter table public.vhsys_sync_estado add column if not exists conta_id uuid references public.accounts(id);
truncate table public.vhsys_sync_estado;
alter table public.vhsys_sync_estado alter column conta_id set not null;
alter table public.vhsys_sync_estado drop constraint if exists vhsys_sync_estado_pkey;
alter table public.vhsys_sync_estado add primary key (conta_id, entidade);
