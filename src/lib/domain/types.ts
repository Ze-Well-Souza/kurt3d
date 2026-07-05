export type Status = "todo" | "printing" | "done" | "vendido" | "presente" | "falha";

export type OrderDestino = "Kurtido e Vendido" | "Dado de Presente" | "Falha de Impressão";

export type OrderPartStatus = "todo" | "printing" | "done" | "falha";

export type OrderPart = {
  id: string;
  orderId: string;
  nome: string;
  position: number;
  quantity: number;
  timeMinutes: number;
  gramsPerUnit: number;
  status: OrderPartStatus;
  linkProjeto?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  client: string;
  projectName: string;
  quantity: number;
  timeMinutes: number;
  status: Status;
  createdAt: string;
  updatedAt: string;

  portfolioProjectId?: string;
  filamentoId?: string;
  filamentoIds?: string[];
  gramsPerUnit?: number;

  valorRecebido?: number;
  destino?: OrderDestino;

  linkProjeto?: string | null;
  multiPart?: boolean;
  precoVenda?: number | null;

  formaPagamento?: string | null;
  dataPagamento?: string | null;
  clientId?: string | null;
  parts?: OrderPart[];
};

export type Venda = {
  id: string;
  orderId: string;
  projectName: string;
  client: string;
  valor: number;
  custo: number;
  depreciacao: number;
  data: string;
};

export type FilamentoQualidade = "Ótimo" | "bom" | "médio" | "ruim";

export type FormaPagamento = "a_vista" | "parcelado";
export type PaymentEventTipo = "pagamento" | "estorno";

export type InsumoClassificacaoFinanceira = "operacional" | "investimento";

export type FilamentoPayment = {
  id: string;
  batchId: string;
  formaPagamento: FormaPagamento;
  custoTotal: number;
  parcelas: number;
  dataParaPagamento: string | null;
  createdAt: string;
};

export type FilamentoPaymentInstallment = {
  id: string;
  paymentId: string;
  numero: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  dataPagamento: string | null;
  valorPago: number | null;
  observacao: string | null;
};

export type FilamentoPaymentEvent = {
  id: string;
  installmentId: string;
  paymentId: string;
  tipo: PaymentEventTipo;
  valor: number;
  dataPagamento: string;
  observacao: string | null;
  createdAt: string;
};

export type InsumoPayment = {
  id: string;
  insumoId: string;
  formaPagamento: FormaPagamento;
  custoTotal: number;
  parcelas: number;
  dataParaPagamento: string | null;
  createdAt: string;
};

export type InsumoPaymentInstallment = {
  id: string;
  paymentId: string;
  numero: number;
  valor: number;
  vencimento: string;
  pago: boolean;
  dataPagamento: string | null;
  valorPago: number | null;
  observacao: string | null;
};

export type InsumoPaymentEvent = {
  id: string;
  installmentId: string;
  paymentId: string;
  tipo: PaymentEventTipo;
  valor: number;
  dataPagamento: string;
  observacao: string | null;
  createdAt: string;
};

export type Filamento = {
  id: string;
  sku: string;
  marca: string;
  cor: string;
  material: string;
  pesoInicial: number;
  pesoAtual: number;
  precoPago: number;
  dataCompra: string;
  dataEntrega?: string | null;
  dataFim?: string | null;
  qualidade?: FilamentoQualidade | null;
  observacao?: string | null;
  comentario?: string | null;
  linkProduto?: string | null;
  batchId?: string | null;
  paymentId?: string | null;
};

export type FilamentoHistory = Filamento & {
  arquivadoAt: string;
};

export type Insumo = {
  id: string;
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoTotal: number;
  linkProduto?: string | null;
  paymentId?: string | null;
  classificacaoFinanceira: InsumoClassificacaoFinanceira;
};

export type CalculatorFilamentoSource = "stock" | "manual";

export type CalculatorFilamentoInput = {
  id: string;
  source: CalculatorFilamentoSource;
  filamentoId?: string | null;
  sku?: string | null;
  marca?: string | null;
  cor?: string | null;
  precoRolo: number;
  pesoRolo: number;
  pesoUsado: number;
};

export type CalculatorExtraCost = {
  id: string;
  nome: string;
  custo: number;
  quantidade: number;
};

export type PortfolioProject = {
  id: string;
  nome: string;
  categoria: string;
  linkModelo?: string;
  filamentoId?: string;
  custoRolo: number;
  pesoRolo: number;
  pesoPeca: number;
  tempoMin: number;
  quantidade: number;
  precoVenda: number;
  perdaPercent?: number;
  createdAt: string;
  updatedAt: string;
  // New multi-filament + cost fields
  filamentos?: CalculatorFilamentoInput[];
  custosExtras?: CalculatorExtraCost[];
  custoKwh?: number | null;
  custoKwOverride?: number | null;
  custoTrabalhoHoras?: number | null;
  custoTrabalhoValorHora?: number | null;
  taxaGateway?: number | null;
};

