-- Torna o bucket 'anexos-entregas' público para que getPublicUrl() funcione.
-- Rode no SQL Editor do Supabase.

update storage.buckets
set public = true
where id = 'anexos-entregas';

-- Policy de leitura por autenticado vira redundante com bucket público; remove.
drop policy if exists "Autenticados podem ler anexos" on storage.objects;
