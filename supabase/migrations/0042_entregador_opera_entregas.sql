-- ============================================================
-- ENTREGADOR OPERA ENTREGAS (2026-10-29)
--
-- O entregador passa a ter, sobre as ENTREGAS, o mesmo poder do admin:
-- cadastrar, editar, excluir, dar baixa e gerenciar anexos. (Leitura de
-- entregas e pedidos ele já tinha — 0018 / 0025.) As policies abaixo são
-- PERMISSIVAS e somam (OR) às de admin já existentes ("Só admin ...").
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- 1. entregas
drop policy if exists "Entregador insere entregas" on public.entregas;
create policy "Entregador insere entregas" on public.entregas for insert
  with check (public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador atualiza entregas" on public.entregas;
create policy "Entregador atualiza entregas" on public.entregas for update
  using (public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador deleta entregas" on public.entregas;
create policy "Entregador deleta entregas" on public.entregas for delete
  using (public.role_do_usuario(auth.uid()) = 'entregador');

-- 2. entrega_anexos
drop policy if exists "Entregador insere anexos" on public.entrega_anexos;
create policy "Entregador insere anexos" on public.entrega_anexos for insert
  with check (public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador atualiza anexos" on public.entrega_anexos;
create policy "Entregador atualiza anexos" on public.entrega_anexos for update
  using (public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador deleta anexos" on public.entrega_anexos;
create policy "Entregador deleta anexos" on public.entrega_anexos for delete
  using (public.role_do_usuario(auth.uid()) = 'entregador');

-- 3. Storage do bucket 'anexos-entregas' (upload usa upsert → também UPDATE)
drop policy if exists "Entregador faz upload" on storage.objects;
create policy "Entregador faz upload" on storage.objects for insert
  with check (bucket_id = 'anexos-entregas' and public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador atualiza arquivo" on storage.objects;
create policy "Entregador atualiza arquivo" on storage.objects for update
  using (bucket_id = 'anexos-entregas' and public.role_do_usuario(auth.uid()) = 'entregador');

drop policy if exists "Entregador deleta arquivo" on storage.objects;
create policy "Entregador deleta arquivo" on storage.objects for delete
  using (bucket_id = 'anexos-entregas' and public.role_do_usuario(auth.uid()) = 'entregador');
