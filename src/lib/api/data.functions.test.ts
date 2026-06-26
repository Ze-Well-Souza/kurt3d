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

type ClientRepoMock = {
  list: any[];
  save: ReturnType<typeof vi.fn>;
};

let ordersRepoMock: OrderRepoMock;
let inventoryRepoMock: InventoryRepoMock;
let portfolioRepoMock: PortfolioRepoMock;
let clientsRepoMock: ClientRepoMock;

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
  clientsRepo: vi.fn(async () => clientsRepoMock),
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
    clientsRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
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

describe("client linking", () => {
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
    clientsRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
  });

  it("grava clientId estavel ao criar pedido com cliente selecionado", async () => {
    clientsRepoMock.list = [
      {
        id: "client-1",
        nome: "Cliente Oficial",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
      },
    ];

    const { addOrder } = await import("./data.functions");

    await addOrder({
      data: {
        client: "Nome digitado",
        clientId: "client-1",
        projectName: "Projeto",
        quantity: 1,
        timeMinutes: 30,
      },
    });

    expect(ordersRepoMock.save).toHaveBeenCalledTimes(1);
    const savedOrders = ordersRepoMock.save.mock.calls[0][0];
    expect(savedOrders[0].client).toBe("Nome digitado");
    expect(savedOrders[0].clientId).toBe("client-1");
  });

  it("reconcilia pedidos antigos sem clientId no snapshot quando o nome e unico", async () => {
    ordersRepoMock.list = [
      {
        id: "order-legacy",
        client: "Cliente Antigo",
        projectName: "Projeto",
        quantity: 1,
        timeMinutes: 30,
        status: "todo",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
        clientId: null,
      },
    ];
    clientsRepoMock.list = [
      {
        id: "client-legacy",
        nome: "Cliente Antigo",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
      },
    ];

    const { listSnapshot } = await import("./data.functions");

    const snapshot = await listSnapshot();

    expect(snapshot.orders[0].clientId).toBe("client-legacy");
    expect(ordersRepoMock.save).not.toHaveBeenCalled();
  });
});
