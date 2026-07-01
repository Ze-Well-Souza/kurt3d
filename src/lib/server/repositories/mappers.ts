import type {
  AppSettings,
  Client,
  Expense,
  ExpenseSource,
  Filamento,
  FilamentoHistory,
  FilamentoPaymentEvent,
  FilamentoPayment,
  FilamentoPaymentInstallment,
  FormaPagamento,
  Insumo,
  InsumoPaymentEvent,
  InsumoPayment,
  InsumoPaymentInstallment,
  InventoryTxn,
  Lead,
  Order,
  OrderPart,
  PortfolioProject,
  SiteContent,
  Venda,
} from "../../domain/types";
import { DEFAULT_APP_SETTINGS, DEFAULT_SITE_CONTENT } from "../../domain/types";

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  phone?: string | null;
  nome?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export function fromUserRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    phone: row.phone ?? null,
    nome: row.nome ?? null,
    role: row.role ?? "admin",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFilamentoQualidade(value: unknown): Filamento["qualidade"] {
  if (typeof value !== "string") return null;
  switch (value.trim().toLowerCase()) {
    case "otimo":
    case "ótimo":
      return "Ótimo";
    case "bom":
      return "bom";
    case "medio":
    case "médio":
      return "médio";
    case "ruim":
      return "ruim";
    default:
      return null;
  }
}

