-- ================================================
-- Migration: Add visibility control to portfolio_projects
-- ================================================

BEGIN;

-- Add new columns for visibility control
ALTER TABLE portfolio_projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- Migrate existing projects: make them all public with published_at = created_at
UPDATE portfolio_projects
SET is_public = true,
    published_at = created_at
WHERE is_public = false AND published_at IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_is_public 
  ON portfolio_projects(is_public);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_published_at 
  ON portfolio_projects(published_at DESC NULLS LAST)
  WHERE is_public = true;

-- Add documentation comments
COMMENT ON COLUMN portfolio_projects.is_public IS 
  'Controls whether project appears on public landing page';

COMMENT ON COLUMN portfolio_projects.published_at IS 
  'Timestamp when project was first published. Preserved when toggling to private.';

COMMIT;
