import { beforeEach, describe, expect, it, vi } from "vitest";

type OrderRepoMock = {
  list: any[];
  save: ReturnType<typeof vi.fn>;
};

type InventoryRepoMock = {
  list: any[];
  append: ReturnType<typeof vi.fn>;
};

type PortfolioRepoMock = {
  list: any[];
};

let ordersRepoMock: OrderRepoMock;
let inventoryRepoMock: InventoryRepoMock;
let portfolioRepoMock: PortfolioRepoMock;

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = {
      inputValidator: () => chain,
      validator: () => chain,
      handler: (fn: any) => fn,
    };
    return chain;
  },
}));

vi.mock("../server/db.server", () => ({
  nowIso: () => "2026-06-26T12:00:00.000Z",
}));

vi.mock("../server/repositories.server", () => ({
  clientsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  expensesRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  filamentoInstallmentsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  filamentoPaymentsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  filamentosHistoryRepo: vi.fn(async () => ({ list: [], save: vi.fn(), archive: vi.fn() })),
  filamentosRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  insumosRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  inventoryRepo: vi.fn(async () => inventoryRepoMock),
  leadsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  ordersRepo: vi.fn(async () => ordersRepoMock),
  portfolioRepo: vi.fn(async () => portfolioRepoMock),
  settingsRepo: vi.fn(async () => ({ settings: {}, save: vi.fn() })),
  vendasRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
}));

describe("removeOrder", () => {
  beforeEach(() => {
    ordersRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
    inventoryRepoMock = {
      list: [],
      append: vi.fn(async () => undefined),
    };
    portfolioRepoMock = {
      list: [],
    };
  });

  it("libera o estoque reservado ao excluir pedido em andamento", async () => {
    ordersRepoMock.list = [
      {
        id: "order-1",
        client: "Cliente",
        projectName: "Projeto",
        quantity: 2,
        timeMinutes: 30,
        status: "printing",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
        filamentoId: "fil-1",
        gramsPerUnit: 15,
      },
    ];
    inventoryRepoMock.list = [
      { id: "tx-1", orderId: "order-1", filamentId: "fil-1", type: "reserve", grams: 30, createdAt: "2026-06-26T10:05:00.000Z" },
    ];

    const { removeOrder } = await import("./data.functions");

    await removeOrder({ data: { orderId: "order-1", reason: "cancelado" } });

    expect(inventoryRepoMock.append).toHaveBeenCalledTimes(1);
    expect(inventoryRepoMock.append).toHaveBeenCalledWith({
      orderId: "order-1",
      filamentId: "fil-1",
      type: "release",
      grams: 30,
    });
    expect(ordersRepoMock.save).toHaveBeenCalledWith([]);
  });

  it("nao libera estoque ao excluir pedido fora de andamento", async () => {
    ordersRepoMock.list = [
      {
        id: "order-2",
        client: "Cliente",
        projectName: "Projeto",
        quantity: 2,
        timeMinutes: 30,
        status: "todo",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
        filamentoId: "fil-1",
        gramsPerUnit: 15,
      },
    ];
    inventoryRepoMock.list = [
      { id: "tx-1", orderId: "order-2", filamentId: "fil-1", type: "reserve", grams: 30, createdAt: "2026-06-26T10:05:00.000Z" },
    ];

    const { removeOrder } = await import("./data.functions");

    await removeOrder({ data: { orderId: "order-2", reason: "cancelado" } });

    expect(inventoryRepoMock.append).not.toHaveBeenCalled();
    expect(ordersRepoMock.save).toHaveBeenCalledWith([]);
  });
});
