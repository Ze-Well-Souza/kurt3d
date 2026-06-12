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
};

export type Insumo = {
  id: string;
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoTotal: number;
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

