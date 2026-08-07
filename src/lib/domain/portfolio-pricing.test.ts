import { describe, expect, it } from "vitest";
import {
  calcPortfolioPricing,
  calcAdvancedPortfolioPricing,
  type AdvancedPortfolioCalculatorInput,
} from "./portfolio-pricing";
import { DEFAULT_APP_SETTINGS } from "./types";
import type { AppSettings, CalculatorFilamentoInput, CalculatorExtraCost } from "./types";

// ── Fixtures ─────────────────────────────────────────────────────────────────
const s: AppSettings = {
  ...DEFAULT_APP_SETTINGS,
  consumoKw: 0.095,
  tarifaEnergiaKwh: 0.75,
  depreciacaoHora: 0.70,
  custoFixoUnidade: 0.20,
};

function makeFilamento(overrides: Partial<CalculatorFilamentoInput> = {}): CalculatorFilamentoInput {
  return {
    id: crypto.randomUUID(),
    source: "manual",
    marca: "Generic",
    cor: "Preto",
    precoRolo: 100,
    pesoRolo: 1000,
    pesoUsado: 100,
    ...overrides,
  };
}

function makeExtra(overrides: Partial<CalculatorExtraCost> = {}): CalculatorExtraCost {
  return { id: crypto.randomUUID(), nome: "Embalagem", custo: 5, quantidade: 2, ...overrides };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("calcAdvancedPortfolioPricing", () => {
  // ─── CASO 1: Básico single-filamento (modo unit) ──────────────────────────
  it("CASO 1 — single-filamento modo unit com margem", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 120,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 120,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      unidadesPorImpressao: 1,
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 50,
      filamentos: [{ ...makeFilamento(), precoRolo: 120, pesoRolo: 1000, pesoUsado: 100 }],
      settings: s,
    });

    // Filamento: (120/1000)*100 = R$12.00
    expect(r.custoFilamentosDetalhado).toBeCloseTo(12, 2);
    // Energia: 1 × (120/60) × 0.095 × 0.75 = 2 × 0.07125 = 0.1425
    // Depreciação: 1 × (120/60) × (3000/2000) = 2 × 1.5 = 3.00
    // Fixo: 0.20 × 1 = 0.20
    // custoBaseLote = 12 + 0.1425 + 3.00 + 0.20 = 15.3425
    // precoComMargem = 15.3425 × 1.50 = 23.01375
    expect(r.precoSugerido).toBeGreaterThan(20);
    expect(r.precoSugerido).toBeLessThan(25);
    expect(r.custoFilamentosDetalhado).toBeCloseTo(12, 1);
  });

  // ─── CASO 2: Multi-filamento (4 filamentos do exemplo Bambu) ──────────────
  it("CASO 2 — multi-filamento 4 itens total 792g a R$20/kg = R$15,85", () => {
    const filamentos: CalculatorFilamentoInput[] = [
      { ...makeFilamento(), id: "f1", pesoUsado: 214.14, precoRolo: 20, pesoRolo: 1000 },
      { ...makeFilamento(), id: "f2", pesoUsado: 35.50, precoRolo: 20, pesoRolo: 1000 },
      { ...makeFilamento(), id: "f3", pesoUsado: 288.31, precoRolo: 20, pesoRolo: 1000 },
      { ...makeFilamento(), id: "f4", pesoUsado: 254.59, precoRolo: 20, pesoRolo: 1000 },
    ];
    const totalGrams = filamentos.reduce((a, f) => a + f.pesoUsado, 0);
    expect(totalGrams).toBeCloseTo(792.54, 1);

    const r = calcAdvancedPortfolioPricing({
      custoRolo: 20,
      pesoRolo: 1000,
      pesoEntrada: 792.54,
      tempoEntradaMin: 120,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      filamentos,
      settings: s,
    });

    // (20/1000) × 792.54 = 15.8508
    expect(r.custoFilamentosDetalhado).toBeCloseTo(15.85, 2);
  });

  // ─── CASO 3: Slicer mode / qtd=24, 4/placa ────────────────────────────────
  it("CASO 3 — slicer mode 24 peças, 4/placa → 6 impressões", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 400, // 4 peças × 100g cada na placa
      tempoEntradaMin: 480, // 8h tempo total da placa no fatiador
      quantidade: 24,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "slicer",
      unidadesPorImpressao: 4,
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      filamentos: [makeFilamento()],
      settings: s,
    });

    expect(r.pesoUnitario).toBeCloseTo(100, 1);   // 400/4
    expect(r.tempoUnitario).toBeCloseTo(120, 1);   // 480/4
    expect(r.impressoesLote).toBe(6);               // ceil(24/4)
  });

  // ─── CASO 4: Desperdício 10% ──────────────────────────────────────────────
  it("CASO 4 — desperdício 10% sobre custo base", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 10,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      filamentos: [makeFilamento()],
      settings: s,
    });

    // custoBaseLote = filamento(10) + energia + depreciação + fixo(0.20)
    // custoPerda = custoBaseLote × 0.10
    expect(r.custoPerda).toBeGreaterThan(1);       // pelo menos R$ 1 de perda
    expect(r.custoLote).toBeGreaterThan(r.custoBaseLote!);
    expect(r.custoLote).toBeCloseTo(r.custoBaseLote! * 1.10, 0);
  });

  // ─── CASO 5: Taxa gateway 10% + margem 50% ──────────────────────────────
  it("CASO 5 — taxa gateway 10% com margem 50%: divisão inversa", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 50,
      taxaGateway: 10,
      filamentos: [makeFilamento()],
      settings: s,
    });

    // custoUnidade × 1.50 = precoComMargem
    // precoSugerido = precoComMargem / (1 - 0.10) = precoComMargem / 0.90
    const precoComMargem = r.custoUnidade * 1.50;
    expect(r.precoSugerido).toBeCloseTo(precoComMargem / 0.90, 2);
    expect(r.taxaGatewayAplicada).toBeGreaterThan(0);
  });

  // ─── CASO 6: Gateway 0% → sem divisão ─────────────────────────────────────
  it("CASO 6 — taxa gateway 0%: sem divisão extra", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 50,
      taxaGateway: 0,
      filamentos: [makeFilamento()],
      settings: s,
    });

    expect(r.taxaGatewayAplicada).toBe(0);
    expect(r.precoSugerido).toBeCloseTo(r.custoUnidade * 1.50, 1);
  });

  // ─── CASO 7: Mão de obra 2h × R$25 ────────────────────────────────────────
  it("CASO 7 — mão de obra 2h × R$25 = R$50", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      custoTrabalhoHoras: 2,
      custoTrabalhoValorHora: 25,
      filamentos: [makeFilamento()],
      settings: s,
    });

    expect(r.custoTrabalho).toBeCloseTo(50, 2);
  });

  // ─── CASO 8: Custos extras 2 itens ────────────────────────────────────────
  it("CASO 8 — custos extras: (5×2) + (10×1) = 20", () => {
    const extras: CalculatorExtraCost[] = [
      makeExtra({ custo: 5, quantidade: 2 }),
      makeExtra({ custo: 10, quantidade: 1 }),
    ];
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 0,
      tempoEntradaMin: 0,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      custosExtras: extras,
      filamentos: [],
      settings: s,
    });

    expect(r.custoExtraTotal).toBeCloseTo(20, 2);
  });

  // ─── CASO 9: Preset A1 150W vs override kW ──────────────────────────────
  it("CASO 9 — preset A1 = 0.15kW; override muda consumo", () => {
    const rDefault = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      filamentos: [makeFilamento()],
      settings: s,
    });
    // A1 = 150W = 0.15 kW (override das settings 0.095)
    expect(rDefault.consumoKw).toBe(0.15);

    const rOverride = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 0,
      consumoKwOverride: 0.2,
      filamentos: [makeFilamento()],
      settings: s,
    });
    expect(rOverride.consumoKw).toBe(0.2);
    // Energia com override maior deve ser maior
    expect(rOverride.custoEnergia).toBeGreaterThan(rDefault.custoEnergia);
  });

  // ─── CASO 10: Depreciação com preço/vida impressora ─────────────────────
  it("CASO 10 — depreciação: R$5299 / 5000h = R$1,06/h, 48.5h → ~R$51,41", () => {
    // Simula o exemplo do relatório: 48.5h de impressão
    // Usamos slicer mode com valores que produzam ~48.5h
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 2910, // 48.5h = 2910 min
      quantidade: 1,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 5299,
      vidaUtilHoras: 5000,
      margemPercent: 0,
      filamentos: [makeFilamento()],
      settings: s,
    });

    expect(r.amortHora).toBeCloseTo(1.0598, 2); // 5299/5000
    // Depreciação lote = 1 × (2910/60) × 1.0598 ≈ 48.5 × 1.06 = 51.41
    const depreTotal = r.custoDepreciacao * r.impressoesLote;
    expect(depreTotal).toBeCloseTo(51.41, 0);
  });

  // ─── CASO 11: Lucro líquido com precoVenda vs fallback precoSugerido ────
  it("CASO 11 — lucroLiquido usa precoVenda; lucroLiquidoEfetivo usa fallback precoSugerido", () => {
    // Com precoVenda = 0, receitaTotal = 0, lucroLiquido = 0 - custoLote (negativo)
    const rSemVenda = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 10,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 30,
      filamentos: [makeFilamento()],
      settings: s,
    });
    expect(rSemVenda.receitaTotal).toBe(0);
    expect(rSemVenda.lucroLiquido).toBeLessThan(0); // prejuízo sem preço
    // lucroLiquidoEfetivo usa precoSugerido como fallback → deve ser positivo
    expect(rSemVenda.lucroLiquidoEfetivo).toBeDefined();
    expect(rSemVenda.lucroLiquidoEfetivo!).toBeGreaterThan(0);

    // Com precoVenda = precoSugerido, ambos devem ser iguais
    const rComVenda = calcAdvancedPortfolioPricing({
      custoRolo: 100,
      pesoRolo: 1000,
      pesoEntrada: 100,
      tempoEntradaMin: 60,
      quantidade: 10,
      precoVenda: rSemVenda.precoSugerido,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 30,
      filamentos: [makeFilamento()],
      settings: s,
    });
    expect(rComVenda.lucroLiquido).toBeGreaterThan(0);
    expect(rComVenda.lucroLiquidoEfetivo).toBeCloseTo(rComVenda.lucroLiquido, 2);
  });

  // ─── CASO 12: Edge cases — qtd=0, pesoRolo=0, clampNumber ─────────────────
  it("CASO 12 — edge cases: sem NaN, Infinity ou divisão por zero", () => {
    const r = calcAdvancedPortfolioPricing({
      custoRolo: 0,
      pesoRolo: 0,
      pesoEntrada: 0,
      tempoEntradaMin: 0,
      quantidade: 0,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "unit",
      modeloPreset: "A1",
      precoImpressora: 0,
      vidaUtilHoras: 0,
      margemPercent: 0,
      filamentos: [],
      custosExtras: [],
      settings: s,
    });

    // Nada pode ser NaN ou Infinity
    expect(Number.isFinite(r.custoUnidade)).toBe(true);
    expect(Number.isFinite(r.custoLote)).toBe(true);
    expect(Number.isFinite(r.precoSugerido)).toBe(true);
    expect(Number.isFinite(r.lucroLiquido)).toBe(true);
    expect(Number.isFinite(r.custoFilamento)).toBe(true);
    expect(Number.isFinite(r.custoEnergia)).toBe(true);
    expect(Number.isFinite(r.custoDepreciacao)).toBe(true);
    expect(Number.isFinite(r.custoPerda)).toBe(true);

    // Com qtd=0, valores por unidade devem ser 0
    expect(r.custoUnidade).toBe(0);
    expect(r.impressoesLote).toBe(0);
    expect(r.custoLote).toBe(0);
  });
});

