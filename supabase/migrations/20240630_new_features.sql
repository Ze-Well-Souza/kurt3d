-- ════════════════════════════════════════════════════════════════
-- MIGRATION: New Features for Kurti 3D
-- Relatórios de Faturamento, Performance, Orçamentos, 
-- Calendário de Produção, Vídeos/Reels e Exportação de Dados
-- ════════════════════════════════════════════════════════════════

-- Esta migration adiciona as seguintes funcionalidades:
-- 1. Calendário de Produção (production_calendar)
-- 2. Vídeos/Reels do Portfólio (portfolio_videos)
-- 3. Orçamentos (budget_quotes)
-- 4. Relatórios Salvos (saved_reports)
-- 5. Dados já disponíveis para exportação via snapshot

-- ═══════════ 1. Calendário de Produção ═══════════
CREATE TABLE IF NOT EXISTS public.production_calendar (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  printer_name text NOT NULL DEFAULT 'Bambu Lab A1',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_calendar_dates ON public.production_calendar(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_production_calendar_order ON public.production_calendar(order_id);

COMMENT ON TABLE public.production_calendar IS 'Calendário de produção das impressoras 3D';
COMMENT ON COLUMN public.production_calendar.status IS 'scheduled: agendado, in_progress: imprimindo, completed: concluído, cancelled: cancelado';

-- ═══════════ 2. Vídeos/Reels do Portfólio ═══════════
CREATE TABLE IF NOT EXISTS public.portfolio_videos (
  id text PRIMARY KEY,
  project_id text NULL REFERENCES public.portfolio_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NULL,
  video_url text NOT NULL,
  thumbnail_url text NULL,
  platform text NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube', 'vimeo', 'instagram', 'tiktok')),
  duration_seconds integer NULL,
  views_count integer NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_videos_project ON public.portfolio_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_videos_featured ON public.portfolio_videos(featured) WHERE featured = true;

COMMENT ON TABLE public.portfolio_videos IS 'Vídeos e reels dos projetos de impressão 3D';
COMMENT ON COLUMN public.portfolio_videos.platform IS 'Plataforma de hospedagem do vídeo';
COMMENT ON COLUMN public.portfolio_videos.featured IS 'Se true, exibir em destaque na landing page';

-- ═══════════ 3. Orçamentos (Budget Quotes) ═══════════
CREATE TABLE IF NOT EXISTS public.budget_quotes (
  id text PRIMARY KEY,
  client_name text NOT NULL,
  client_contact text NULL,
  client_email text NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal double precision NOT NULL DEFAULT 0,
  discount_percent double precision NULL DEFAULT 0,
  total double precision NOT NULL,
  validity_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
  notes text NULL,
  pdf_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  converted_to_order_id text NULL REFERENCES public.orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_quotes_status ON public.budget_quotes(status);
CREATE INDEX IF NOT EXISTS idx_budget_quotes_expires ON public.budget_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_budget_quotes_client ON public.budget_quotes(client_name);

COMMENT ON TABLE public.budget_quotes IS 'Orçamentos gerados para clientes';
COMMENT ON COLUMN public.budget_quotes.items IS 'Array JSON de itens: [{id, description, quantity, unitPrice, timeMinutes, materialGrams, subtotal}]';
COMMENT ON COLUMN public.budget_quotes.status IS 'draft: rascunho, sent: enviado, approved: aprovado, rejected: rejeitado, expired: expirado, converted: convertido em pedido';

-- ═══════════ 4. Relatórios Salvos ═══════════
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('revenue', 'performance', 'inventory', 'orders', 'custom')),
  config jsonb NOT NULL DEFAULT '{}',
  filters jsonb NULL,
  created_by text NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON public.saved_reports(type);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON public.saved_reports(created_by);

COMMENT ON TABLE public.saved_reports IS 'Configurações de relatórios personalizados salvos pelos usuários';

-- ═══════════ 5. Trigger para atualizar updated_at ═══════════
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers nas novas tabelas
DROP TRIGGER IF EXISTS update_production_calendar_updated_at ON public.production_calendar;
CREATE TRIGGER update_production_calendar_updated_at
  BEFORE UPDATE ON public.production_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolio_videos_updated_at ON public.portfolio_videos;
CREATE TRIGGER update_portfolio_videos_updated_at
  BEFORE UPDATE ON public.portfolio_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_quotes_updated_at ON public.budget_quotes;
CREATE TRIGGER update_budget_quotes_updated_at
  BEFORE UPDATE ON public.budget_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_reports_updated_at ON public.saved_reports;
CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════ 6. Policies de Segurança (RLS) ═══════════
-- Habilitar RLS nas novas tabelas
ALTER TABLE public.production_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem fazer tudo
CREATE POLICY "Admins have full access to production_calendar"
  ON public.production_calendar
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to portfolio_videos"
  ON public.portfolio_videos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to budget_quotes"
  ON public.budget_quotes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to saved_reports"
  ON public.saved_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Público pode ver vídeos em destaque
CREATE POLICY "Public can view featured videos"
  ON public.portfolio_videos
  FOR SELECT
  USING (featured = true);

-- ═══════════ 7. Dados Iniciais de Exemplo (Opcional) ═══════════
-- Descomente se desejar inserir dados de exemplo

-- INSERT INTO public.portfolio_videos (id, title, video_url, platform, featured)
-- VALUES ('video-001', 'Time-lapse Impressão', 'https://youtube.com/watch?v=example', 'youtube', true);

-- ═══════════ FIM DA MIGRATION ═══════════
