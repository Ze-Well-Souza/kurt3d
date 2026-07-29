-- Adiciona a coluna de impressora atribuída ao pedido (Fila de Impressão).
-- Nullable: pedidos antigos continuam válidos sem impressora definida.
alter table public.orders add column if not exists printer text null;
