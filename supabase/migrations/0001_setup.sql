-- ============================================================
-- SETUP COMPLETO — rode no Supabase SQL Editor (em ordem)
-- ============================================================

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  role text not null check (role in ('admin', 'entregador')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Função helper: checa se um uuid corresponde a um admin.
-- SECURITY DEFINER bypassa RLS aqui — sem isso, qualquer policy que
-- consulte profiles entra em recursão infinita (erro 42P17).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

drop policy if exists "Usuário vê o próprio perfil" on public.profiles;
create policy "Usuário vê o próprio perfil" on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admin vê todos os profiles" on public.profiles;
create policy "Admin vê todos os profiles" on public.profiles for select
  using (public.is_admin(auth.uid()));

-- Trigger: cria profile automaticamente ao criar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'entregador')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ENTREGAS
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  periodo text not null check (periodo in ('manha', 'tarde')),
  status text not null check (status in ('entrega_final', 'entrega_parcial')),
  nome_cliente text not null,
  cpf_cnpj text not null,
  numero_orcamento text not null,
  bairro text not null,
  endereco text not null,
  anexo_url text,
  anexo_nome text,
  ordem integer,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

create index if not exists entregas_data_idx on public.entregas (data);
create index if not exists entregas_data_periodo_ordem_idx
  on public.entregas (data, periodo, ordem nulls last, created_at);

alter table public.entregas enable row level security;

drop policy if exists "Todos autenticados podem ver" on public.entregas;
create policy "Todos autenticados podem ver" on public.entregas for select
  using (auth.role() = 'authenticated');

drop policy if exists "Só admin insere" on public.entregas;
create policy "Só admin insere" on public.entregas for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Só admin atualiza" on public.entregas;
create policy "Só admin atualiza" on public.entregas for update
  using (public.is_admin(auth.uid()));

drop policy if exists "Só admin deleta" on public.entregas;
create policy "Só admin deleta" on public.entregas for delete
  using (public.is_admin(auth.uid()));


-- 3. STORAGE
-- Bucket público: o app usa getPublicUrl() e os anexos são abertos
-- direto via <a href>. URLs contêm UUID da entrega + timestamp.
insert into storage.buckets (id, name, public)
values ('anexos-entregas', 'anexos-entregas', true)
on conflict (id) do nothing;

drop policy if exists "Admin faz upload" on storage.objects;
create policy "Admin faz upload" on storage.objects for insert
  with check (
    bucket_id = 'anexos-entregas'
    and public.is_admin(auth.uid())
  );

drop policy if exists "Admin deleta" on storage.objects;
create policy "Admin deleta" on storage.objects for delete
  using (
    bucket_id = 'anexos-entregas'
    and public.is_admin(auth.uid())
  );


-- ============================================================
-- COMO CRIAR USUÁRIOS MANUALMENTE (via SQL ou Auth Dashboard)
-- ============================================================
-- Opção A: pelo painel do Supabase → Authentication → Users → Add User
--   Depois atualize o perfil:
--   UPDATE public.profiles SET nome = 'Fulano', role = 'admin' WHERE id = '<uuid>';
--
-- Opção B: via trigger (já configurado acima)
--   Ao criar usuário passe: { "nome": "Fulano", "role": "admin" } em raw_user_meta_data
-- ============================================================
