-- Onde a compra foi feita (Shopee, Mercado Livre, Amazon, TikTok Shop, loja
-- fisica...). Texto livre e nao obrigatorio: a lista de marketplaces muda
-- demais para virar enum, e os registros ja cadastrados ficam nulos ate serem
-- preenchidos manualmente.
alter table public.filamentos add column if not exists onde_comprou text null;
alter table public.filamentos_history add column if not exists onde_comprou text null;
alter table public.insumos add column if not exists onde_comprou text null;
