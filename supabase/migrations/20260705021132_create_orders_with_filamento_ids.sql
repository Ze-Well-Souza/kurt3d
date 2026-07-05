/*
# Create orders table with filamento_ids support

1. New Tables
   - `orders` — stores production orders
     - All standard columns (id, client, project_name, quantity, time_minutes, status, etc.)
     - `filamento_ids` (jsonb, nullable) — array of filament IDs for multi-filament orders

2. Important Notes
   - Creates the orders table if it doesn't exist
   - Adds the filamento_ids column for multi-filament support
   - Includes indexes for common queries
*/

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  client text NOT NULL,
  project_name text NOT NULL,
  quantity integer NOT NULL,
  time_minutes double precision NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  portfolio_project_id text NULL,
  filamento_id text NULL,
  filamento_ids jsonb NULL,
  grams_per_unit double precision NULL,
  valor_recebido double precision NULL,
  destino text NULL,
  link_projeto text NULL,
  multi_part boolean NULL DEFAULT false,
  preco_venda double precision NULL,
  forma_pagamento text NULL,
  data_pagamento text NULL,
  client_id text NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
