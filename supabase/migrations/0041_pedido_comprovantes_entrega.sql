-- ============================================================
-- COMPROVANTES DE ENTREGA DO PEDIDO (2026-10-29)
--
-- Quando o pedido está "Entregue", dá para anexar documentos que comprovam
-- que o cliente recebeu (canhoto assinado, foto, PDF). Fotos são COMPRIMIDAS
-- no navegador antes do envio (máx. 1600 px, JPEG ~70%); PDFs sobem como estão
-- (até 5 MB). Os arquivos ficam no bucket PRIVADO 'comprovantes-entrega'
-- (acesso só por URL assinada do servidor); a tabela guarda só caminho/nome.
--
-- pedido_id → vhsys_pedidos.id (on delete set null); conta_id e pedido_numero
-- ficam copiados para o comprovante sobreviver a uma limpeza do espelho.
--
-- RLS ligado e SEM policies: só o service role, via server actions que checam
-- o papel (admin/superadmin/financeiro/vendedor — vendedor só nos pedidos dele).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.pedido_comprovantes (
  id             uuid primary key default gen_random_uuid(),
  conta_id       uuid references public.accounts (id) on delete set null,
  pedido_id      uuid references public.vhsys_pedidos (id) on delete set null,
  pedido_numero  bigint,
  path           text not null,            -- caminho no bucket comprovantes-entrega
  nome           text,                     -- nome original do arquivo
  tamanho        integer,                  -- bytes, já comprimido
  criado_em      timestamptz not null default now(),
  criado_por     uuid references auth.users (id) on delete set null
);

create index if not exists pedido_comprovantes_pedido_idx on public.pedido_comprovantes (pedido_id);

alter table public.pedido_comprovantes enable row level security;

insert into storage.buckets (id, name, public)
values ('comprovantes-entrega', 'comprovantes-entrega', false)
on conflict (id) do update set public = false;

notify pgrst, 'reload schema';
