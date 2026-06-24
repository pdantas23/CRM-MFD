-- ============================================================
-- FIX: recursão infinita nas policies de profiles/entregas
-- ============================================================
-- Problema: a policy "Admin vê todos" em profiles faz SELECT em
-- profiles dentro da própria policy, causando recursão infinita
-- (erro 42P17). As policies de entregas e storage também fazem
-- subselect em profiles e batem no mesmo loop.
--
-- Solução: função SECURITY DEFINER que bypassa RLS ao checar
-- o role. Usada em todas as policies que precisam saber se o
-- usuário é admin.
-- ============================================================

-- 1. Função helper (bypassa RLS via SECURITY DEFINER)
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

-- Garante que anon/authenticated podem chamar a função
grant execute on function public.is_admin(uuid) to anon, authenticated;


-- 2. PROFILES: remove a policy recursiva e recria via is_admin()
drop policy if exists "Admin vê todos" on public.profiles;
drop policy if exists "Admin vê todos os profiles" on public.profiles;

create policy "Admin vê todos os profiles"
  on public.profiles for select
  using (public.is_admin(auth.uid()));


-- 3. ENTREGAS: substitui os subselects por is_admin()
drop policy if exists "Só admin insere" on public.entregas;
drop policy if exists "Só admin atualiza" on public.entregas;
drop policy if exists "Só admin deleta" on public.entregas;

create policy "Só admin insere"
  on public.entregas for insert
  with check (public.is_admin(auth.uid()));

create policy "Só admin atualiza"
  on public.entregas for update
  using (public.is_admin(auth.uid()));

create policy "Só admin deleta"
  on public.entregas for delete
  using (public.is_admin(auth.uid()));


-- 4. STORAGE: mesma substituição nos buckets
drop policy if exists "Admin faz upload" on storage.objects;
drop policy if exists "Admin deleta" on storage.objects;

create policy "Admin faz upload"
  on storage.objects for insert
  with check (
    bucket_id = 'anexos-entregas'
    and public.is_admin(auth.uid())
  );

create policy "Admin deleta"
  on storage.objects for delete
  using (
    bucket_id = 'anexos-entregas'
    and public.is_admin(auth.uid())
  );
