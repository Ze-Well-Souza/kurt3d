-- ─────────────────────────────────────────────────────────────────────────────
-- FLUXO DE CAIXA — Registro de pagamentos recebidos por pedido
-- ─────────────────────────────────────────────────────────────────────────────
-- Cada linha representa uma entrada de dinheiro (Pix/Dinheiro/etc.) que o sócio
-- recebe do cliente, vinculada a um pedido. Permite pagamentos parciais
-- (várias linhas para o mesmo order_id) e auditoria diária/semanal.
create table if not exists public.order_payments (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  valor double precision not null,
  metodo text not null default 'Pix',
  data date not null,
  observacao text null,
  registrado_por text null,
  created_at timestamptz not null default now()
);

-- Índices para as consultas de resumo por período e por pedido.
create index if not exists idx_order_payments_data on public.order_payments(data desc);
create index if not exists idx_order_payments_order on public.order_payments(order_id);