// ── Testes legados mantidos (calcPortfolioPricing single-filamento) ──────────
describe("calcPortfolioPricing (legado)", () => {
  it("calcula o lote a partir dos dados do fatiador", () => {
    const result = calcPortfolioPricing({
      custoRolo: 85,
      pesoRolo: 1000,
      pesoEntrada: 64.05,
      tempoEntradaMin: 105,
      quantidade: 25,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "slicer",
      unidadesPorImpressao: 1,
      modeloPreset: "A1",
      precoImpressora: 5299,
      vidaUtilHoras: 2000,
      margemPercent: 100,
    });

    expect(result.pesoUnitario).toBeCloseTo(64.05, 2);
    expect(result.tempoUnitario).toBeCloseTo(105, 2);
    expect(result.impressoesLote).toBe(25);
    expect(result.custoUnidade).toBeGreaterThan(0);
    expect(result.custoLote).toBeCloseTo(result.custoUnidade * 25, 2);
    expect(result.precoSugerido).toBeCloseTo(result.custoUnidade * 2, 2);
  });

  it("divide o fatiamento em media por unidade quando ha varias pecas na mesma placa", () => {
    const result = calcPortfolioPricing({
      custoRolo: 120,
      pesoRolo: 1000,
      pesoEntrada: 80,
      tempoEntradaMin: 120,
      quantidade: 25,
      precoVenda: 0,
      perdaPercent: 0,
      entryMode: "slicer",
      unidadesPorImpressao: 4,
      modeloPreset: "A1",
      precoImpressora: 3000,
      vidaUtilHoras: 2000,
      margemPercent: 30,
    });

    expect(result.pesoUnitario).toBeCloseTo(20, 2);
    expect(result.tempoUnitario).toBeCloseTo(30, 2);
    expect(result.impressoesLote).toBe(7);
    expect(result.custoEnergia).toBeGreaterThan(0);
    expect(result.custoDepreciacao).toBeGreaterThan(0);
  });
});
