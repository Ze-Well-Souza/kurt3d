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

export type Expense = {
  id: string;
  source: "insumo";
  refId: string;
  valor: number;
  data: string;
  descricao: string;
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
};

