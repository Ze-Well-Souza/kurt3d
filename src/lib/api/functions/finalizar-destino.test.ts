import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, Expense, Filamento, Order, Venda } from "../../domain/types";
import { DEFAULT_APP_SETTINGS } from "../../domain/types";

// ═══════════════════════════════════════════════════════════════════════════
// P0-5 — o custo da venda tem que respeitar as Configurações do estúdio
// ═══════════════════════════════════════════════════════════════════════════
// `finalizarDestino` chamava calcOrderCostHybrid sem repassar `settings`, então
// o domínio caía em DEFAULT_APP_SETTINGS. O valor gravado em vendas.custo e
// vendas.depreciacao ignorava a tarifa de energia, a depreciação por hora e o
// custo fixo configurados na tela de Configurações — e como Painel, Finanças e
// Relatórios calculam lucro a partir de venda.custo, o lucro de toda a operação
// saía errado sempre que os parâmetros diferissem do padrão de fábrica.
//
// Também cobre a segunda metade do achado: a despesa de "Falha de Impressão"
// só era criada quando existia projeto de portfólio vinculado, então pedido
// avulso que falhava não registrava perda de material nenhuma.

const ordersRepoMock = { list: [] as Order[], save: vi.fn(async () => undefined) };
const vendasRepoMock = { list: [] as Venda[], save: vi.fn(async () => undefined) };
const expensesRepoMock = { list: [] as Expense[], save: vi.fn(async () => undefined) };
const filamentosRepoMock = { list: [] as Filamento[], save: vi.fn(async () => undefined) };
const portfolioRepoMock = { list: [] as any[] };
let settingsMock: AppSettings = DEFAULT_APP_SETTINGS;

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: any = {
      inputValidator: () => chain,
      validator: () => chain,
      handler: (fn: any) => fn,
    };
    return chain;
  },
}));

vi.mock("../../server/require-session.server", () => ({
  requireSession: vi.fn(async () => "test-user"),
}));
vi.mock("../../server/mutation-guard.server", () => ({
  checkMutationRateLimit: vi.fn(async () => undefined),
}));
vi.mock("../../server/order-notifications.server", () => ({
  notifyOrderStatusChange: vi.fn(async () => ({ sent: false })),
}));
vi.mock("../../server/order-assets.server", () => ({
  createOrderAssetSignedUrl: vi.fn(),
  uploadOrderAssetToStorage: vi.fn(),
}));

vi.mock("../../server/repositories.server", () => ({
  ordersRepo: vi.fn(async () => ordersRepoMock),
  vendasRepo: vi.fn(async () => vendasRepoMock),
  expensesRepo: vi.fn(async () => expensesRepoMock),
  filamentosRepo: vi.fn(async () => filamentosRepoMock),
  portfolioRepo: vi.fn(async () => portfolioRepoMock),
  settingsRepo: vi.fn(async () => ({ settings: settingsMock, save: vi.fn() })),
  clientsRepo: vi.fn(async () => ({ list: [], save: vi.fn() })),
  inventoryRepo: vi.fn(async () => ({ list: [], append: vi.fn() })),
  orderPartsRepo: vi.fn(async () => ({ list: [], saveForOrder: vi.fn() })),
}));

const FILAMENTO: Filamento = {
  id: "fil-1",
  sku: "PLA-01",
  marca: "Voolt",
  cor: "Preto",
  material: "PLA",
  pesoInicial: 1000,
  pesoAtual: 800,
  precoPago: 100, // R$ 0,10 por grama
  dataCompra: "2026-01-01",
};

function pedido(over: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    client: "Cliente",
    projectName: "Peça",
    quantity: 2,
    timeMinutes: 60,
    status: "done",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    filamentoId: "fil-1",
    gramsPerUnit: 50,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ordersRepoMock.list = [];
  vendasRepoMock.list = [];
  expensesRepoMock.list = [];
  filamentosRepoMock.list = [FILAMENTO];
  portfolioRepoMock.list = [];
  settingsMock = DEFAULT_APP_SETTINGS;
});

