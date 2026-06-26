create table if not exists public.order_parts (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  nome text not null,
  position integer not null default 0,
  quantity integer not null default 1,
  time_minutes double precision not null,
  grams_per_unit double precision not null,
  status text not null default 'todo',
  link_projeto text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_order_parts_order on public.order_parts(order_id, position);
create index if not exists idx_order_parts_status on public.order_parts(status);

grant all on public.order_parts to service_role;
alter table public.order_parts enable row level security;
