-- Adiciona coluna active para soft-delete de usuarios (inativacao sem remover do banco).
-- Usuarios inativos nao conseguem logar, mas permanecem visiveis no painel admin.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'active'
  ) then
    alter table public.users add column active boolean not null default true;
  end if;
end
$$;
