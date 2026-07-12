-- ═══════════════════════════════════════════════════════════════
-- Migration: Data cleanup, date normalization, portfolio images
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════ 1. Add portfolio image support ═══════════
ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS image_url text NULL;

COMMENT ON COLUMN public.portfolio_projects.image_url IS
  'Public URL of the project photo stored in Supabase Storage';

-- ═══════════ 2. Normalize date columns (TEXT → DATE) ═══════════
-- Filamentos date columns
ALTER TABLE public.filamentos
  ALTER COLUMN data_compra TYPE date USING data_compra::date,
  ALTER COLUMN data_entrega TYPE date USING data_entrega::date,
  ALTER COLUMN data_fim TYPE date USING data_fim::date;

ALTER TABLE public.filamentos_history
  ALTER COLUMN data_compra TYPE date USING data_compra::date,
  ALTER COLUMN data_entrega TYPE date USING data_entrega::date,
  ALTER COLUMN data_fim TYPE date USING data_fim::date;

-- Orders date column
ALTER TABLE public.orders
  ALTER COLUMN data_pagamento TYPE date USING data_pagamento::date;

-- Expenses date column
ALTER TABLE public.expenses
  ALTER COLUMN data TYPE date USING data::date;

-- Insumos date column
ALTER TABLE public.insumos
  ALTER COLUMN data_compra TYPE date USING data_compra::date;

-- ═══════════ 3. Drop duplicated comentario column ═══════════
-- observacao and comentario were treated as interchangeable.
-- We keep observacao only (the domain type uses observacao with comentario fallback).
ALTER TABLE public.filamentos
  DROP COLUMN IF EXISTS comentario;

ALTER TABLE public.filamentos_history
  DROP COLUMN IF EXISTS comentario;

-- ═══════════ 4. Create portfolio-images storage bucket ═══════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880, -- 5MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read access
CREATE POLICY "portfolio_images_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

-- RLS: authenticated insert only (via admin service_role)
CREATE POLICY "portfolio_images_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.role() = 'authenticated'
  );

-- RLS: authenticated delete only
CREATE POLICY "portfolio_images_auth_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.role() = 'authenticated'
  );

-- ═══════════ 5. Lead images cleanup: add index for cleanup queries ═══════════
CREATE INDEX IF NOT EXISTS idx_leads_created_at_cleanup
  ON public.leads(created_at DESC);

COMMIT;
