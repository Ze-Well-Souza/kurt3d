-- Rate limit de login persistente: em serverless (Vercel) cada instância tem
-- memória própria, então a proteção contra força bruta precisa de um
-- armazenamento compartilhado. RLS habilitado sem policies = acesso apenas
-- via service role (servidor).
create table if not exists public.login_rate_limits (
  key text primary key,
  count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.login_rate_limits enable row level security;
