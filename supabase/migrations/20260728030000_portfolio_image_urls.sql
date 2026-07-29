-- Galeria "Nossos trabalhos": até 10 imagens por projeto do portfólio.
-- Já aplicada manualmente em produção em 2026-07-28 (via Management API).
alter table public.portfolio_projects
  add column if not exists image_urls jsonb;
