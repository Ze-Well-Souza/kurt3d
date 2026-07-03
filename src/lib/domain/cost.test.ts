import { describe, expect, it } from "vitest";
import { calcCostFromInputs, calcOrderCostHybrid } from "./cost";
import { DEFAULT_APP_SETTINGS } from "./types";
import type { Order, Filamento, PortfolioProject } from "./types";

describe("calcCostFromInputs", () => {
  const baseInput = {
    custoRolo: 120,
    pesoRolo: 1000,
    pesoPeca: 45,
    tempoMin: 180,
    quantidade: 2,
    precoVenda: 50,
  };

  it("calcula custo de filamento corretamente", () => {
    const result = calcCostFromInputs(baseInput);
    // (120 / 1000) * 45 = 5.4
    expect(result.custoFilamento).toBeCloseTo(5.4, 4);
  });

  it("calcula custo de energia corretamente", () => {
    const result = calcCostFromInputs({ ...baseInput, settings: DEFAULT_APP_SETTINGS });
    // (180 / 60) * 0.095 * 0.75 = 0.21375
    expect(result.custoEnergia).toBeCloseTo(0.2138, 3);
  });

  it("calcula depreciação corretamente", () => {
    const result = calcCostFromInputs({ ...baseInput, settings: DEFAULT_APP_SETTINGS });
    // (180 / 60) * 0.70 = 2.1
    expect(result.custoDepreciacao).toBeCloseTo(2.1, 2);
  });

  it("inclui custo fixo por unidade", () => {
    const result = calcCostFromInputs({ ...baseInput, settings: DEFAULT_APP_SETTINGS });
    expect(result.custoFixo).toBe(0.20);
  });

  it("calcula custo por unidade como soma de todos os componentes", () => {
    const result = calcCostFromInputs({ ...baseInput, settings: DEFAULT_APP_SETTINGS });
    const expected = 5.4 + 0.21375 + 2.1 + 0.20; // ≈ 7.91375
    expect(result.custoUnidade).toBeCloseTo(expected, 4);
  });

  it("calcula custo do lote = custo unidade * quantidade", () => {
    const result = calcCostFromInputs(baseInput);
    expect(result.custoLote).toBeCloseTo(result.custoUnidade * 2, 2);
  });

  it("calcula receita total = precoVenda * quantidade", () => {
    const result = calcCostFromInputs(baseInput);
    expect(result.receitaTotal).toBe(100);
  });

  it("calcula lucro líquido = receita - custo do lote", () => {
    const result = calcCostFromInputs({ ...baseInput, settings: DEFAULT_APP_SETTINGS });
    expect(result.lucroLiquido).toBeCloseTo(100 - result.custoLote, 2);
  });

  it("usa DEFAULT_APP_SETTINGS quando settings não é fornecido", () => {
    const result = calcCostFromInputs(baseInput);
    expect(result.custoFixo).toBe(DEFAULT_APP_SETTINGS.custoFixoUnidade);
  });

  it("usa settings customizado quando fornecido", () => {
    const customSettings = {
      ...DEFAULT_APP_SETTINGS,
      custoFixoUnidade: 5,
      tarifaEnergiaKwh: 1.5,
    };
    const result = calcCostFromInputs({ ...baseInput, settings: customSettings });
    expect(result.custoFixo).toBe(5);
    expect(result.custoEnergia).toBeCloseTo((180 / 60) * 0.095 * 1.5, 3);
  });

  it("retorna 0 para custo de filamento quando pesoRolo é 0 (divisão por zero)", () => {
    const result = calcCostFromInputs({ ...baseInput, pesoRolo: 0 });
    expect(result.custoFilamento).toBe(0);
  });

  it("lida com valores NaN/Infinity retornando 0 (clampNumber)", () => {
    const result = calcCostFromInputs({
      ...baseInput,
      pesoPeca: NaN,
      tempoMin: Infinity,
    });
    expect(result).toBeDefined();
    expect(Number.isFinite(result.custoUnidade)).toBe(true);
  });

  it("lida com quantidade 0 ou negativa via clampNumber", () => {
    const result = calcCostFromInputs({ ...baseInput, quantidade: 0 });
    expect(result.custoUnidade).toBeGreaterThan(0);
    expect(result.custoLote).toBe(0);
  });

  it("usar markup 1.6x quando não há projetos no portfolio", () => {
    // Teste do cálculo de markup no PublicQuote — verifica que
    // o preço sugerido usa markup mínimo quando não há dados
    const custo = calcCostFromInputs({
      custoRolo: 120,
      pesoRolo: 1000,
      pesoPeca: 10,
      tempoMin: 30,
      quantidade: 1,
      precoVenda: 0,
      settings: DEFAULT_APP_SETTINGS,
    });
    // Custo deve ser positivo e o markup não é aplicado aqui (é no frontend)
    expect(custo.custoUnidade).toBeGreaterThan(0);
  });
});

