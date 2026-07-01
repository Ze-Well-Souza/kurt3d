create table if not exists public.users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  phone text null,
  nome text null,
  role text not null default 'admin',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'filamento_qualidade'
  ) then
    create type public.filamento_qualidade as enum ('Ótimo', 'bom', 'médio', 'ruim');
  end if;
end
$$;

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
  data_entrega text null,
  data_fim text null,
  qualidade public.filamento_qualidade null,
  observacao text null,
  comentario text null,
  link_produto text null,
  created_at timestamptz not null default now()
);

create table if not exists public.filamentos_history (
  id text primary key,
  sku text not null,
  marca text not null,
  cor text not null,
  material text not null,
  peso_inicial double precision not null,
  peso_atual double precision not null,
  preco_pago double precision not null,
  data_compra text not null,
  data_entrega text null,
  data_fim text null,
  qualidade public.filamento_qualidade null,
  observacao text null,
  comentario text null,
  link_produto text null,
  arquivado_at timestamptz not null default now()
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
  destino text null,
  link_projeto text null,
  multi_part boolean null default false,
  preco_venda double precision null,
  forma_pagamento text null,
  data_pagamento text null,
  client_id text null
);

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
  perda_percent double precision null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.insumos (
  id text primary key,
  nome text not null,
  data_compra text not null,
  quantidade text not null,
  preco_total double precision not null,
  link_produto text null,
  payment_id text null,
  classificacao_financeira text not null default 'operacional'
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
  descricao text not null,
  categoria text null
);

create table if not exists public.leads (
  id text primary key,
  nome text not null,
  whatsapp text not null,
  mensagem text not null,
  link_projeto text null,
  imagens jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  nome text not null,
  whatsapp text null,
  email text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id text primary key default 'main',
  studio_nome text not null default 'Kurti 3D',
  impressora_modelo text not null default 'Bambu Lab A1',
  consumo_kw double precision not null default 0.095,
  tarifa_energia_kwh double precision not null default 0.75,
  depreciacao_hora double precision not null default 0.70,
  custo_fixo_unidade double precision not null default 0.20,
  default_peso_rolo double precision not null default 1000,
  default_quantidade integer not null default 10,
  whatsapp_numero text not null default '5511999999999',
  check (id = 'main')
);

insert into public.app_settings (id) values ('main') on conflict (id) do nothing;

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_parts_order on public.order_parts(order_id, position);
create index if not exists idx_order_parts_status on public.order_parts(status);
create index if not exists idx_inventory_txns_film_order on public.inventory_txns(filament_id, order_id);
create index if not exists idx_vendas_data on public.vendas(data desc);
create index if not exists idx_expenses_data on public.expenses(data desc);
create index if not exists idx_filamentos_history_arquivado on public.filamentos_history(arquivado_at desc);
create table if not exists public.site_content (
  id text primary key default 'main',
  content jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.site_content (id) values ('main') on conflict (id) do nothing;

create index if not exists idx_leads_created_at on public.leads(created_at desc);
create index if not exists idx_clients_nome on public.clients(nome);

-- Backwards-compatible column additions for existing leads table
alter table public.leads add column if not exists link_projeto text null;
alter table public.leads add column if not exists imagens jsonb null;

-- ═══════════ Filament payment tracking (batch-level) ═══════════
create table if not exists public.filamento_payments (
  id text primary key,
  batch_id text not null,
  forma_pagamento text not null,
  custo_total double precision not null,
  parcelas integer not null default 1,
  data_para_pagamento date null,
  created_at timestamptz not null default now()
);

create table if not exists public.filamento_payment_installments (
  id text primary key,
  payment_id text not null references public.filamento_payments(id) on delete cascade,
  numero integer not null,
  valor double precision not null,
  vencimento date not null,
  pago boolean not null default false,
  data_pagamento date null,
  valor_pago double precision null,
  observacao text null
);

create index if not exists idx_filamento_payments_batch on public.filamento_payments(batch_id);
create index if not exists idx_filamento_installments_payment on public.filamento_payment_installments(payment_id);
create index if not exists idx_filamento_installments_vencimento on public.filamento_payment_installments(vencimento);

-- Backwards-compatible additions for existing filamentos table
alter table public.filamentos add column if not exists batch_id text null;
alter table public.filamentos add column if not exists payment_id text null;
alter table public.filamentos_history add column if not exists batch_id text null;
alter table public.filamentos_history add column if not exists payment_id text null;

-- ═══════════ Supplies payment tracking (item-level) ═══════════
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

-- ═══════════ Production Calendar ═══════════
create table if not exists public.production_calendar (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  title text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  printer_name text not null default 'Bambu Lab A1',
  status text not null default 'scheduled',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_calendar_dates on public.production_calendar(start_date, end_date);
create index if not exists idx_production_calendar_order on public.production_calendar(order_id);

-- ═══════════ Portfolio Videos/Reels ═══════════
create table if not exists public.portfolio_videos (
  id text primary key,
  project_id text null references public.portfolio_projects(id) on delete set null,
  title text not null,
  description text null,
  video_url text not null,
  thumbnail_url text null,
  platform text not null default 'youtube',
  duration_seconds integer null,
  views_count integer null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_videos_project on public.portfolio_videos(project_id);
create index if not exists idx_portfolio_videos_featured on public.portfolio_videos(featured) where featured = true;

-- ═══════════ Report Templates & Saved Reports ═══════════
create table if not exists public.saved_reports (
  id text primary key,
  name text not null,
  type text not null,
  config jsonb not null default '{}',
  filters jsonb null,
  created_by text null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_reports_type on public.saved_reports(type);

-- ═══════════ Budget Quotes (Orçamentos) ═══════════
create table if not exists public.budget_quotes (
  id text primary key,
  client_name text not null,
  client_contact text null,
  client_email text null,
  items jsonb not null default '[]',
  subtotal double precision not null default 0,
  discount_percent double precision null default 0,
  total double precision not null,
  validity_days integer not null default 7,
  status text not null default 'draft',
  notes text null,
  pdf_url text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  converted_to_order_id text null references public.orders(id) on delete set null
);

create index if not exists idx_budget_quotes_status on public.budget_quotes(status);
create index if not exists idx_budget_quotes_expires on public.budget_quotes(expires_at);
