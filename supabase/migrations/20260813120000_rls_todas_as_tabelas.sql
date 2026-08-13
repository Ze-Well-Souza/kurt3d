-- ═══════════════════════════════════════════════════════════════════════════
-- P0-3 — Row Level Security em todas as tabelas do schema public
-- ═══════════════════════════════════════════════════════════════════════════
-- A migration 20260624171746 habilitou RLS numa lista fixa de 15 tabelas.
-- Toda tabela criada depois disso (receipts, order_payments, insumo_payments,
-- budget_quotes, ...) dependeu de alguem lembrar de repetir o passo — e
-- `supabase/schema.sql`, o arquivo canonico, nunca teve bloco de RLS nenhum.
--
-- Esta migration troca a lista fixa por uma varredura: qualquer tabela em
-- public passa a ter RLS. Idempotente e segura de reexecutar.
--
-- Por que isso protege: a chave anonima do Supabase e publicada no bundle do
-- site (VITE_SUPABASE_PUBLISHABLE_KEY). Sem RLS, qualquer visitante le e
-- escreve a tabela pelo PostgREST. Com RLS ligado e nenhuma policy, anon e
-- authenticated sao negados por padrao; o service_role (usado apenas no
-- servidor) ignora RLS e continua funcionando normalmente.
--
-- Policies existentes sao preservadas: portfolio_videos mantem a leitura
-- publica dos videos em destaque, que e intencional.

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('grant all on public.%I to service_role', t.relname);
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end
$$;

-- Revoga o acesso direto dos papeis publicos. RLS ja bloqueia, mas remover o
-- grant e a segunda camada: se algum dia uma policy permissiva for criada por
-- engano, o privilegio de tabela ainda barra.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('revoke all on public.%I from anon, authenticated', t.relname);
  end loop;
end
$$;

-- portfolio_videos tem leitura publica intencional (videos em destaque, via a
-- policy "Public can view featured videos"). Devolve apenas SELECT — antes os
-- papeis publicos tinham INSERT/UPDATE/DELETE/TRUNCATE, barrados so pelo RLS.
grant select on public.portfolio_videos to anon, authenticated;
