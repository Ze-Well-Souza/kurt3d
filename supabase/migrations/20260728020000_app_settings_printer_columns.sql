-- Colunas de presets de impressora usadas pela Calculadora / Configurações.
-- Já aplicada manualmente em produção em 2026-07-28 (via Management API).
alter table public.app_settings
  add column if not exists selected_printer_preset text,
  add column if not exists printer_prices jsonb,
  add column if not exists printer_vida_util jsonb;
