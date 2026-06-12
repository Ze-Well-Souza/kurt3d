import { randomUUID } from "node:crypto";
import type { Expense, Filamento, Insumo, InventoryTxn, Order, PortfolioProject, Venda } from "../domain/types";
import { computeReservedByFilament } from "../domain/inventory";
import { dataPath, nowIso, readJson, writeJson } from "./db.server";

type User = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

const PATHS = {
  users: dataPath("users.json"),
  orders: dataPath("orders.json"),
  filamentos: dataPath("filamentos.json"),
  portfolio: dataPath("portfolio.json"),
  insumos: dataPath("insumos.json"),
  vendas: dataPath("vendas.json"),
  inventoryTxns: dataPath("inventory_txns.json"),
  expenses: dataPath("expenses.json"),
} as const;

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

export async function usersRepo() {
  const list = await readJson<User[]>(PATHS.users, []);
  return {
    list,
    async save(next: User[]) {
      await writeJson(PATHS.users, next);
    },
  };
}

export async function filamentosRepo() {
  let list = await readJson<Filamento[]>(PATHS.filamentos, []);
  if (list.length === 0) {
    list = seedFilamentos();
    await writeJson(PATHS.filamentos, list);
  }
  return {
    list,
    async save(next: Filamento[]) {
      await writeJson(PATHS.filamentos, next);
    },
  };
}

export async function ordersRepo() {
  let list = await readJson<Order[]>(PATHS.orders, []);
  if (list.length === 0) {
    list = seedOrders();
    await writeJson(PATHS.orders, list);
  }
  return {
    list,
    async save(next: Order[]) {
      await writeJson(PATHS.orders, next);
    },
  };
}

export async function portfolioRepo() {
  const list = await readJson<PortfolioProject[]>(PATHS.portfolio, []);
  return {
    list,
    async save(next: PortfolioProject[]) {
      await writeJson(PATHS.portfolio, next);
    },
  };
}

export async function insumosRepo() {
  const list = await readJson<Insumo[]>(PATHS.insumos, []);
  return {
    list,
    async save(next: Insumo[]) {
      await writeJson(PATHS.insumos, next);
    },
  };
}

export async function vendasRepo() {
  const list = await readJson<Venda[]>(PATHS.vendas, []);
  return {
    list,
    async save(next: Venda[]) {
      await writeJson(PATHS.vendas, next);
    },
  };
}

export async function inventoryRepo() {
  const list = await readJson<InventoryTxn[]>(PATHS.inventoryTxns, []);
  return {
    list,
    async save(next: InventoryTxn[]) {
      await writeJson(PATHS.inventoryTxns, next);
    },
    async append(txn: Omit<InventoryTxn, "id" | "createdAt">) {
      const current = await readJson<InventoryTxn[]>(PATHS.inventoryTxns, []);
      const next = [{ id: randomUUID(), createdAt: nowIso(), ...txn }, ...current];
      await writeJson(PATHS.inventoryTxns, next);
      return next[0]!;
    },
  };
}

export async function expensesRepo() {
  const list = await readJson<Expense[]>(PATHS.expenses, []);
  return {
    list,
    async save(next: Expense[]) {
      await writeJson(PATHS.expenses, next);
    },
  };
}

export async function computeReservedMap() {
  const inv = await inventoryRepo();
  return computeReservedByFilament(inv.list);
}

