alter table public.insumos
  add column if not exists payment_id text null;

create table if not exists public.insumo_payments (
  id text primary key,
  insumo_id text not null references public.insumos(id) on delete cascade,
  forma_pagamento text not null,
  custo_total double precision not null,
  parcelas integer not null default 1,
  data_para_pagamento date null,
  created_at timestamptz not null default now()
);

create table if not exists public.insumo_payment_installments (
  id text primary key,
  payment_id text not null references public.insumo_payments(id) on delete cascade,
  numero integer not null,
  valor double precision not null,
  vencimento date not null,
  pago boolean not null default false,
  data_pagamento date null,
  valor_pago double precision null,
  observacao text null
);

create index if not exists idx_insumo_payments_insumo on public.insumo_payments(insumo_id);
create index if not exists idx_insumo_installments_payment on public.insumo_payment_installments(payment_id);
create index if not exists idx_insumo_installments_vencimento on public.insumo_payment_installments(vencimento);
