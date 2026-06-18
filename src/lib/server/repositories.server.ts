import { randomUUID } from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import type { AppSettings, Client, Expense, ExpenseSource, Filamento, FilamentoHistory, Insumo, InventoryTxn, Lead, Order, PortfolioProject, Venda } from "../domain/types";
import { DEFAULT_APP_SETTINGS } from "../domain/types";
import { computeReservedByFilament } from "../domain/inventory";
import { nowIso } from "./db.server";
import { getSupabaseAdminClient } from "./supabase.server";

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return (result.data ?? null) as T;
}

type RowWithId = { id: string };

async function replaceById<T extends RowWithId>(table: string, rows: T[]) {
  const supabase = getSupabaseAdminClient();
  const current = unwrap(await supabase.from(table).select("id"));
  const currentIds = new Set((current as RowWithId[]).map((r) => r.id));
  const nextIds = new Set(rows.map((r) => r.id));

  if (rows.length > 0) {
    unwrap(await supabase.from(table).upsert(rows as never[], { onConflict: "id" }));
  }

  const toDelete = [...currentIds].filter((id) => !nextIds.has(id));
  if (toDelete.length > 0) {
    unwrap(await supabase.from(table).delete().in("id", toDelete));
  }
}

function fromUserRow(row: any): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUserRow(user: User) {
  return {
    id: user.id,
    username: user.username,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

function fromFilamentoRow(row: any): Filamento {
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
    dataFim: row.data_fim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: row.comentario ?? null,
    linkProduto: row.link_produto ?? null,
  };
}

function toFilamentoRow(row: Filamento) {
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
    data_fim: row.dataFim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: row.comentario ?? null,
    link_produto: row.linkProduto ?? null,
  };
}

function fromFilamentoHistoryRow(row: any): FilamentoHistory {
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
    dataFim: row.data_fim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: row.comentario ?? null,
    linkProduto: row.link_produto ?? null,
    arquivadoAt: row.arquivado_at,
  };
}

function toFilamentoHistoryRow(row: FilamentoHistory) {
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
    data_fim: row.dataFim ?? null,
    qualidade: row.qualidade ?? null,
    comentario: row.comentario ?? null,
    link_produto: row.linkProduto ?? null,
    arquivado_at: row.arquivadoAt,
  };
}

function fromOrderRow(row: any): Order {
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

function toOrderRow(row: Order) {
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

function fromPortfolioRow(row: any): PortfolioProject {
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

function toPortfolioRow(row: PortfolioProject) {
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

function fromInsumoRow(row: any): Insumo {
  return {
    id: row.id,
    nome: row.nome,
    dataCompra: row.data_compra,
    quantidade: row.quantidade,
    precoTotal: row.preco_total,
    linkProduto: row.link_produto ?? null,
  };
}

function toInsumoRow(row: Insumo) {
  return {
    id: row.id,
    nome: row.nome,
    data_compra: row.dataCompra,
    quantidade: row.quantidade,
    preco_total: row.precoTotal,
    link_produto: row.linkProduto ?? null,
  };
}

function fromVendaRow(row: any): Venda {
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

function toVendaRow(row: Venda) {
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

function fromInventoryRow(row: any): InventoryTxn {
  return {
    id: row.id,
    filamentId: row.filament_id,
    orderId: row.order_id,
    type: row.type,
    grams: row.grams,
    createdAt: row.created_at,
  };
}

function toInventoryRow(row: InventoryTxn) {
  return {
    id: row.id,
    filament_id: row.filamentId,
    order_id: row.orderId,
    type: row.type,
    grams: row.grams,
    created_at: row.createdAt,
  };
}

function fromExpenseRow(row: any): Expense {
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

function toExpenseRow(row: Expense) {
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

function fromLeadRow(row: any): Lead {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    mensagem: row.mensagem,
    createdAt: row.created_at,
  };
}

function toLeadRow(row: Lead) {
  return {
    id: row.id,
    nome: row.nome,
    whatsapp: row.whatsapp,
    mensagem: row.mensagem,
    created_at: row.createdAt,
  };
}

function fromClientRow(row: any): Client {
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

function toClientRow(row: Client) {
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

export async function usersRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("users").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromUserRow);
  return {
    list,
    async save(next: User[]) {
      await replaceById("users", next.map(toUserRow));
    },
  };
}

export async function filamentosRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("filamentos").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromFilamentoRow);
  return {
    list,
    async save(next: Filamento[]) {
      await replaceById("filamentos", next.map(toFilamentoRow));
    },
  };
}

export async function filamentosHistoryRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("filamentos_history").select("*").order("arquivado_at", { ascending: false }));
  const list = (rows as any[]).map(fromFilamentoHistoryRow);
  return {
    list,
    async save(next: FilamentoHistory[]) {
      await replaceById("filamentos_history", next.map(toFilamentoHistoryRow));
    },
    async archive(filamento: Filamento) {
      const historyRow: FilamentoHistory = {
        ...filamento,
        arquivadoAt: nowIso(),
      };
      unwrap(await supabase.from("filamentos_history").insert(toFilamentoHistoryRow(historyRow)));
      // Remove from active filamentos
      const fRepo = await filamentosRepo();
      await fRepo.save(fRepo.list.filter((f) => f.id !== filamento.id));
      return historyRow;
    },
  };
}

export async function ordersRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("orders").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromOrderRow);
  return {
    list,
    async save(next: Order[]) {
      await replaceById("orders", next.map(toOrderRow));
    },
  };
}

export async function portfolioRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("portfolio_projects").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromPortfolioRow);
  return {
    list,
    async save(next: PortfolioProject[]) {
      await replaceById("portfolio_projects", next.map(toPortfolioRow));
    },
  };
}