export type PublicPortfolioProject = PortfolioProject & {
  filamentoMaterial?: string | null;
  filamentoCor?: string | null;
};

export type InventoryTxnType = "reserve" | "release" | "consume";

export type InventoryTxn = {
  id: string;
  filamentId: string;
  orderId: string;
  type: InventoryTxnType;
  grams: number;
  createdAt: string;
};

export type ExpenseSource = "insumo" | "manual" | "falha";

export type Expense = {
  id: string;
  source: ExpenseSource;
  refId: string;
  valor: number;
  data: string;
  descricao: string;
  categoria?: string | null;
};

export type LeadImagem = {
  nome: string;
  tipo: string;
  publicUrl: string;
  storagePath?: string;
};

export type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  mensagem: string;
  linkProjeto?: string | null;
  imagens?: LeadImagem[] | null;
  createdAt: string;
};

export type Client = {
  id: string;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  username: string;
  phone?: string | null;
  nome?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type SiteTestimonial = {
  nome: string;
  cargo: string;
  texto: string;
};

export type SiteContent = {
  heroTitulo: string;
  heroSubtitulo: string;
  heroStats: { valor: string; label: string }[];
  features: { titulo: string; descricao: string }[];
  instagramUrl: string;
  youtubeUrl: string;
  testimonials: SiteTestimonial[];
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroTitulo: "Rápido. Colorido.\nPerfeito.",
  heroSubtitulo: "Sociedade Zé & Kurt | Tecnologia Bambu Lab com AMS | Impressão multicor de alta qualidade",
  heroStats: [
    { valor: "0,05mm", label: "Camada" },
    { valor: "<24h", label: "Entrega" },
    { valor: "12+", label: "Cores" },
  ],
  features: [
    { titulo: "Qualidade Bambu", descricao: "Impressoras Bambu Lab com AMS para multicor pixel-perfect." },
    { titulo: "Entrega expressa", descricao: "A maioria dos pedidos sai em até 24 horas." },
    { titulo: "Multimaterial", descricao: "PLA, PETG, ABS, TPU e filamentos especiais em qualquer cor." },
  ],
  instagramUrl: "https://instagram.com/kurti3d",
  youtubeUrl: "https://youtube.com/@kurti3d",
  testimonials: [
    {
      nome: "Cliente satisfeito",
      cargo: "Pedido recorrente",
      texto: "Atendimento rapido, acabamento excelente e cores muito fieis ao que eu imaginava.",
    },
    {
      nome: "Parceiro maker",
      cargo: "Prototipos e brindes",
      texto: "A qualidade das pecas e a previsibilidade dos prazos ajudaram bastante no meu fluxo.",
    },
    {
      nome: "Cliente de decoracao",
      cargo: "Pecas personalizadas",
      texto: "Recebi exatamente o que pedi e com uma apresentacao muito caprichada.",
    },
  ],
};

export type AppSettings = {
  // Perfil do Estúdio
  studioNome: string;
  // Impressora
  impressoraModelo: string;
  // Parâmetros de Custo
  consumoKw: number;
  tarifaEnergiaKwh: number;
  depreciacaoHora: number;
  custoFixoUnidade: number;
  // Valores Padrão
  defaultPesoRolo: number;
  defaultQuantidade: number;
  // Contato
  whatsappNumero: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  studioNome: "Kurti 3D",
  impressoraModelo: "Bambu Lab A1",
  consumoKw: 0.095,
  tarifaEnergiaKwh: 0.75,
  depreciacaoHora: 0.70,
  custoFixoUnidade: 0.20,
  defaultPesoRolo: 1000,
  defaultQuantidade: 10,
  whatsappNumero: "5511999999999",
};

// ═══════════ Extended Types for New Features ═══════════

export type ProductionCalendarEvent = {
  id: string;
  orderId: string;
  title: string;
  startDate: string;
  endDate: string;
  printerName: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetQuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  timeMinutes: number;
  materialGrams: number;
  subtotal: number;
};

export type BudgetQuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";

export type BudgetQuote = {
  id: string;
  clientName: string;
  clientContact?: string | null;
  clientEmail?: string | null;
  items: BudgetQuoteItem[];
  subtotal: number;
  discountPercent?: number | null;
  total: number;
  validityDays: number;
  status: BudgetQuoteStatus;
  notes?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  convertedToOrderId?: string | null;
};

export type PortfolioVideoPlatform = "youtube" | "vimeo" | "instagram" | "tiktok";

export type PortfolioVideo = {
  id: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  platform: PortfolioVideoPlatform;
  durationSeconds?: number | null;
  viewsCount?: number | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedReportType = "revenue" | "performance" | "inventory" | "orders" | "custom";

export type SavedReport = {
  id: string;
  name: string;
  type: SavedReportType;
  config: Record<string, unknown>;
  filters?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

