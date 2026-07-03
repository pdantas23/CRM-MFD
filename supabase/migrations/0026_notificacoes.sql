-- ============================================================
-- NOTIFICAÇÕES persistidas, por conta, direcionadas por PAPEL.
--   - pedido_emitido    → financeiro + superadmin (pedido chega em aguardando pgto)
--   - pagamento_aprovado → admin + superadmin (libera cadastro de entrega)
-- "Lida/não lida" é por usuário via profiles.notificacoes_vistas_em (marcador).
-- Escrita só por service role (server actions / sync) — sem policy de INSERT.
-- Idempotente. Rode DEPOIS de 0025, no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references public.accounts(id),
  tipo text not null check (tipo in ('pedido_emitido', 'pagamento_aprovado')),
  -- Papéis que devem ver esta notificação (ex.: {financeiro,superadmin}).
  roles_alvo text[] not null,
  pedido_id_vhsys bigint,
  pedido_numero integer,
  nome_cliente text,
  -- Quem causou o evento (emissor/aprovador). null = origem VHSYS (sync).
  ator_user_id uuid,
  ator_nome text,
  created_at timestamptz not null default now()
);

-- Dedupe: uma notificação por (conta, tipo, pedido). NULLs são distintos, então
-- não bloqueia tipos futuros sem pedido vinculado.
create unique index if not exists notificacoes_pedido_uidx
  on public.notificacoes (conta_id, tipo, pedido_id_vhsys);
create index if not exists notificacoes_conta_created_idx
  on public.notificacoes (conta_id, created_at desc);

alter table public.notificacoes enable row level security;

-- Leitura: só quem tem o papel alvo.
drop policy if exists "Ve notificacoes do seu papel" on public.notificacoes;
create policy "Ve notificacoes do seu papel"
  on public.notificacoes for select
  using (
    auth.role() = 'authenticated'
    and public.role_do_usuario(auth.uid()) = any (roles_alvo)
  );

-- Isolamento por conta (RESTRICTIVE): pinado → só a sua; sem pino → todas.
drop policy if exists "conta_restritiva_notificacoes" on public.notificacoes;
create policy "conta_restritiva_notificacoes"
  on public.notificacoes as restrictive for select
  using (
    public.conta_id_do_usuario(auth.uid()) is null
    or conta_id = public.conta_id_do_usuario(auth.uid())
  );

-- Marcador "última vez que vi notificações" (badge de não lidas por usuário).
alter table public.profiles
  add column if not exists notificacoes_vistas_em timestamptz;
-- ============================================================
