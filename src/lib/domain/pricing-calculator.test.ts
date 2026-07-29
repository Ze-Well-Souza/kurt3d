import { describe, it, expect } from "vitest";
import { calcularPrecoImpressao3D, pricingInputSchema } from "./pricing-calculator";
import type { AppSettings } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";

// Configuração fixa para tornar os testes determinísticos.
const settings: AppSettings = {
  ...DEFAULT_APP_SETTINGS,
  consumoKw: 0.1, // 100W
  tarifaEnergiaKwh: 1.0, // R$ 1,00/kWh
  depreciacaoHora: 2.0, // R$ 2,00/h
};

// Rolo de R$ 100 com 1000g → R$ 0,10/g
const filamento = { precoPago: 100, pesoInicial: 1000 };

describe("calcularPrecoImpressao3D", () => {
  it("calcula o preço final com todos os componentes da fórmula", () => {
    const r = calcularPrecoImpressao3D(
      filamento,
      {
        pesoGramas: 100, // 100g × R$0,10 = R$ 10,00
        tempoImpressaoMin: 120, // 2h → energia 2×0,1×1 = R$ 0,20 | depreciação 2×2 = R$ 4,00
        tempoSetupMin: 15,
        tempoAcabamentoMin: 15, // 0,5h × R$ 20 = R$ 10,00
        valorHoraTrabalho: 20,
        margemFalhaPercent: 10, // base 24,20 × 10% = R$ 2,42
        margemLucroPercent: 50, // total 26,62 × 50% = R$ 13,31
      },
      settings,
    );

    expect(r.custoFilamento).toBe(10);
    expect(r.custoEnergia).toBe(0.2);
    expect(r.custoDepreciacao).toBe(4);
    expect(r.custoMaoDeObra).toBe(10);
    expect(r.custoBase).toBe(24.2);
    expect(r.valorMargemFalha).toBe(2.42);
    expect(r.custoTotal).toBe(26.62);
    expect(r.valorMargemLucro).toBe(13.31);
    expect(r.precoFinal).toBe(39.93);
    expect(r.custoPorGrama).toBe(0.1);
  });

  it("usa defaults de margem (5% falha / 30% lucro) e zera mão de obra quando omitida", () => {
    const r = calcularPrecoImpressao3D(
      filamento,
      { pesoGramas: 50, tempoImpressaoMin: 60 },
      settings,
    );
    // base = 5 (filamento) + 0,1 (energia) + 2 (depreciação) = 7,10
    expect(r.custoMaoDeObra).toBe(0);
    expect(r.custoBase).toBe(7.1);
    expect(r.custoTotal).toBe(7.46); // +5%
    expect(r.precoFinal).toBe(9.69); // +30%
  });

  it("rejeita peso da peça zero ou negativo", () => {
    expect(() =>
      calcularPrecoImpressao3D(filamento, { pesoGramas: 0, tempoImpressaoMin: 60 }, settings),
    ).toThrow();
  });

  it("rejeita filamento com peso inicial inválido (evita divisão por zero)", () => {
    expect(() =>
      calcularPrecoImpressao3D(
        { precoPago: 100, pesoInicial: 0 },
        { pesoGramas: 50, tempoImpressaoMin: 60 },
        settings,
      ),
    ).toThrow("peso inicial");
  });

  it("rejeita margens fora dos limites via schema", () => {
    expect(
      pricingInputSchema.safeParse({
        pesoGramas: 50,
        tempoImpressaoMin: 60,
        margemFalhaPercent: 150,
      }).success,
    ).toBe(false);
    expect(
      pricingInputSchema.safeParse({
        pesoGramas: 50,
        tempoImpressaoMin: 60,
        margemLucroPercent: -1,
      }).success,
    ).toBe(false);
  });
});
