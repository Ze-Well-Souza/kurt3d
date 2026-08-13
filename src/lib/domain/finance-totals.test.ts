import { describe, expect, it } from "vitest";
import {
  calcularTotaisFinanceiros,
  classificarDespesas,
  ehDespesaOperacional,
} from "./finance-totals";
import type { Expense, Insumo, InsumoPayment, Venda } from "./types";

// P1-6 — Painel e Finanças mostravam lucros diferentes para o mesmo mês porque
// cada tela tinha a própria noção de "despesa". Estes testes travam a regra
// única que as duas passaram a usar.

function despesa(over: Partial<Expense> = {}): Expense {
  return {
    id: "e1",
    source: "manual",
    refId: "r1",
    valor: 100,
    data: "2026-08-10",
    descricao: "Despesa",
    categoria: null,
    ...over,
  };
}

function insumo(over: Partial<Insumo> = {}): Insumo {
  return {
    id: "ins-1",
    nome: "Bico",
    dataCompra: "2026-08-01",
    quantidade: "1 un.",
    precoTotal: 100,
    classificacaoFinanceira: "operacional",
    ...over,
  };
}

function venda(over: Partial<Venda> = {}): Venda {
  return {
    id: "v1",
    orderId: "o1",
    projectName: "P",
    client: "C",
    valor: 500,
    custo: 200,
    depreciacao: 10,
    data: "2026-08-05T10:00:00.000Z",
    ...over,
  };
}

describe("classificarDespesas", () => {
  it("marca como investimento quando o insumo vinculado e investimento", () => {
    const [d] = classificarDespesas(
      [despesa({ source: "insumo", refId: "ins-1" })],
      [insumo({ classificacaoFinanceira: "investimento" })],
    );
    expect(d!.financialClass).toBe("investimento");
  });

  it("marca como investimento pela categoria, mesmo sem insumo vinculado", () => {
    const [d] = classificarDespesas([despesa({ categoria: "Investimento / Imobilizado" })], []);
    expect(d!.financialClass).toBe("investimento");
  });

  it("o resto e operacional", () => {
    const [d] = classificarDespesas([despesa()], []);
    expect(d!.financialClass).toBe("operacional");
  });
});

describe("ehDespesaOperacional", () => {
  it("exclui insumo que ja tem parcelamento proprio (evita contar duas vezes)", () => {
    const [d] = classificarDespesas([despesa({ source: "insumo", refId: "ins-1" })], [insumo()]);
    expect(ehDespesaOperacional(d!, new Set(["ins-1"]))).toBe(false);
    expect(ehDespesaOperacional(d!, new Set())).toBe(true);
  });

  it("exclui investimento", () => {
    const [d] = classificarDespesas([despesa({ categoria: "Investimento / Imobilizado" })], []);
    expect(ehDespesaOperacional(d!, new Set())).toBe(false);
  });
});

describe("calcularTotaisFinanceiros", () => {
  it("lucro = receita - custo - despesas operacionais", () => {
    const totais = calcularTotaisFinanceiros({
      vendas: [venda()],
      despesasClassificadas: classificarDespesas([despesa({ valor: 50 })], []),
      insumoPayments: [],
    });

    expect(totais).toMatchObject({
      receita: 500,
      custo: 200,
      despesasOperacionais: 50,
      investimentos: 0,
      lucro: 250,
    });
  });

  it("investimento nao entra no lucro, mas e reportado a parte", () => {
    const totais = calcularTotaisFinanceiros({
      vendas: [venda()],
      despesasClassificadas: classificarDespesas(
        [despesa({ valor: 2000, categoria: "Investimento / Imobilizado" })],
        [],
      ),
      insumoPayments: [],
    });

    expect(totais.investimentos).toBe(2000);
    expect(totais.despesasOperacionais).toBe(0);
    expect(totais.lucro).toBe(300); // 500 - 200
  });

  it("insumo parcelado nao e contado duas vezes", () => {
    const pagamento: InsumoPayment = {
      id: "pay-1",
      insumoId: "ins-1",
      formaPagamento: "parcelado",
      custoTotal: 100,
      parcelas: 2,
      dataParaPagamento: "2026-08-01",
      createdAt: "2026-08-01T00:00:00.000Z",
    };

    const totais = calcularTotaisFinanceiros({
      vendas: [venda()],
      despesasClassificadas: classificarDespesas(
        [despesa({ source: "insumo", refId: "ins-1", valor: 100 })],
        [insumo()],
      ),
      insumoPayments: [pagamento],
    });

    expect(totais.despesasOperacionais).toBe(0);
    expect(totais.lucro).toBe(300);
  });

  it("sem vendas nem despesas, tudo zero", () => {
    const totais = calcularTotaisFinanceiros({
      vendas: [],
      despesasClassificadas: [],
      insumoPayments: [],
    });
    expect(totais).toEqual({
      receita: 0,
      custo: 0,
      despesasOperacionais: 0,
      investimentos: 0,
      lucro: 0,
    });
  });
});