export async function insumosRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("insumos").select("*").order("data_compra", { ascending: false }));
  const list = (rows as any[]).map(fromInsumoRow);
  return {
    list,
    async save(next: Insumo[]) {
      await replaceById("insumos", next.map(toInsumoRow));
    },
  };
}

export async function vendasRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("vendas").select("*").order("data", { ascending: false }));
  const list = (rows as any[]).map(fromVendaRow);
  return {
    list,
    async save(next: Venda[]) {
      await replaceById("vendas", next.map(toVendaRow));
    },
  };
}

export async function inventoryRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("inventory_txns").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromInventoryRow);
  return {
    list,
    async save(next: InventoryTxn[]) {
      await replaceById("inventory_txns", next.map(toInventoryRow));
    },
    async append(txn: Omit<InventoryTxn, "id" | "createdAt">) {
      const row: InventoryTxn = { id: randomUUID(), createdAt: nowIso(), ...txn };
      unwrap(await supabase.from("inventory_txns").insert(toInventoryRow(row)));
      return row;
    },
  };
}

export async function expensesRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("expenses").select("*").order("data", { ascending: false }));
  const list = (rows as any[]).map(fromExpenseRow);
  return {
    list,
    async save(next: Expense[]) {
      await replaceById("expenses", next.map(toExpenseRow));
    },
  };
}

export async function leadsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("leads").select("*").order("created_at", { ascending: false }));
  const list = (rows as any[]).map(fromLeadRow);
  return {
    list,
    async save(next: Lead[]) {
      await replaceById("leads", next.map(toLeadRow));
    },
    async insert(lead: Lead) {
      unwrap(await supabase.from("leads").insert(toLeadRow(lead)));
    },
  };
}

export async function clientsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("clients").select("*").order("nome", { ascending: true }));
  const list = (rows as any[]).map(fromClientRow);
  return {
    list,
    async save(next: Client[]) {
      await replaceById("clients", next.map(toClientRow));
    },
  };
}

function fromSettingsRow(row: any): AppSettings {
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

function toSettingsRow(row: AppSettings) {
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

export async function settingsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrap(await supabase.from("app_settings").select("*").eq("id", "main").limit(1));
  const list = rows as any[];
  const settings: AppSettings = list.length > 0 ? fromSettingsRow(list[0]) : { ...DEFAULT_APP_SETTINGS };
  return {
    settings,
    async save(next: AppSettings) {
      const supabase2 = getSupabaseAdminClient();
      unwrap(await supabase2.from("app_settings").upsert(toSettingsRow(next), { onConflict: "id" }));
    },
  };
}

export async function computeReservedMap() {
  const inv = await inventoryRepo();
  return computeReservedByFilament(inv.list);
}

