do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'filamento_qualidade'
  ) then
    create type public.filamento_qualidade as enum ('Ótimo', 'bom', 'médio', 'ruim');
  end if;
end
$$;

alter table public.filamentos
  add column if not exists observacao text null;

alter table public.filamentos_history
  add column if not exists observacao text null;

update public.filamentos
set observacao = comentario
where observacao is null
  and comentario is not null;

update public.filamentos_history
set observacao = comentario
where observacao is null
  and comentario is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'filamentos'
      and column_name = 'qualidade'
      and udt_name <> 'filamento_qualidade'
  ) then
    execute $sql$
      update public.filamentos
      set qualidade = case
        when qualidade is null then null
        when lower(trim(qualidade::text)) in ('otimo', 'ótimo') then 'Ótimo'
        when lower(trim(qualidade::text)) = 'bom' then 'bom'
        when lower(trim(qualidade::text)) in ('medio', 'médio') then 'médio'
        when lower(trim(qualidade::text)) = 'ruim' then 'ruim'
        else qualidade::text
      end
    $sql$;
    execute $sql$
      alter table public.filamentos
      alter column qualidade type public.filamento_qualidade
      using (
        case
          when qualidade is null then null
          when lower(trim(qualidade::text)) in ('otimo', 'ótimo') then 'Ótimo'::public.filamento_qualidade
          when lower(trim(qualidade::text)) = 'bom' then 'bom'::public.filamento_qualidade
          when lower(trim(qualidade::text)) in ('medio', 'médio') then 'médio'::public.filamento_qualidade
          when lower(trim(qualidade::text)) = 'ruim' then 'ruim'::public.filamento_qualidade
          else null
        end
      )
    $sql$;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'filamentos_history'
      and column_name = 'qualidade'
      and udt_name <> 'filamento_qualidade'
  ) then
    execute $sql$
      update public.filamentos_history
      set qualidade = case
        when qualidade is null then null
        when lower(trim(qualidade::text)) in ('otimo', 'ótimo') then 'Ótimo'
        when lower(trim(qualidade::text)) = 'bom' then 'bom'
        when lower(trim(qualidade::text)) in ('medio', 'médio') then 'médio'
        when lower(trim(qualidade::text)) = 'ruim' then 'ruim'
        else qualidade::text
      end
    $sql$;
    execute $sql$
      alter table public.filamentos_history
      alter column qualidade type public.filamento_qualidade
      using (
        case
          when qualidade is null then null
          when lower(trim(qualidade::text)) in ('otimo', 'ótimo') then 'Ótimo'::public.filamento_qualidade
          when lower(trim(qualidade::text)) = 'bom' then 'bom'::public.filamento_qualidade
          when lower(trim(qualidade::text)) in ('medio', 'médio') then 'médio'::public.filamento_qualidade
          when lower(trim(qualidade::text)) = 'ruim' then 'ruim'::public.filamento_qualidade
          else null
        end
      )
    $sql$;
  end if;
end
$$;