describe("finalizarDestino — custo da venda", () => {
  it("usa os parametros de custo configurados, nao os padroes de fabrica", async () => {
    // Tarifa de energia e depreciação bem acima do padrão: se o handler
    // ignorar `settings`, o custo sai muito menor que o esperado.
    settingsMock = {
      ...DEFAULT_APP_SETTINGS,
      consumoKw: 0.5,
      tarifaEnergiaKwh: 2,
      depreciacaoHora: 5,
      custoFixoUnidade: 1,
    };
    ordersRepoMock.list = [pedido()];

    const { finalizarDestino } = await import("./orders.functions");
    await finalizarDestino({
      data: { orderId: "ord-1", destino: "Kurtido e Vendido", valorRecebido: 200 },
    });

    const venda = vendasRepoMock.save.mock.calls[0][0][0] as Venda;

    // por unidade: filamento 50g x R$0,10 = 5,00
    //              energia   (60/60) x 0,5 x 2 = 1,00
    //              deprec.   (60/60) x 5       = 5,00
    //              fixo                          1,00
    //              -> 12,00/un x 2 un = 24,00
    expect(venda.custo).toBeCloseTo(24, 2);
    expect(venda.depreciacao).toBeCloseTo(10, 2); // 5,00/un x 2 un

    // E confirma que o resultado difere do que sairia com os padrões — sem
    // isso o teste passaria mesmo com a regressão de volta.
    const comPadroes =
      (5 + (60 / 60) * DEFAULT_APP_SETTINGS.consumoKw * DEFAULT_APP_SETTINGS.tarifaEnergiaKwh +
        (60 / 60) * DEFAULT_APP_SETTINGS.depreciacaoHora +
        DEFAULT_APP_SETTINGS.custoFixoUnidade) *
      2;
    expect(venda.custo).not.toBeCloseTo(comPadroes, 2);
  });

  it("nao grava venda quando o destino nao e venda", async () => {
    ordersRepoMock.list = [pedido()];
    const { finalizarDestino } = await import("./orders.functions");

    await finalizarDestino({ data: { orderId: "ord-1", destino: "Dado de Presente" } });

    expect(vendasRepoMock.save).not.toHaveBeenCalled();
    expect(expensesRepoMock.save).not.toHaveBeenCalled();
  });

  it("recusa pedido que nao esta concluido", async () => {
    ordersRepoMock.list = [pedido({ status: "printing" })];
    const { finalizarDestino } = await import("./orders.functions");

    const res = await finalizarDestino({
      data: { orderId: "ord-1", destino: "Kurtido e Vendido", valorRecebido: 100 },
    });

    expect(res).toEqual({ ok: false, reason: "invalid_state" });
    expect(vendasRepoMock.save).not.toHaveBeenCalled();
  });
});

describe("finalizarDestino — perda por falha de impressao", () => {
  it("registra a perda em pedido avulso, sem projeto de portfolio", async () => {
    ordersRepoMock.list = [pedido()]; // sem portfolioProjectId
    const { finalizarDestino } = await import("./orders.functions");

    await finalizarDestino({ data: { orderId: "ord-1", destino: "Falha de Impressão" } });

    expect(expensesRepoMock.save).toHaveBeenCalledOnce();
    const despesa = expensesRepoMock.save.mock.calls[0][0][0] as Expense;
    expect(despesa.source).toBe("falha");
    expect(despesa.refId).toBe("ord-1");
    // 50g/un x 2 un = 100g x R$0,10 = R$ 10,00
    expect(despesa.valor).toBeCloseTo(10, 2);
    expect(despesa.categoria).toBe("Perda de Material");
  });

  it("usa o peso do projeto quando o pedido nao tem gramsPerUnit", async () => {
    portfolioRepoMock.list = [{ id: "proj-1", pesoPeca: 30, filamentoId: "fil-1" }];
    ordersRepoMock.list = [
      pedido({ gramsPerUnit: undefined, portfolioProjectId: "proj-1", quantity: 3 }),
    ];
    const { finalizarDestino } = await import("./orders.functions");

    await finalizarDestino({ data: { orderId: "ord-1", destino: "Falha de Impressão" } });

    const despesa = expensesRepoMock.save.mock.calls[0][0][0] as Expense;
    // 30g x 3 un = 90g x R$0,10 = R$ 9,00
    expect(despesa.valor).toBeCloseTo(9, 2);
  });

  it("nao gera despesa quando nao ha filamento vinculado", async () => {
    ordersRepoMock.list = [pedido({ filamentoId: undefined })];
    const { finalizarDestino } = await import("./orders.functions");

    await finalizarDestino({ data: { orderId: "ord-1", destino: "Falha de Impressão" } });

    expect(expensesRepoMock.save).not.toHaveBeenCalled();
  });
});