export function toUserRow(user: User) {
  return {
    id: user.id,
    username: user.username,
    password_hash: user.passwordHash,
    phone: user.phone ?? null,
    nome: user.nome ?? null,
    role: user.role ?? "admin",
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export function fromFilamentoRow(row: any): Filamento {
  return {
    id: row.id,
    sku: row.sku,
    marca: row.marca,
    cor: row.cor,
    material: row.material,
    pesoInicial: row.peso_inicial,
    pesoAtual: row.peso_atual,
    precoPago: row.preco_pago,
    dataCompra: row.data_compra,
    dataEntrega: row.data_entrega ?? null,
    dataFim: row.data_fim ?? null,
    qualidade: normalizeFilamentoQualidade(row.qualidade),
    observacao: row.observacao ?? row.comentario ?? null,
    comentario: row.comentario ?? row.observacao ?? null,
    linkProduto: row.link_produto ?? null,
    batchId: row.batch_id ?? null,
    paymentId: row.payment_id ?? null,
  };
}

export function toFilamentoRow(row: Filamento) {
  const observacao = row.observacao ?? row.comentario ?? null;
  return {
    id: row.id,
    sku: row.sku,
    marca: row.marca,
    cor: row.cor,
    material: row.material,
    peso_inicial: row.pesoInicial,
    peso_atual: row.pesoAtual,
    preco_pago: row.precoPago,
    data_compra: row.dataCompra,
    data_entrega: row.dataEntrega ?? null,
    data_fim: row.dataFim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: observacao,
    observacao,
    link_produto: row.linkProduto ?? null,
    batch_id: row.batchId ?? null,
    payment_id: row.paymentId ?? null,
  };
}

export function fromFilamentoHistoryRow(row: any): FilamentoHistory {
  return {
    id: row.id,
    sku: row.sku,
    marca: row.marca,
    cor: row.cor,
    material: row.material,
    pesoInicial: row.peso_inicial,
    pesoAtual: row.peso_atual,
    precoPago: row.preco_pago,
    dataCompra: row.data_compra,
    dataEntrega: row.data_entrega ?? null,
    dataFim: row.data_fim ?? null,
    qualidade: normalizeFilamentoQualidade(row.qualidade),
    observacao: row.observacao ?? row.comentario ?? null,
    comentario: row.comentario ?? row.observacao ?? null,
    linkProduto: row.link_produto ?? null,
    batchId: row.batch_id ?? null,
    paymentId: row.payment_id ?? null,
    arquivadoAt: row.arquivado_at,
  };
}

export function toFilamentoHistoryRow(row: FilamentoHistory) {
  const observacao = row.observacao ?? row.comentario ?? null;
  return {
    id: row.id,
    sku: row.sku,
    marca: row.marca,
    cor: row.cor,
    material: row.material,
    peso_inicial: row.pesoInicial,
    peso_atual: row.pesoAtual,
    preco_pago: row.precoPago,
    data_compra: row.dataCompra,
    data_entrega: row.dataEntrega ?? null,
    data_fim: row.dataFim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: observacao,
    observacao,
    link_produto: row.linkProduto ?? null,
    batch_id: row.batchId ?? null,
    payment_id: row.paymentId ?? null,
    arquivado_at: row.arquivadoAt,
  };
}

export function fromOrderRow(row: any): Order {
  return {
    id: row.id,
    client: row.client,
    projectName: row.project_name,
    quantity: row.quantity,
    timeMinutes: row.time_minutes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    portfolioProjectId: row.portfolio_project_id ?? undefined,
    filamentoId: row.filamento_id ?? undefined,
    gramsPerUnit: row.grams_per_unit ?? undefined,
    valorRecebido: row.valor_recebido ?? undefined,
    destino: row.destino ?? undefined,
    linkProjeto: row.link_projeto ?? null,
    multiPart: row.multi_part ?? false,
    precoVenda: row.preco_venda ?? null,
    formaPagamento: row.forma_pagamento ?? null,
    dataPagamento: row.data_pagamento ?? null,
    clientId: row.client_id ?? null,
  };
}

export function toOrderRow(row: Order) {
  return {
    id: row.id,
    client: row.client,
    project_name: row.projectName,
    quantity: row.quantity,
    time_minutes: row.timeMinutes,
    status: row.status,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    portfolio_project_id: row.portfolioProjectId ?? null,
    filamento_id: row.filamentoId ?? null,
    grams_per_unit: row.gramsPerUnit ?? null,
    valor_recebido: row.valorRecebido ?? null,
    destino: row.destino ?? null,
    link_projeto: row.linkProjeto ?? null,
    multi_part: row.multiPart ?? false,
    preco_venda: row.precoVenda ?? null,
    forma_pagamento: row.formaPagamento ?? null,
    data_pagamento: row.dataPagamento ?? null,
    client_id: row.clientId ?? null,
  };
}

export function fromOrderPartRow(row: any): OrderPart {
  return {
    id: row.id,
    orderId: row.order_id,
    nome: row.nome,
    position: row.position ?? 0,
    quantity: row.quantity ?? 1,
    timeMinutes: row.time_minutes,
    gramsPerUnit: row.grams_per_unit,
    status: row.status ?? "todo",
    linkProjeto: row.link_projeto ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOrderPartRow(row: OrderPart) {
  return {
    id: row.id,
    order_id: row.orderId,
    nome: row.nome,
    position: row.position,
    quantity: row.quantity,
    time_minutes: row.timeMinutes,
    grams_per_unit: row.gramsPerUnit,
    status: row.status,
    link_projeto: row.linkProjeto ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function fromPortfolioRow(row: any): PortfolioProject {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    linkModelo: row.link_modelo ?? undefined,
    filamentoId: row.filamento_id ?? undefined,
    custoRolo: row.custo_rolo,
    pesoRolo: row.peso_rolo,
    pesoPeca: row.peso_peca,
    tempoMin: row.tempo_min,
    quantidade: row.quantidade,
    precoVenda: row.preco_venda,
    perdaPercent: row.perda_percent ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPortfolioRow(row: PortfolioProject) {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    link_modelo: row.linkModelo ?? null,
    filamento_id: row.filamentoId ?? null,
    custo_rolo: row.custoRolo,
    peso_rolo: row.pesoRolo,
    peso_peca: row.pesoPeca,
    tempo_min: row.tempoMin,
    quantidade: row.quantidade,
    preco_venda: row.precoVenda,
    perda_percent: row.perdaPercent ?? 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function fromInsumoRow(row: any): Insumo {
  return {
    id: row.id,
    nome: row.nome,
    dataCompra: row.data_compra,
    quantidade: row.quantidade,
    precoTotal: row.preco_total,
    linkProduto: row.link_produto ?? null,
    paymentId: row.payment_id ?? null,
    classificacaoFinanceira: row.classificacao_financeira ?? "operacional",
  };
}

export function toInsumoRow(row: Insumo) {
  return {
    id: row.id,
    nome: row.nome,
    data_compra: row.dataCompra,
    quantidade: row.quantidade,
    preco_total: row.precoTotal,
    link_produto: row.linkProduto ?? null,
    payment_id: row.paymentId ?? null,
    classificacao_financeira: row.classificacaoFinanceira,
  };
}

export function fromVendaRow(row: any): Venda {
  return {
    id: row.id,
    orderId: row.order_id,
    projectName: row.project_name,
    client: row.client,
    valor: row.valor,
    custo: row.custo,
    depreciacao: row.depreciacao,
    data: row.data,
  };
}

export function toVendaRow(row: Venda) {
  return {
    id: row.id,
    order_id: row.orderId,
    project_name: row.projectName,
    client: row.client,
    valor: row.valor,
    custo: row.custo,
    depreciacao: row.depreciacao,
    data: row.data,
  };
}

export function fromInventoryRow(row: any): InventoryTxn {
  return {
    id: row.id,
    filamentId: row.filament_id,
    orderId: row.order_id,
    type: row.type,
    grams: row.grams,
    createdAt: row.created_at,
  };
}

export function toInventoryRow(row: InventoryTxn) {
  return {
    id: row.id,
    filament_id: row.filamentId,
    order_id: row.orderId,
    type: row.type,
    grams: row.grams,
    created_at: row.createdAt,
  };
}

export function fromPaymentRow(row: any): FilamentoPayment {
  return {
    id: row.id,
    batchId: row.batch_id,
    formaPagamento: row.forma_pagamento as FormaPagamento,
    custoTotal: row.custo_total,
    parcelas: row.parcelas,
    dataParaPagamento: row.data_para_pagamento ?? null,
    createdAt: row.created_at,
  };
}

export function toPaymentRow(row: FilamentoPayment) {
  return {
    id: row.id,
    batch_id: row.batchId,
    forma_pagamento: row.formaPagamento,
    custo_total: row.custoTotal,
    parcelas: row.parcelas,
    data_para_pagamento: row.dataParaPagamento ?? null,
    created_at: row.createdAt,
  };
}

export function fromInsumoPaymentRow(row: any): InsumoPayment {
  return {
    id: row.id,
    insumoId: row.insumo_id,
    formaPagamento: row.forma_pagamento as FormaPagamento,
    custoTotal: row.custo_total,
    parcelas: row.parcelas,
    dataParaPagamento: row.data_para_pagamento ?? null,
    createdAt: row.created_at,
  };
}

export function toInsumoPaymentRow(row: InsumoPayment) {
  return {
    id: row.id,
    insumo_id: row.insumoId,
    forma_pagamento: row.formaPagamento,
    custo_total: row.custoTotal,
    parcelas: row.parcelas,
    data_para_pagamento: row.dataParaPagamento ?? null,
    created_at: row.createdAt,
  };
}

export function fromInstallmentRow(row: any): FilamentoPaymentInstallment {
  return {
    id: row.id,
    paymentId: row.payment_id,
    numero: row.numero,
    valor: row.valor,
    vencimento: row.vencimento,
    pago: !!row.pago,
    dataPagamento: row.data_pagamento ?? null,
    valorPago: row.valor_pago ?? null,
    observacao: row.observacao ?? null,
  };
}

export function toInstallmentRow(row: FilamentoPaymentInstallment) {
  return {
    id: row.id,
    payment_id: row.paymentId,
    numero: row.numero,
    valor: row.valor,
    vencimento: row.vencimento,
    pago: row.pago,
    data_pagamento: row.dataPagamento ?? null,
    valor_pago: row.valorPago ?? null,
    observacao: row.observacao ?? null,
  };
}

export function fromFilamentoPaymentEventRow(row: any): FilamentoPaymentEvent {
  return {
    id: row.id,
    installmentId: row.installment_id,
    paymentId: row.payment_id,
    tipo: row.tipo,
    valor: row.valor,
    dataPagamento: row.data_pagamento,
    observacao: row.observacao ?? null,
    createdAt: row.created_at,
  };
}

export function toFilamentoPaymentEventRow(row: FilamentoPaymentEvent) {
  return {
    id: row.id,
    installment_id: row.installmentId,
    payment_id: row.paymentId,
    tipo: row.tipo,
    valor: row.valor,
    data_pagamento: row.dataPagamento,
    observacao: row.observacao ?? null,
    created_at: row.createdAt,
  };
}

export function fromInsumoInstallmentRow(row: any): InsumoPaymentInstallment {
  return {
    id: row.id,
    paymentId: row.payment_id,
    numero: row.numero,
    valor: row.valor,
    vencimento: row.vencimento,
    pago: !!row.pago,
    dataPagamento: row.data_pagamento ?? null,
    valorPago: row.valor_pago ?? null,
    observacao: row.observacao ?? null,
  };
}

export function toInsumoInstallmentRow(row: InsumoPaymentInstallment) {
  return {
    id: row.id,
    payment_id: row.paymentId,
    numero: row.numero,
    valor: row.valor,
    vencimento: row.vencimento,
    pago: row.pago,
    data_pagamento: row.dataPagamento ?? null,
    valor_pago: row.valorPago ?? null,
    observacao: row.observacao ?? null,
  };
}

export function fromInsumoPaymentEventRow(row: any): InsumoPaymentEvent {
  return {
    id: row.id,
    installmentId: row.installment_id,
    paymentId: row.payment_id,
    tipo: row.tipo,
    valor: row.valor,
    dataPagamento: row.data_pagamento,
    observacao: row.observacao ?? null,
    createdAt: row.created_at,
  };
}

export function toInsumoPaymentEventRow(row: InsumoPaymentEvent) {
  return {
    id: row.id,
    installment_id: row.installmentId,
    payment_id: row.paymentId,
    tipo: row.tipo,
    valor: row.valor,
    data_pagamento: row.dataPagamento,
    observacao: row.observacao ?? null,
    created_at: row.createdAt,
  };
}

export function fromExpenseRow(row: any): Expense {
  return {
    id: row.id,
    source: row.source as ExpenseSource,
    refId: row.ref_id,
    valor: row.valor,
    data: row.data,
    descricao: row.descricao,
    categoria: row.categoria ?? null,
  };
}

export function toExpenseRow(row: Expense) {
  return {
    id: row.id,
    source: row.source,
    ref_id: row.refId,
    valor: row.valor,
    data: row.data,
    descricao: row.descricao,
    categoria: row.categoria ?? null,
  };
}

export function fromLeadRow(row: any): Lead {
  let imagens: Lead["imagens"] = null;
  try {
    if (Array.isArray(row.imagens)) imagens = row.imagens;
    else if (typeof row.imagens === "string" && row.imagens) imagens = JSON.parse(row.imagens);
  } catch {
    imagens = null;
  }
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    mensagem: row.mensagem,
    linkProjeto: row.link_projeto ?? null,
    imagens,
    createdAt: row.created_at,
  };
}

export function toLeadRow(row: Lead) {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    mensagem: row.mensagem,
    link_projeto: row.linkProjeto ?? null,
    imagens: row.imagens ? JSON.parse(JSON.stringify(row.imagens)) : null,
    created_at: row.createdAt,
  };
}

export function fromClientRow(row: any): Client {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    notas: row.notas ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toClientRow(row: Client) {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp ?? null,
    email: row.email ?? null,
    notas: row.notas ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function fromSettingsRow(row: any): AppSettings {
  return {
    studioNome: row.studio_nome ?? DEFAULT_APP_SETTINGS.studioNome,
    impressoraModelo: row.impressora_modelo ?? DEFAULT_APP_SETTINGS.impressoraModelo,
    consumoKw: row.consumo_kw ?? DEFAULT_APP_SETTINGS.consumoKw,
    tarifaEnergiaKwh: row.tarifa_energia_kwh ?? DEFAULT_APP_SETTINGS.tarifaEnergiaKwh,
    depreciacaoHora: row.depreciacao_hora ?? DEFAULT_APP_SETTINGS.depreciacaoHora,
    custoFixoUnidade: row.custo_fixo_unidade ?? DEFAULT_APP_SETTINGS.custoFixoUnidade,
    defaultPesoRolo: row.default_peso_rolo ?? DEFAULT_APP_SETTINGS.defaultPesoRolo,
    defaultQuantidade: row.default_quantidade ?? DEFAULT_APP_SETTINGS.defaultQuantidade,
    whatsappNumero: row.whatsapp_numero ?? DEFAULT_APP_SETTINGS.whatsappNumero,
  };
}

export function toSettingsRow(row: AppSettings) {
  return {
    id: "main",
    studio_nome: row.studioNome,
    impressora_modelo: row.impressoraModelo,
    consumo_kw: row.consumoKw,
    tarifa_energia_kwh: row.tarifaEnergiaKwh,
    depreciacao_hora: row.depreciacaoHora,
    custo_fixo_unidade: row.custoFixoUnidade,
    default_peso_rolo: row.defaultPesoRolo,
    default_quantidade: row.defaultQuantidade,
    whatsapp_numero: row.whatsappNumero,
  };
}

export function fromSiteContentRow(row: any): SiteContent {
  if (row?.content) {
    return { ...DEFAULT_SITE_CONTENT, ...(row.content as Partial<SiteContent>) };
  }
  return { ...DEFAULT_SITE_CONTENT };
}
