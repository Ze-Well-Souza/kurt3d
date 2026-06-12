import { randomUUID } from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Expense, Filamento, Insumo, InventoryTxn, Order, PortfolioProject, Venda } from "../domain/types";
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

function seedFilamentos(): Filamento[] {
  return [
    {
      id: "cyan",
      sku: "FIL-001",
      marca: "Creality",
      cor: "Cyan",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 1000,
      precoPago: 120,
      dataCompra: "2026-01-15",
    },
    {
      id: "magenta",
      sku: "FIL-002",
      marca: "Creality",
      cor: "Magenta",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 1000,
      precoPago: 120,
      dataCompra: "2026-01-15",
    },
    {
      id: "yellow",
      sku: "FIL-003",
      marca: "Creality",
      cor: "Yellow",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 1000,
      precoPago: 120,
      dataCompra: "2026-01-15",
    },
  ];
}

function seedOrders(): Order[] {
  const createdAt = nowIso();
  return [
    {
      id: "o1",
      client: "Marina Souza",
      projectName: "Chaveiros Toy Story",
      quantity: 12,
      timeMinutes: 270,
      status: "todo",
      createdAt,
      updatedAt: createdAt,
      filamentoId: "yellow",
      gramsPerUnit: 5,
    },
    {
      id: "o2",
      client: "Pedro Lima",
      projectName: "Vaso Geométrico",
      quantity: 2,
      timeMinutes: 480,
      status: "todo",
      createdAt,
      updatedAt: createdAt,
      filamentoId: "cyan",
      gramsPerUnit: 60,
    },
    {
      id: "o3",
      client: "Atelier Bambu",
      projectName: "Suporte de Celular",
      quantity: 6,
      timeMinutes: 180,
      status: "printing",
      createdAt,
      updatedAt: createdAt,
      filamentoId: "magenta",
      gramsPerUnit: 15,
    },
  ];
}

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
  };
}

function toInsumoRow(row: Insumo) {
  return {
    id: row.id,
    nome: row.nome,
    data_compra: row.dataCompra,
    quantidade: row.quantidade,
    preco_total: row.precoTotal,
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
    source: row.source,
    refId: row.ref_id,
    valor: row.valor,
    data: row.data,
    descricao: row.descricao,
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
  let rows = unwrap(await supabase.from("filamentos").select("*").order("created_at", { ascending: false }));
  let list = (rows as any[]).map(fromFilamentoRow);
  if (list.length === 0) {
    list = seedFilamentos();
    await replaceById("filamentos", list.map(toFilamentoRow));
    rows = unwrap(await supabase.from("filamentos").select("*").order("created_at", { ascending: false }));
    list = (rows as any[]).map(fromFilamentoRow);
  }
  return {
    list,
    async save(next: Filamento[]) {
      await replaceById("filamentos", next.map(toFilamentoRow));
    },
  };
}

export async function ordersRepo() {
  const supabase = getSupabaseAdminClient();
  let rows = unwrap(await supabase.from("orders").select("*").order("created_at", { ascending: false }));
  let list = (rows as any[]).map(fromOrderRow);
  if (list.length === 0) {
    list = seedOrders();
    await replaceById("orders", list.map(toOrderRow));
    rows = unwrap(await supabase.from("orders").select("*").order("created_at", { ascending: false }));
    list = (rows as any[]).map(fromOrderRow);
  }
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

export async function computeReservedMap() {
  const inv = await inventoryRepo();
  return computeReservedByFilament(inv.list);
}

