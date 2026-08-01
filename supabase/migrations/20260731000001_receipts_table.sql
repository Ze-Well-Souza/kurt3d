-- Tabela de recibos (venda e pagamento)
-- Cada recibo gerado fica salvo com numeração sequencial por dia,
-- permitindo busca e auditoria futura.

CREATE TABLE IF NOT EXISTS public.receipts (
  id text PRIMARY KEY,
  receipt_number text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('sale', 'payment')),
  client_name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL,
  doc_type text,
  doc_number text,
  studio_doc_type text,
  studio_doc_number text,
  forma_pagamento text,
  observacao text,
  paid boolean NOT NULL DEFAULT false,
  source_type text,  -- 'quote' ou 'order'
  source_id text,
  discount_percent numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(client_name);
CREATE INDEX IF NOT EXISTS idx_receipts_created ON public.receipts(created_at);

COMMENT ON TABLE public.receipts IS 'Recibos de venda e pagamento com numeração sequencial por dia';
COMMENT ON COLUMN public.receipts.receipt_number IS 'Número do recibo no formato REC-YYYYMMDD-NNNN (sequencial por dia)';
