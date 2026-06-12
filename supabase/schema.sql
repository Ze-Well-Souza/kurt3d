create table if not exists public.users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.filamentos (
  id text primary key,
  sku text not null unique,
  marca text not null,
  cor text not null,
  material text not null,
  peso_inicial double precision not null,
  peso_atual double precision not null,
  preco_pago double precision not null,
  data_compra text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  client text not null,
  project_name text not null,
  quantity integer not null,
  time_minutes double precision not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  portfolio_project_id text null,
  filamento_id text null,
  grams_per_unit double precision null,
  valor_recebido double precision null,
  destino text null
);

create table if not exists public.portfolio_projects (
  id text primary key,
  nome text not null,
  categoria text not null,
  link_modelo text null,
  filamento_id text null,
  custo_rolo double precision not null,
  peso_rolo double precision not null,
  peso_peca double precision not null,
  tempo_min double precision not null,
  quantidade integer not null,
  preco_venda double precision not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.insumos (
  id text primary key,
  nome text not null,
  data_compra text not null,
  quantidade text not null,
  preco_total double precision not null
);

create table if not exists public.vendas (
  id text primary key,
  order_id text not null,
  project_name text not null,
  client text not null,
  valor double precision not null,
  custo double precision not null,
  depreciacao double precision not null,
  data timestamptz not null
);

create table if not exists public.inventory_txns (
  id text primary key,
  filament_id text not null,
  order_id text not null,
  type text not null,
  grams double precision not null,
  created_at timestamptz not null
);

create table if not exists public.expenses (
  id text primary key,
  source text not null,
  ref_id text not null,
  valor double precision not null,
  data text not null,
  descricao text not null
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_inventory_txns_film_order on public.inventory_txns(filament_id, order_id);
create index if not exists idx_vendas_data on public.vendas(data desc);
create index if not exists idx_expenses_data on public.expenses(data desc);
