import { describe, expect, it } from "vitest";
import { calcCostFromInputs, calcOrderCostHybrid } from "./cost";
import type { Filamento, Order, PortfolioProject } from "./types";

describe("cost", () => {
  it("calcula custo básico do portfólio", () => {
    const r = calcCostFromInputs({
      custoRolo: 120,
      pesoRolo: 1000,
      pesoPeca: 10,
      tempoMin: 60,
      quantidade: 10,
      precoVenda: 15,
    });
    expect(r.custoFilamento).toBeCloseTo(1.2, 6);
    expect(r.custoEnergia).toBeCloseTo(0.07125, 6);
    expect(r.custoDepreciacao).toBeCloseTo(0.7, 6);
    expect(r.custoFixo).toBeCloseTo(0.2, 6);
    expect(r.custoUnidade).toBeGreaterThan(0);
    expect(r.custoLote).toBeCloseTo(r.custoUnidade * 10, 6);
  });

  it("prioriza custo real por grama do filamento quando disponível", () => {
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
});

