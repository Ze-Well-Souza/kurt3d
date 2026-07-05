-- ═══════════════════════════════════════════════════════════════
-- Migration: Calculator Multi-Filamento + Custos Extras
-- Adds support for multiple filaments per project, extra costs,
-- labor cost, kWh override, and gateway fee to portfolio_projects.
-- ═══════════════════════════════════════════════════════════════

-- JSONB column: array of filaments used in this project's calculation.
-- Each item has: id (temp), source ("stock"|"manual"), filamentoId (nullable),
-- sku, marca, cor, precoRolo, pesoRolo, pesoUsado (grams used in print).
alter table public.portfolio_projects
  add column if not exists filamentos jsonb not null default '[]';

-- JSONB column: array of extra costs.
-- Each item has: id (temp), nome, custo (unit price), quantidade.
alter table public.portfolio_projects
  add column if not exists custos_extras jsonb not null default '[]';

-- Per-project kWh rate override (R$/kWh).
-- Falls back to app_settings.tarifa_energia_kwh when null.
alter table public.portfolio_projects
  add column if not exists custo_kwh double precision null;

-- Per-project consumption override (kW).
-- Overrides the auto-calculated consumption from the printer preset.
alter table public.portfolio_projects
  add column if not exists consumo_kw double precision null;

-- Labor cost: hours worked.
alter table public.portfolio_projects
  add column if not exists custo_mao_obra_horas double precision null;

-- Labor cost: hourly rate (R$/h).
alter table public.portfolio_projects
  add column if not exists custo_mao_obra_valor_hora double precision null;

-- Marketplace/gateway fee percentage (e.g. 10 for 10%).
alter table public.portfolio_projects
  add column if not exists taxa_gateway double precision null default 0;

-- Add a GIN index for efficient JSONB queries (optional, for future analytics).
create index if not exists idx_portfolio_projects_filamentos
  on public.portfolio_projects using gin (filamentos);
create index if not exists idx_portfolio_projects_custos_extras
  on public.portfolio_projects using gin (custos_extras);
