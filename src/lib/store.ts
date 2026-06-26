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
  sku: string;
  marca: string;
  cor: string;
  nome: string; // derived: "PLA Marca Cor" — kept for backwards compat in UI
  material: string;
  pesoInicial: number;
  pesoAtual: number;
  precoPago: number;
  dataCompra: string; // ISO date (yyyy-mm-dd)
};

export type Insumo = {
  id: string;
  nome: string;
  dataCompra: string;
  quantidade: string; // free text: "500ml", "10 un.", etc.
  precoPago: number;
};

export type PortfolioProject = {
  id: string;
  nome: string;
  categoria: string;
  linkModelo?: string;
  custoRolo: number;
  pesoRolo: number;
  pesoPeca: number;
  tempoMin: number;
  quantidade: number;
  precoVenda: number;
};

// ─── Reactive store ─────────────────────────────────────────────────────────

type Listener = () => void;

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function createStore<T>(key: string, fallback: T) {
  let state = loadLocal<T>(key, fallback);
  const listeners = new Set<Listener>();

  return {
    get: () => state,
    set(updater: T | ((prev: T) => T)) {
      state = typeof updater === "function" ? (updater as (p: T) => T)(state) : updater;
      try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* quota */ }
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

const ordersStore = createStore<Order[]>("kurti:orders", INITIAL_ORDERS);
const vendasStore = createStore<Venda[]>("kurti:vendas", []);

const INITIAL_FILAMENTOS: Filamento[] = [
  { id: "cyan",    sku: "FIL-001", marca: "Bambu Lab", cor: "Cyan",    nome: "PLA Bambu Lab Cyan",    material: "PLA", pesoInicial: 1000, pesoAtual: 1000, precoPago: 120, dataCompra: "" },
  { id: "magenta", sku: "FIL-002", marca: "Bambu Lab", cor: "Magenta", nome: "PLA Bambu Lab Magenta", material: "PLA", pesoInicial: 1000, pesoAtual: 1000, precoPago: 120, dataCompra: "" },
  { id: "yellow",  sku: "FIL-003", marca: "Bambu Lab", cor: "Yellow",  nome: "PLA Bambu Lab Yellow",  material: "PLA", pesoInicial: 1000, pesoAtual: 1000, precoPago: 120, dataCompra: "" },
];

const filamentosStore = createStore<Filamento[]>("kurti:filamentos", INITIAL_FILAMENTOS);
const insumosStore = createStore<Insumo[]>("kurti:insumos", []);
const portfolioStore = createStore<PortfolioProject[]>("kurti:portfolio", []);

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

export function useInsumos(): Insumo[] {
  return useSyncExternalStore(insumosStore.subscribe, insumosStore.get, insumosStore.get);
}

export function usePortfolio(): PortfolioProject[] {
  return useSyncExternalStore(portfolioStore.subscribe, portfolioStore.get, portfolioStore.get);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export function addPortfolioProject(project: PortfolioProject) {
  portfolioStore.set((prev) => [project, ...prev]);
}

export function removePortfolioProject(id: string) {
  portfolioStore.set((prev) => prev.filter((p) => p.id !== id));
}

export function abaterEstoqueFilamento(filamentoId: string, gramas: number) {
  filamentosStore.set((prev) =>
    prev.map((f) =>
      f.id === filamentoId
        ? { ...f, pesoAtual: Math.max(0, f.pesoAtual - gramas) }
        : f,
    ),
  );
}

export function addFilamento(filamento: Filamento) {
  filamentosStore.set((prev) => [...prev, filamento]);
}

export function removeFilamento(id: string) {
  filamentosStore.set((prev) => prev.filter((f) => f.id !== id));
}

export function nextFilamentoSku(): string {
  const nums = filamentosStore.get()
    .map((f) => /^FIL-(\d+)$/i.exec(f.sku)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `FIL-${String(next).padStart(3, "0")}`;
}

export function addInsumo(insumo: Insumo) {
  insumosStore.set((prev) => [insumo, ...prev]);
}

export function removeInsumo(id: string) {
  insumosStore.set((prev) => prev.filter((i) => i.id !== id));
}

export function setOrders(updater: Order[] | ((prev: Order[]) => Order[])) {
  ordersStore.set(updater);
}

export function addOrder(order: Order) {
  ordersStore.set((prev) => [...prev, order]);
}

export function removeOrder(id: string) {
  const order = ordersStore.get().find((o) => o.id === id);
  
  // Se o pedido estava em produção e for excluído, o filamento já foi consumido
  // Neste caso, registramos como perda/falha para fins de controle
  if (order && order.status === "printing") {
    // O estoque já foi usado na impressão, então tratamos como falha
    const wastedGrams = 5 * order.quantity; // estimativa de 5g por unidade
    const matchedColor = order.colors.find((c) =>
      filamentosStore.get().some((f) => f.id === c),
    );
    if (matchedColor) {
      abaterEstoqueFilamento(matchedColor, wastedGrams);
    }
  }
  
  ordersStore.set((prev) => prev.filter((o) => o.id !== id));
}

function getFilamentoIdForColor(color: string): string | undefined {
  const filamentos = filamentosStore.get();
  const matched = filamentos.find((f) => f.cor.toLowerCase() === color.toLowerCase());
  return matched?.id;
}

export function updateOrderStatus(id: string, status: Status) {
  const order = ordersStore.get().find((o) => o.id === id);
  if (!order) return;
  
  const previousStatus = order.status;
  
  // Se estava em printing e vai para todo, precisamos liberar o estoque que foi reservado/usado
  // A lógica atual é: estoque é abatido apenas ao finalizar (vendido/presente/falha)
  // Portanto, ao mover de printing -> todo, não há nada a liberar formalmente
  // pois o sistema não faz reserva prévia, só abate no destino final
  
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

  if (destino === "Falha de Impressão") {
    const wastedGrams = 5 * order.quantity;
    const matchedColor = order.colors.find((c) =>
      filamentosStore.get().some((f) => f.id === c),
    );
    if (matchedColor) {
      abaterEstoqueFilamento(matchedColor, wastedGrams);
    }
  }
}

function estimateOrderCost(order: Order) {
  const tempoH = order.timeMinutes / 60;
  const energia = tempoH * 0.095 * 0.75;
  const depreciacao = tempoH * 0.70;
  const filamento = (120 / 1000) * 5 * order.quantity;
  const fixo = 0.20 * order.quantity;
  const total = filamento + energia + depreciacao + fixo;
  return { total, energia, depreciacao, filamento, fixo };
}
