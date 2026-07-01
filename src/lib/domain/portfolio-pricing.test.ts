import { describe, expect, it } from "vitest";
import { calcPortfolioPricing } from "./portfolio-pricing";

describe("calcPortfolioPricing", () => {
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