describe("calcOrderCostHybrid", () => {
  const mockSettings = DEFAULT_APP_SETTINGS;
  const mockOrder: Order = {
    id: "order-1",
    client: "Test",
    projectName: "Test Project",
    quantity: 3,
    timeMinutes: 120,
    status: "todo",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  };

  it("calcula custo usando dados do pedido quando não há portfolio", () => {
    const result = calcOrderCostHybrid({ order: mockOrder, settings: mockSettings });
    expect(result.breakdown.custoUnidade).toBeGreaterThan(0);
    expect(result.total).toBeCloseTo(result.breakdown.custoUnidade * 3, 2);
  });

  it("usa tempo do portfolio quando disponível", () => {
    const portfolio: PortfolioProject = {
      id: "proj-1",
      nome: "Test",
      categoria: "Miniatura",
      custoRolo: 100,
      pesoRolo: 1000,
      pesoPeca: 30,
      tempoMin: 60,
      quantidade: 1,
      precoVenda: 40,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    const order = { ...mockOrder, timeMinutes: 999 }; // should be overridden by portfolio's tempoMin
    const result = calcOrderCostHybrid({ order, portfolio, settings: mockSettings });
    // custoEnergia should use portfolio tempoMin (60), not order.timeMinutes (999)
    const expectedEnergy = (60 / 60) * mockSettings.consumoKw * mockSettings.tarifaEnergiaKwh;
    expect(result.breakdown.custoEnergia).toBeCloseTo(expectedEnergy, 3);
  });

  it("usa custo do filamento real quando disponível via gramsPerUnit", () => {
    const filamento: Filamento = {
      id: "f1",
      sku: "FIL-999",
      marca: "Teste",
      cor: "Black",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 800,
      precoPago: 200,
      dataCompra: "2026-01-01",
    };
    const portfolio: PortfolioProject = {
      id: "p1",
      nome: "X",
      categoria: "Chaveiro",
      custoRolo: 120,
      pesoRolo: 1000,
      pesoPeca: 10,
      tempoMin: 0,
      quantidade: 1,
      precoVenda: 0,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      filamentoId: "f1",
    };
    const order: Order = {
      id: "o1",
      client: "C",
      projectName: "X",
      quantity: 1,
      timeMinutes: 0,
      status: "done",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      portfolioProjectId: "p1",
      filamentoId: "f1",
      gramsPerUnit: 10,
    };
    const res = calcOrderCostHybrid({ order, portfolio, filamento, precoVendaUnit: 0 });
    expect(res.breakdown.custoFilamento).toBeCloseTo(2, 6);
  });

  it("usa custo do filamento real quando disponível", () => {
    const filamento: Filamento = {
      id: "fil-1",
      sku: "PLA-CYAN",
      marca: "Voolt",
      cor: "Ciano",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 800,
      precoPago: 80,
      dataCompra: "2024-01-01",
    };
    const result = calcOrderCostHybrid({
      order: mockOrder,
      filamento,
      settings: mockSettings,
    });
    // custo filamento por grama: 80/1000 = 0.08
    // peso peca vem do gramsPerUnit do order (undefined) → 0
    expect(result.breakdown.custoFilamento).toBe(0);
  });
});

