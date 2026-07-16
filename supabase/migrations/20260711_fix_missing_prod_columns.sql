-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Fix missing production columns
-- Execute this via Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/huvxpxwfqyrlpfzlaozq/sql/new
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Portfolio visibility columns (is_public / published_at)
ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- Legacy projects predate visibility control: keep them visible on the public site
UPDATE public.portfolio_projects
  SET is_public = true, published_at = COALESCE(published_at, created_at)
  WHERE is_public = false AND published_at IS NULL AND created_at < '2026-07-11';

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_public
  ON public.portfolio_projects (is_public, published_at DESC);

-- 2. Orders multi-filament support (filamento_ids JSONB)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS filamento_ids jsonb NULL;

-- 3. Order parts table if not exists (added by another migration)
CREATE TABLE IF NOT EXISTS public.order_parts (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  nome text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  time_minutes double precision NOT NULL,
  grams_per_unit double precision NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  link_projeto text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
