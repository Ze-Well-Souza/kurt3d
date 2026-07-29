import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  resumirFluxoCaixa,
  resumoDiarioFluxoCaixa,
  resumoSemanalFluxoCaixa,
  startOfWeekIso,
} from "./cash-flow";
import type { Expense, OrderPayment } from "./types";

// Helpers de fixture com os campos mínimos relevantes.
function pagamento(parcial: Partial<OrderPayment>): OrderPayment {
  return {
    id: parcial.id ?? "p1",
    orderId: parcial.orderId ?? "o1",
    valor: parcial.valor ?? 100,
    metodo: parcial.metodo ?? "Pix",
    data: parcial.data ?? "2026-07-27",
    observacao: null,
    registradoPor: null,
    createdAt: "2026-07-27T12:00:00.000Z",
  };
}

function despesa(parcial: Partial<Expense>): Expense {
  return {
    id: parcial.id ?? "e1",
    source: parcial.source ?? "manual",
    refId: "ref",
    valor: parcial.valor ?? 10,
    data: parcial.data ?? "2026-07-27",
    descricao: "teste",
    categoria: null,
  };
}

describe("cash-flow (fluxo de caixa)", () => {
  it("calcula receita, despesas de material e lucro líquido do período", () => {
    const pagamentos = [
      pagamento({ id: "p1", valor: 150, data: "2026-07-27" }),
      pagamento({ id: "p2", valor: 50.5, data: "2026-07-28" }),
      pagamento({ id: "p3", valor: 999, data: "2026-06-01" }), // fora do período
    ];
    const despesas = [
      despesa({ id: "e1", source: "insumo", valor: 40, data: "2026-07-27" }),
      despesa({ id: "e2", source: "falha", valor: 10.25, data: "2026-07-28" }),
      despesa({ id: "e3", source: "manual", valor: 30, data: "2026-07-28" }),
      despesa({ id: "e4", source: "manual", valor: 500, data: "2026-06-01" }), // fora
    ];

    const resumo = resumirFluxoCaixa(pagamentos, despesas, "2026-07-27", "2026-08-02");

    expect(resumo.totalRecebido).toBe(200.5);
    expect(resumo.despesasMaterial).toBe(50.25); // insumo + falha
    expect(resumo.despesasOutras).toBe(30);
    expect(resumo.despesasTotal).toBe(80.25);
    expect(resumo.lucroLiquido).toBe(120.25);
    expect(resumo.qtdPagamentos).toBe(2);
  });

  it("normaliza timestamps ISO para data ao filtrar o período", () => {
    const pagamentos = [pagamento({ valor: 80, data: "2026-07-27" })];
    const despesas = [despesa({ source: "insumo", valor: 20, data: "2026-07-27T15:30:00.000Z" })];

    const resumo = resumirFluxoCaixa(pagamentos, despesas, "2026-07-27", "2026-07-27");

    expect(resumo.totalRecebido).toBe(80);
    expect(resumo.despesasMaterial).toBe(20);
    expect(resumo.lucroLiquido).toBe(60);
  });

  it("startOfWeekIso retorna a segunda-feira da semana", () => {
    expect(startOfWeekIso("2026-07-28")).toBe("2026-07-27"); // terça → segunda
    expect(startOfWeekIso("2026-07-27")).toBe("2026-07-27"); // segunda → segunda
    expect(startOfWeekIso("2026-08-02")).toBe("2026-07-27"); // domingo → segunda anterior
  });

  it("addDaysIso soma dias atravessando o fim do mês", () => {
    expect(addDaysIso("2026-07-27", 6)).toBe("2026-08-02");
    expect(addDaysIso("2026-07-27", -7)).toBe("2026-07-20");
  });

  it("resumo semanal agrupa por semana (segunda a domingo), da mais recente para a mais antiga", () => {
    const pagamentos = [
      pagamento({ id: "p1", valor: 100, data: "2026-07-28" }), // semana atual
      pagamento({ id: "p2", valor: 40, data: "2026-07-21" }), // semana anterior
    ];
    const despesas = [despesa({ source: "insumo", valor: 25, data: "2026-07-29" })];

    const semanas = resumoSemanalFluxoCaixa(pagamentos, despesas, {
      semanas: 2,
      referenciaIso: "2026-07-28",
    });

    expect(semanas).toHaveLength(2);
    expect(semanas[0].inicioSemana).toBe("2026-07-27");
    expect(semanas[0].fimSemana).toBe("2026-08-02");
    expect(semanas[0].totalRecebido).toBe(100);
    expect(semanas[0].lucroLiquido).toBe(75);
    expect(semanas[1].inicioSemana).toBe("2026-07-20");
    expect(semanas[1].totalRecebido).toBe(40);
  });

  it("resumo diário retorna apenas os pagamentos do dia", () => {
    const pagamentos = [
      pagamento({ id: "p1", valor: 60, data: "2026-07-28" }),
      pagamento({ id: "p2", valor: 90, data: "2026-07-27" }),
    ];

    const dia = resumoDiarioFluxoCaixa(pagamentos, [], "2026-07-28");

    expect(dia.data).toBe("2026-07-28");
    expect(dia.pagamentos).toHaveLength(1);
    expect(dia.pagamentos[0].id).toBe("p1");
    expect(dia.totalRecebido).toBe(60);
    expect(dia.lucroLiquido).toBe(60);
  });
});
