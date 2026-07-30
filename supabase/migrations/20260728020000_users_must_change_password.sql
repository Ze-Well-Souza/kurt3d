-- Troca de senha provisória obrigatória no primeiro acesso.
-- Usuários criados por um admin recebem senha provisória (flag = true) e são
-- travados na tela de troca de senha até definirem a própria.
-- Nullable com default false: usuários existentes e o super admin (que
-- escolheram a própria senha no setup) não são afetados.
alter table public.users add column if not exists must_change_password boolean not null default false;
