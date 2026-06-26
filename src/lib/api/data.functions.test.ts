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

type ExpenseRepoMock = {
  list: any[];
  save: ReturnType<typeof vi.fn>;
};

type InsumoRepoMock = {
  list: any[];
  save: ReturnType<typeof vi.fn>;
};

type LeadRepoMock = {
  list: any[];
  save: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

let ordersRepoMock: OrderRepoMock;
let inventoryRepoMock: InventoryRepoMock;
let portfolioRepoMock: PortfolioRepoMock;
let clientsRepoMock: ClientRepoMock;
let expensesRepoMock: ExpenseRepoMock;
let insumosRepoMock: InsumoRepoMock;
let leadsRepoMock: LeadRepoMock;

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
  expensesRepo: vi.fn(async () => expensesRepoMock),
  filamentoInstallmentsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  filamentoPaymentsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  filamentosHistoryRepo: vi.fn(async () => ({ list: [], save: vi.fn(), archive: vi.fn() })),
  filamentosRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  insumosRepo: vi.fn(async () => insumosRepoMock),
  inventoryRepo: vi.fn(async () => inventoryRepoMock),
  leadsRepo: vi.fn(async () => leadsRepoMock),
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
    expensesRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
    insumosRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
    leadsRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
      insert: vi.fn(async () => undefined),
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

  it("rejeita pedido com clientId explicito inexistente", async () => {
    clientsRepoMock.list = [];

    const { addOrder } = await import("./data.functions");

    await expect(addOrder({
      data: {
        client: "Cliente Invalido",
        clientId: "client-missing",
        projectName: "Projeto",
        quantity: 1,
        timeMinutes: 30,
      },
    })).rejects.toThrow("client_not_found");
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

  it("retorna apenas dados publicos no snapshot da landing", async () => {
    portfolioRepoMock.list = [
      {
        id: "project-1",
        nome: "Projeto Publico",
        categoria: "Chaveiro",
        custoRolo: 100,
        pesoRolo: 1000,
        pesoPeca: 10,
        tempoMin: 20,
        quantidade: 1,
        precoVenda: 15,
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
      },
    ];
    clientsRepoMock.list = [
      {
        id: "client-1",
        nome: "Cliente Sigiloso",
        whatsapp: "(11) 99999-9999",
        email: "privado@example.com",
        notas: "nao deve sair",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z",
      },
    ];

    const { listPublicSnapshot } = await import("./data.functions");

    const snapshot = await listPublicSnapshot();

    expect(snapshot).toMatchObject({
      portfolio: [
        expect.objectContaining({
          id: "project-1",
          nome: "Projeto Publico",
        }),
      ],
      settings: {},
    });
    expect("clients" in snapshot).toBe(false);
    expect("orders" in snapshot).toBe(false);
    expect("expenses" in snapshot).toBe(false);
  });
});

describe("insumos e leads", () => {
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
    expensesRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
    insumosRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
    };
    leadsRepoMock = {
      list: [],
      save: vi.fn(async () => undefined),
      insert: vi.fn(async () => undefined),
    };
  });

  it("atualiza o insumo e a despesa espelhada sem perder o vinculo", async () => {
    insumosRepoMock.list = [
      {
        id: "ins-1",
        nome: "Bico 0.4",
        dataCompra: "2026-06-01",
        quantidade: "1 un.",
        precoTotal: 19.9,
        linkProduto: null,
      },
    ];
    expensesRepoMock.list = [
      {
        id: "exp-1",
        source: "insumo",
        refId: "ins-1",
        valor: 19.9,
        data: "2026-06-01",
        descricao: "Compra de insumo: Bico 0.4",
        categoria: null,
      },
    ];

    const { updateInsumo } = await import("./data.functions");

    await updateInsumo({
      data: {
        id: "ins-1",
        nome: "Bico 0.6",
        dataCompra: "2026-06-10",
        quantidade: "2 un.",
        precoTotal: 29.9,
        linkProduto: "https://example.com/bico",
      },
    });

    expect(insumosRepoMock.save).toHaveBeenCalledTimes(1);
    expect(expensesRepoMock.save).toHaveBeenCalledTimes(1);
    const savedInsumos = insumosRepoMock.save.mock.calls[0][0];
    const savedExpenses = expensesRepoMock.save.mock.calls[0][0];
    expect(savedInsumos[0]).toMatchObject({
      id: "ins-1",
      nome: "Bico 0.6",
      dataCompra: "2026-06-10",
      quantidade: "2 un.",
      precoTotal: 29.9,
      linkProduto: "https://example.com/bico",
    });
    expect(savedExpenses[0]).toMatchObject({
      id: "exp-1",
      refId: "ins-1",
      valor: 29.9,
      data: "2026-06-10",
      descricao: "Compra de insumo: Bico 0.6",
    });
  });

  it("converte lead em cliente sem apagar o lead e sem duplicar cliente existente", async () => {
    leadsRepoMock.list = [
      {
        id: "lead-1",
        nome: "Maria",
        whatsapp: "(11) 99999-0000",
        mensagem: "Quero 20 chaveiros",
        linkProjeto: "https://example.com/modelo",
        imagens: null,
        createdAt: "2026-06-20T10:00:00.000Z",
      },
    ];
    clientsRepoMock.list = [
      {
        id: "client-1",
        nome: "Maria",
        whatsapp: null,
        email: null,
        notas: "Cliente recorrente",
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
    ];
    ordersRepoMock.list = [
      {
        id: "order-1",
        client: "Maria",
        clientId: null,
        projectName: "Pedido",
        quantity: 1,
        timeMinutes: 30,
        status: "todo",
        createdAt: "2026-06-20T10:00:00.000Z",
        updatedAt: "2026-06-20T10:00:00.000Z",
      },
    ];

    const { convertLeadToClient } = await import("./data.functions");

    const result = await convertLeadToClient({ data: { leadId: "lead-1" } });

    expect(result).toMatchObject({ ok: true, clientId: "client-1", created: false });
    expect(clientsRepoMock.save).toHaveBeenCalledTimes(1);
    expect(leadsRepoMock.save).not.toHaveBeenCalled();
    expect(leadsRepoMock.insert).not.toHaveBeenCalled();
    const savedClients = clientsRepoMock.save.mock.calls[0][0];
    expect(savedClients).toHaveLength(1);
    expect(savedClients[0].whatsapp).toBe("(11) 99999-0000");
    expect(savedClients[0].notas).toContain("Quero 20 chaveiros");
    expect(ordersRepoMock.save).toHaveBeenCalledTimes(1);
    const savedOrders = ordersRepoMock.save.mock.calls[0][0];
    expect(savedOrders[0].clientId).toBe("client-1");
  });
});
