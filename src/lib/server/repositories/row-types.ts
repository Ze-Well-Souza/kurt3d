/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos de linha do banco (P2-5)
 * ─────────────────────────────────────────────────────────────────────────────
 * Uma interface por tabela, coluna a coluna, batendo com `supabase/schema.sql`.
 * Cada `fromXRow` em mappers.ts/extended-repos.ts recebia `row: any` — sem
 * checagem alguma entre o que o Supabase devolve e o que o código lê.
 *
 * Isso não é só estética de lint: foi lendo estes tipos coluna a coluna contra
 * o schema real que "orders.printer" e "users.active" apareceram como colunas
 * que o código lê mas o banco de produção não tinha (ver o teste
 * `mappers.schema-drift.test.ts` e o commit que corrigiu as duas).
 *
 * Cada campo nullable no banco (`is_nullable = YES` em information_schema) usa
 * `| null`; nenhum usa `?` opcional, porque o Supabase sempre devolve a chave
 * com valor `null`, nunca omite a propriedade.
 */

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  phone: string | null;
  nome: string | null;
  role: string;
  must_change_password: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type FilamentoQualidadeRow = "Ótimo" | "bom" | "médio" | "ruim" | null;

export interface FilamentoRow {
  id: string;
  sku: string;
  marca: string;
  cor: string;
  material: string;
  peso_inicial: number;
  peso_atual: number;
  preco_pago: number;
  data_compra: string;
  data_entrega: string | null;
  data_fim: string | null;
  qualidade: FilamentoQualidadeRow;
  observacao: string | null;
  link_produto: string | null;
  batch_id: string | null;
  payment_id: string | null;
  created_at: string;
}

export interface FilamentoHistoryRow extends Omit<FilamentoRow, "created_at"> {
  arquivado_at: string;
}

export interface OrderRow {
  id: string;
  client: string;
  project_name: string;
  quantity: number;
  time_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
  portfolio_project_id: string | null;
  filamento_id: string | null;
  filamento_ids: string[] | null;
  grams_per_unit: number | null;
  valor_recebido: number | null;
  destino: string | null;
  link_projeto: string | null;
  multi_part: boolean | null;
  preco_venda: number | null;
  forma_pagamento: string | null;
  data_pagamento: string | null;
  client_id: string | null;
  printer: string | null;
}

export interface OrderPartRow {
  id: string;
  order_id: string;
  nome: string;
  position: number;
  quantity: number;
  time_minutes: number;
  grams_per_unit: number;
  status: string;
  link_projeto: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioProjectRow {
  id: string;
  nome: string;
  categoria: string;
  link_modelo: string | null;
  filamento_id: string | null;
  custo_rolo: number;
  peso_rolo: number;
  peso_peca: number;
  tempo_min: number;
  quantidade: number;
  preco_venda: number;
  perda_percent: number | null;
  is_public: boolean;
  published_at: string | null;
  image_url: string | null;
  image_urls: unknown;
  filamentos: unknown;
  custos_extras: unknown;
  custo_kwh: number | null;
  consumo_kw: number | null;
  custo_mao_obra_horas: number | null;
  custo_mao_obra_valor_hora: number | null;
  taxa_gateway: number | null;
  created_at: string;
  updated_at: string;
}

export interface InsumoRow {
  id: string;
  nome: string;
  data_compra: string;
  quantidade: string;
  preco_total: number;
  link_produto: string | null;
  payment_id: string | null;
  classificacao_financeira: string;
}

export interface VendaRow {
  id: string;
  order_id: string;
  project_name: string;
  client: string;
  valor: number;
  custo: number;
  depreciacao: number;
  data: string;
}

export interface InventoryTxnRow {
  id: string;
  filament_id: string;
  order_id: string;
  type: string;
  grams: number;
  created_at: string;
}

export interface FilamentoPaymentRow {
  id: string;
  batch_id: string;
  forma_pagamento: string;
  custo_total: number;
  parcelas: number;
  data_para_pagamento: string | null;
  created_at: string;
}

export interface InsumoPaymentRow {
  id: string;
  insumo_id: string;
  forma_pagamento: string;
  custo_total: number;
  parcelas: number;
  data_para_pagamento: string | null;
  created_at: string;
}

export interface FilamentoPaymentInstallmentRow {
  id: string;
  payment_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  data_pagamento: string | null;
  valor_pago: number | null;
  observacao: string | null;
}

export type InsumoPaymentInstallmentRow = FilamentoPaymentInstallmentRow;

export interface FilamentoPaymentEventRow {
  id: string;
  installment_id: string;
  payment_id: string;
  tipo: string;
  valor: number;
  data_pagamento: string;
  observacao: string | null;
  created_at: string;
}

export type InsumoPaymentEventRow = FilamentoPaymentEventRow;

export interface ExpenseRow {
  id: string;
  source: string;
  ref_id: string;
  valor: number;
  data: string;
  descricao: string;
  categoria: string | null;
}

export interface OrderPaymentRow {
  id: string;
  order_id: string;
  valor: number;
  metodo: string;
  data: string;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface LeadRow {
  id: string;
  nome: string;
  whatsapp: string;
  mensagem: string;
  link_projeto: string | null;
  imagens: unknown;
  created_at: string;
}

export interface ClientRow {
  id: string;
  nome: string;
  whatsapp: string | null;
  email: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: string;
  studio_nome: string;
  impressora_modelo: string;
  consumo_kw: number;
  tarifa_energia_kwh: number;
  depreciacao_hora: number;
  custo_fixo_unidade: number;
  default_peso_rolo: number;
  default_quantidade: number;
  whatsapp_numero: string;
  selected_printer_preset: string | null;
  printer_prices: unknown;
  printer_vida_util: unknown;
}

export interface SiteContentRow {
  id: string;
  content: unknown;
  updated_at: string;
}

export interface ProductionCalendarRow {
  id: string;
  order_id: string;
  title: string;
  start_date: string;
  end_date: string;
  printer_name: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetQuoteRow {
  id: string;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  items: unknown;
  subtotal: number;
  discount_percent: number | null;
  total: number;
  validity_days: number;
  status: string;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  converted_to_order_id: string | null;
}

export interface PortfolioVideoRow {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  platform: string;
  duration_seconds: number | null;
  views_count: number | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedReportRow {
  id: string;
  name: string;
  type: string;
  config: unknown;
  filters: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptRow {
  id: string;
  receipt_number: string;
  type: string;
  client_name: string;
  items: unknown;
  total: number;
  doc_type: string | null;
  doc_number: string | null;
  studio_doc_type: string | null;
  studio_doc_number: string | null;
  forma_pagamento: string | null;
  observacao: string | null;
  paid: boolean;
  source_type: string | null;
  source_id: string | null;
  discount_percent: number | null;
  created_at: string;
  updated_at: string;
}
