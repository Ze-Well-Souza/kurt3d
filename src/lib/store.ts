import { useSyncExternalStore } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Status = "todo" | "printing" | "done" | "vendido" | "presente" | "falha";

export type Order = {
  id: string;
  client: string;
  project: string;
  quantity: number;
  timeMinutes: number;
  colors: string[];
  status: Status;
  valorRecebido?: number;
  destino?: "Kurtido e Vendido" | "Dado de Presente" | "Falha de Impressão";
};

export type Venda = {
  id: string;
  orderId: string;
  project: string;
  client: string;
  valor: number;
  custo: number;
  depreciacao: number;
  data: string;
};

export type Filamento = {
  id: string;
  nome: string;
  pesoInicial: number;
  pesoAtual: number;
  precoPago: number;
};

// ─── Reactive store ─────────────────────────────────────────────────────────

type Listener = () => void;

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    get: () => state,
    set(updater: T | ((prev: T) => T)) {
      state = typeof updater === "function" ? (updater as (p: T) => T)(state) : updater;
      listeners.forEach((l) => l());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ─── Stores ──────────────────────────────────────────────────────────────────

const INITIAL_ORDERS: Order[] = [
  { id: "o1", client: "Marina Souza", project: "Chaveiros Toy Story", quantity: 12, timeMinutes: 270, colors: ["yellow", "cyan", "green"], status: "todo" },
  { id: "o2", client: "Pedro Lima", project: "Vaso Geométrico", quantity: 2, timeMinutes: 480, colors: ["pink", "white"], status: "todo" },
  { id: "o3", client: "Atelier Bambu", project: "Suporte de Celular", quantity: 6, timeMinutes: 180, colors: ["black", "magenta"], status: "printing" },
  { id: "o4", client: "Joana Reis", project: "Dragão Articulado", quantity: 1, timeMinutes: 600, colors: ["green", "yellow"], status: "printing" },
  { id: "o5", client: "Lucas Pereira", project: "Coração Decorativo", quantity: 20, timeMinutes: 150, colors: ["pink", "magenta", "purple"], status: "done" },
];

const ordersStore = createStore<Order[]>(INITIAL_ORDERS);
const vendasStore = createStore<Venda[]>([]);

const INITIAL_FILAMENTOS: Filamento[] = [
  { id: "cyan",    nome: "Filamento PLA Cyan",    pesoInicial: 1000, pesoAtual: 1000, precoPago: 120.00 },
  { id: "magenta", nome: "Filamento PLA Magenta", pesoInicial: 1000, pesoAtual: 1000, precoPago: 120.00 },
  { id: "yellow",  nome: "Filamento PLA Yellow",  pesoInicial: 1000, pesoAtual: 1000, precoPago: 120.00 },
];

const filamentosStore = createStore<Filamento[]>(INITIAL_FILAMENTOS);

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useOrders(): Order[] {
  return useSyncExternalStore(ordersStore.subscribe, ordersStore.get, ordersStore.get);
}

export function useVendas(): Venda[] {
  return useSyncExternalStore(vendasStore.subscribe, vendasStore.get, vendasStore.get);
}

export function useFilamentos(): Filamento[] {
  return useSyncExternalStore(filamentosStore.subscribe, filamentosStore.get, filamentosStore.get);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function abaterEstoqueFilamento(filamentoId: string, gramas: number) {
  filamentosStore.set((prev) =>
    prev.map((f) =>
      f.id === filamentoId
        ? { ...f, pesoAtual: Math.max(0, f.pesoAtual - gramas) }
        : f,
    ),
  );
}

export function setOrders(updater: Order[] | ((prev: Order[]) => Order[])) {
  ordersStore.set(updater);
}

export function addOrder(order: Order) {
  ordersStore.set((prev) => [...prev, order]);
}

export function updateOrderStatus(id: string, status: Status) {
  ordersStore.set((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
}

export function finalizarDestino(
  id: string,
  destino: "Kurtido e Vendido" | "Dado de Presente" | "Falha de Impressão",
  valorRecebido?: number,
) {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order) return;

  const statusMap: Record<typeof destino, Status> = {
    "Kurtido e Vendido": "vendido",
    "Dado de Presente": "presente",
    "Falha de Impressão": "falha",
  };

  ordersStore.set((prev) =>
    prev.map((o) =>
      o.id === id ? { ...o, status: statusMap[destino], destino, valorRecebido } : o,
    ),
  );

  if (destino === "Kurtido e Vendido" && valorRecebido !== undefined) {
    const custos = estimateOrderCost(order);
    vendasStore.set((prev) => [
      {
        id: `v${Date.now()}`,
        orderId: order.id,
        project: order.project,
        client: order.client,
        valor: valorRecebido,
        custo: custos.total,
        depreciacao: custos.depreciacao,
        data: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  // Deduct filament stock on failure (wasted print)
  if (destino === "Falha de Impressão") {
    // Estimate ~5g per unit wasted, deduct from first matching color filament
    const wastedGrams = 5 * order.quantity;
    const matchedColor = order.colors.find((c) =>
      filamentosStore.get().some((f) => f.id === c),
    );
    if (matchedColor) {
      abaterEstoqueFilamento(matchedColor, wastedGrams);
    }
  }
}

/**
 * Simple cost estimate for an order based on time + filament assumptions.
 * Uses average filament cost R$120/kg and standard energy/depreciation rates.
 */
function estimateOrderCost(order: Order) {
  const tempoH = order.timeMinutes / 60;
  const energia = tempoH * 0.095 * 0.75;
  const depreciacao = tempoH * 0.70;
  const filamento = (120 / 1000) * 5 * order.quantity;
  const fixo = 0.20 * order.quantity;
  const total = filamento + energia + depreciacao + fixo;
  return { total, energia, depreciacao, filamento, fixo };
}
