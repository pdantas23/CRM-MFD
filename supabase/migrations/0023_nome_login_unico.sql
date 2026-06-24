-- ============================================================
-- Nome de login ÚNICO (case-insensitive). O login é por nome (não por e-mail),
-- então dois perfis com o mesmo nome quebrariam a resolução. Superadmins de
-- contas diferentes usam nomes distintos (ex.: sandro-sa, sandro-kcm).
-- Idempotente; só cria o índice se não houver duplicados pré-existentes.
-- ============================================================

do $$
begin
  if exists (
    select 1 from public.profiles group by lower(nome) having count(*) > 1
  ) then
    raise warning 'profiles.nome tem duplicados (case-insensitive) — índice único NÃO criado. Resolva os nomes e rode novamente.';
  else
    create unique index if not exists profiles_nome_lower_uidx
      on public.profiles (lower(nome));
  end if;
end $$;
