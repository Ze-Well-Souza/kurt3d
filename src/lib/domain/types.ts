export type Status = "todo" | "printing" | "done" | "vendido" | "presente" | "falha";

export type OrderDestino = "Kurtido e Vendido" | "Dado de Presente" | "Falha de Impressão";

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
  gramsPerUnit?: number;

  valorRecebido?: number;
  destino?: OrderDestino;

  linkProjeto?: string | null;
  multiPart?: boolean;
  precoVenda?: number | null;

  formaPagamento?: string | null;
  dataPagamento?: string | null;
  clientId?: string | null;
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

export type FilamentoQualidade = "bom" | "medio" | "ruim";

export type FormaPagamento = "a_vista" | "parcelado";

export type FilamentoPayment = {
  id: string;
  batchId: string;
  formaPagamento: FormaPagamento;
  custoTotal: number;
  parcelas: number;
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
  dataFim?: string | null;
  qualidade?: FilamentoQualidade | null;
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
  dataUrl: string;
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

export type SiteContent = {
  heroTitulo: string;
  heroSubtitulo: string;
  heroStats: { valor: string; label: string }[];
  features: { titulo: string; descricao: string }[];
  instagramUrl: string;
  youtubeUrl: string;
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

