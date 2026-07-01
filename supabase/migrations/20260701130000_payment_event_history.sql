create table if not exists public.filamento_payment_events (
  id text primary key,
  installment_id text not null references public.filamento_payment_installments(id) on delete cascade,
  payment_id text not null references public.filamento_payments(id) on delete cascade,
  tipo text not null check (tipo in ('pagamento', 'estorno')),
  valor double precision not null,
  data_pagamento date not null,
  observacao text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_filamento_payment_events_installment on public.filamento_payment_events(installment_id);
create index if not exists idx_filamento_payment_events_payment on public.filamento_payment_events(payment_id);
create index if not exists idx_filamento_payment_events_data on public.filamento_payment_events(data_pagamento);

create table if not exists public.insumo_payment_events (
  id text primary key,
  installment_id text not null references public.insumo_payment_installments(id) on delete cascade,
  payment_id text not null references public.insumo_payments(id) on delete cascade,
  tipo text not null check (tipo in ('pagamento', 'estorno')),
  valor double precision not null,
  data_pagamento date not null,
  observacao text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_insumo_payment_events_installment on public.insumo_payment_events(installment_id);
create index if not exists idx_insumo_payment_events_payment on public.insumo_payment_events(payment_id);
create index if not exists idx_insumo_payment_events_data on public.insumo_payment_events(data_pagamento);
