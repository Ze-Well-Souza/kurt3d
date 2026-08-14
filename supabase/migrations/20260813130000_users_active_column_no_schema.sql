-- A migration 20260731000000_users_active_column.sql adicionou a coluna
-- `active` em users, mas nunca foi consolidada em supabase/schema.sql — o
-- arquivo canonico ficou sem ela. Um banco recriado a partir do
-- schema.sql (via `bun run db:schema:supabase`) nascia sem a coluna que
-- todo o codigo de autenticacao (P0-4) depende para revogar sessao de
-- usuario desativado.
--
-- Efeito real detectado: com a gravacao granular (P0-1), que nao tem mais
-- o fallback silencioso de coluna ausente, qualquer insert/update em
-- `users` (troca de senha, criar/editar/resetar/ativar/desativar usuario)
-- passou a falhar com erro do PostgREST em vez de gravar sem o campo.
--
-- Esta migration so documenta o que schema.sql (editado no mesmo commit)
-- agora aplica de forma idempotente.

alter table public.users add column if not exists active boolean not null default true;
