import { describe, expect, it } from "vitest";
import type {
  Filamento,
  FilamentoPayment,
  FilamentoPaymentInstallment,
  Insumo,
  InsumoPayment,
  InsumoPaymentInstallment,
} from "./types";
import {
  buildCurrentMonthInstallmentBreakdown,
  buildInstallmentAuditByMonth,
  buildScheduleEntries,
  computeInstallmentKpis,
  getPaymentProgress,
  getScheduleCounts,
  isPartialInstallment,
  getInstallmentRemainingAmount,
  getInstallmentPaidAmount,
} from "./finance-schedule";

type Fixture = {
  filamentos: Filamento[];
  insumos: Insumo[];
  filamentoPayments: FilamentoPayment[];
  insumoPayments: InsumoPayment[];
  filamentoInstallments: FilamentoPaymentInstallment[];
  insumoInstallments: InsumoPaymentInstallment[];
};

function buildFixture(): Fixture {
  const filamentos: Filamento[] = [
    {
      id: "fil-1",
      sku: "FTL-001",
      marca: "GenericPLA",
      cor: "Preta",
      material: "PLA",
      pesoInicial: 1000,
      pesoAtual: 1000,
      precoPago: 95,
      dataCompra: "2026-07-01",
      batchId: "batch-01",
      paymentId: "pay-fil-01",
    },
  ];
  const insumos: Insumo[] = [
    {
      id: "ins-1",
      nome: "Álcool 1L",
      dataCompra: "2026-07-01",
      quantidade: "1 un",
      precoTotal: 25,
      paymentId: "pay-ins-01",
      classificacaoFinanceira: "operacional",
    },
    {
      id: "ins-2",
      nome: "Bico Aço 0.4",
      dataCompra: "2026-06-20",
      quantidade: "1 un",
      precoTotal: 110,
      paymentId: "pay-ins-02",
      classificacaoFinanceira: "operacional",
    },
  ];
  const filamentoPayments: FilamentoPayment[] = [
    {
      id: "pay-fil-01",
      batchId: "batch-01",
      formaPagamento: "parcelado",
      custoTotal: 95,
      parcelas: 2,
      dataParaPagamento: "2026-07-01",
      createdAt: "2026-07-01T10:00:00.000Z",
    },
  ];
  const insumoPayments: InsumoPayment[] = [
    {
      id: "pay-ins-01",
      insumoId: "ins-1",
      formaPagamento: "a_vista",
      custoTotal: 25,
      parcelas: 1,
      dataParaPagamento: "2026-08-01",
      createdAt: "2026-07-01T10:00:00.000Z",
    },
    {
      id: "pay-ins-02",
      insumoId: "ins-2",
      formaPagamento: "parcelado",
      custoTotal: 110,
      parcelas: 2,
      dataParaPagamento: "2026-06-20",
      createdAt: "2026-06-20T10:00:00.000Z",
    },
  ];
  const filamentoInstallments: FilamentoPaymentInstallment[] = [
    {
      id: "inst-fil-01-01",
      paymentId: "pay-fil-01",
      numero: 1,
      valor: 47.5,
      vencimento: "2026-07-01",
      pago: true,
      dataPagamento: "2026-07-02",
      valorPago: 47.5,
      observacao: null,
    },
    {
      id: "inst-fil-01-02",
      paymentId: "pay-fil-01",
      numero: 2,
      valor: 47.5,
      vencimento: "2026-08-01",
      pago: false,
      dataPagamento: null,
      valorPago: null,
      observacao: null,
    },
  ];
  const insumoInstallments: InsumoPaymentInstallment[] = [
    {
      id: "inst-ins-01-01",
      paymentId: "pay-ins-01",
      numero: 1,
      valor: 25,
      vencimento: "2026-08-01",
      pago: false,
      dataPagamento: null,
      valorPago: null,
      observacao: null,
    },
    {
      id: "inst-ins-02-01",
      paymentId: "pay-ins-02",
      numero: 1,
      valor: 55,
      vencimento: "2026-06-20",
      pago: false,
      dataPagamento: null,
      valorPago: 10,
      observacao: null,
    },
    {
      id: "inst-ins-02-02",
      paymentId: "pay-ins-02",
      numero: 2,
      valor: 55,
      vencimento: "2026-07-20",
      pago: true,
      dataPagamento: "2026-07-20",
      valorPago: 55,
      observacao: null,
    },
  ];
  return {
    filamentos,
    insumos,
    filamentoPayments,
    insumoPayments,
    filamentoInstallments,
    insumoInstallments,
  };
}

describe("Cenário 1: vencimentos em 01/08 aparecem na listagem", () => {
  it("exibe parcelas com vencimento 2026-08-01 na view Pendentes mesmo com mês de referência julho/2026", () => {
    const f = buildFixture();
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    const ids = entries.map((e) => e.inst.id);
    expect(ids).toContain("inst-fil-01-02");
    expect(ids).toContain("inst-ins-01-01");
    const vencimentos = entries.map((e) => e.inst.vencimento);
    expect(vencimentos).toContain("2026-08-01");
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });

  it("mantém vencimentos de 01/08 visíveis mesmo navegando mês de referência para agosto", () => {
    const f = buildFixture();
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-08",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    const ids = entries.map((e) => e.inst.id);
    expect(ids).toContain("inst-fil-01-02");
    expect(ids).toContain("inst-ins-01-01");
  });
});

describe("Cenário 2: contas pagas não aparecem como pendentes nem se repetem em listagens de meses seguintes", () => {
  it("não inclui parcela paga (julho) na view Pendentes nem em nenhum mês futuro", () => {
    const f = buildFixture();
    const forJuly = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    expect(forJuly.map((e) => e.inst.id)).not.toContain("inst-fil-01-01");
    expect(forJuly.map((e) => e.inst.id)).not.toContain("inst-ins-02-02");

    const forAugust = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-08",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "paid",
      today: "2026-07-31",
    });
    const paidInAugust = forAugust.map((e) => e.inst.id);
    expect(paidInAugust).not.toContain("inst-fil-01-01");
    expect(paidInAugust).not.toContain("inst-ins-02-02");
  });

  it("não duplica entradas (id único) no escopo Todas (pending + paid ref month)", () => {
    const f = buildFixture();
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "all",
      today: "2026-07-31",
    });
    const ids = entries.map((e) => e.inst.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

describe("Cenário 3: parcelamentos pendentes do mês anterior aparecem corretamente", () => {
  it("exibe pendência parcial de junho (ins-2 parcela 1) como pendente/atrasada em julho", () => {
    const f = buildFixture();
    expect(isPartialInstallment(f.insumoInstallments[1])).toBe(true);
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    const oldPending = entries.find((e) => e.inst.id === "inst-ins-02-01");
    expect(oldPending).toBeTruthy();
    expect(oldPending?.overdue).toBe(true);
    const remaining = getInstallmentRemainingAmount(oldPending!.inst);
    expect(remaining).toBeCloseTo(45, 2);
  });

  it("KPI de parcelas pendentes e atrasadas computa pendências de qualquer mês", () => {
    const f = buildFixture();
    const allInstallments = [...f.filamentoInstallments, ...f.insumoInstallments];
    const referenceMonthInstallments = allInstallments.filter(
      (i) => i.vencimento.slice(0, 7) === "2026-07",
    );
    const kpis = computeInstallmentKpis({
      allInstallments,
      referenceMonthInstallments,
      allPaymentEvents: [],
      installmentKpiMonthAnchor: "2026-07",
      today: "2026-07-31",
    });
    expect(kpis.atrasadas).toBe(1);
    expect(kpis.pendente).toBeCloseTo(47.5 + 25 + 45, 2);
    expect(kpis.vencendoNoMes).toBe(0);
  });
});

describe("Cenário 4: novos custos/instalamentos integram a listagem sem conflitos", () => {
  it("acrescenta nova parcela de novo insumo sem colidir com ids existentes", () => {
    const f = buildFixture();
    const novoInsumo: Insumo = {
      id: "ins-99",
      nome: "Novo Insumo",
      dataCompra: "2026-07-31",
      quantidade: "1 un",
      precoTotal: 60,
      classificacaoFinanceira: "operacional",
      paymentId: "pay-ins-99",
    };
    const novoPagamento: InsumoPayment = {
      id: "pay-ins-99",
      insumoId: "ins-99",
      formaPagamento: "parcelado",
      custoTotal: 60,
      parcelas: 3,
      dataParaPagamento: "2026-07-31",
      createdAt: "2026-07-31T10:00:00.000Z",
    };
    const novasParcelas: InsumoPaymentInstallment[] = [
      {
        id: "inst-ins-99-01",
        paymentId: "pay-ins-99",
        numero: 1,
        valor: 20,
        vencimento: "2026-08-01",
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      },
      {
        id: "inst-ins-99-02",
        paymentId: "pay-ins-99",
        numero: 2,
        valor: 20,
        vencimento: "2026-09-01",
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      },
      {
        id: "inst-ins-99-03",
        paymentId: "pay-ins-99",
        numero: 3,
        valor: 20,
        vencimento: "2026-10-01",
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      },
    ];
    const insumos = [...f.insumos, novoInsumo];
    const insumoPayments = [...f.insumoPayments, novoPagamento];
    const insumoInstallments = [...f.insumoInstallments, ...novasParcelas];
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments,
      insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    const ids = entries.map((e) => e.inst.id);
    expect(ids).toContain("inst-ins-99-01");
    expect(ids).toContain("inst-ins-99-02");
    expect(ids).toContain("inst-ins-99-03");
    expect(ids.length).toBe(new Set(ids).size);
    const progressNovo = getPaymentProgress(insumoInstallments).get("pay-ins-99");
    expect(progressNovo).toMatchObject({
      totalInstallments: 3,
      paidInstallments: 0,
      totalAmount: 60,
      paidAmount: 0,
    });
  });

  it("contadores refletem novas parcelas pendentes sem inflar contagem de pagas", () => {
    const f = buildFixture();
    const insumoInstallments = [
      ...f.insumoInstallments,
      {
        id: "inst-ins-new",
        paymentId: "pay-ins-new",
        numero: 1,
        valor: 15,
        vencimento: "2026-08-10",
        pago: false,
        dataPagamento: null,
        valorPago: null,
        observacao: null,
      },
    ];
    const allInstallments = [...f.filamentoInstallments, ...insumoInstallments];
    const counts = getScheduleCounts({
      allInstallments,
      installmentKpiMonthAnchor: "2026-07",
    });
    expect(counts.pending).toBe(4);
    expect(counts.paid).toBe(2);
    expect(counts.total).toBe(6);
  });
});

describe("Não regressão: helper de parcial/pago/paidAmount", () => {
  it("limita valorPago ao valor da parcela e marca parcial corretamente", () => {
    const installment = { valor: 100, valorPago: 130, pago: false };
    expect(getInstallmentPaidAmount(installment)).toBe(100);
    expect(getInstallmentRemainingAmount(installment)).toBe(0);
    expect(isPartialInstallment({ ...installment, pago: false, valorPago: 30 })).toBe(true);
    expect(isPartialInstallment({ ...installment, pago: true, valorPago: 100 })).toBe(false);
  });
});

describe("Não regressão: KPI Pagas do mês usa eventos + fallback legacy", () => {
  it("soma pagamentos via evento + legado no mês de referência", () => {
    const f = buildFixture();
    const allInstallments = [...f.filamentoInstallments, ...f.insumoInstallments];
    const referenceMonthInstallments = allInstallments.filter(
      (i) => i.vencimento.slice(0, 7) === "2026-07",
    );
    const allPaymentEvents = [
      {
        id: "evt-01",
        installmentId: "inst-ins-02-02",
        paymentId: "pay-ins-02",
        tipo: "pagamento" as const,
        valor: 55,
        dataPagamento: "2026-07-20",
        observacao: null,
        createdAt: "2026-07-20T10:00:00.000Z",
      },
    ];
    const kpis = computeInstallmentKpis({
      allInstallments,
      referenceMonthInstallments,
      allPaymentEvents,
      installmentKpiMonthAnchor: "2026-07",
      today: "2026-07-31",
    });
    expect(kpis.pagoNoMes).toBeCloseTo(55 + 47.5, 2);
  });
});

describe("Cobertura nova: KPI atrasadasValor + Auditoria por mês + DataCompra + Breakdown mês", () => {
  it("KPI atrasadasValor soma apenas saldo remanescente de parcelas atrasadas", () => {
    const f = buildFixture();
    const allInstallments = [...f.filamentoInstallments, ...f.insumoInstallments];
    const referenceMonthInstallments = allInstallments.filter(
      (i) => i.vencimento.slice(0, 7) === "2026-07",
    );
    const kpis = computeInstallmentKpis({
      allInstallments,
      referenceMonthInstallments,
      allPaymentEvents: [],
      installmentKpiMonthAnchor: "2026-07",
      today: "2026-07-31",
    });
    expect(kpis.atrasadas).toBe(1);
    expect(kpis.atrasadasValor).toBeCloseTo(45, 2);
  });

  it("Auditoria por mês separa corretamente 2026-06, 07 e 08 com total/pago/pendente", () => {
    const f = buildFixture();
    const allInstallments = [...f.filamentoInstallments, ...f.insumoInstallments];
    const rows = buildInstallmentAuditByMonth({ allInstallments });
    expect(rows.map((r) => r.dueMonth)).toStrictEqual(["2026-06", "2026-07", "2026-08"]);
    const jun = rows.find((r) => r.dueMonth === "2026-06")!;
    const jul = rows.find((r) => r.dueMonth === "2026-07")!;
    const ago = rows.find((r) => r.dueMonth === "2026-08")!;
    expect(jun).toMatchObject({
      countTotal: 1,
      countPaid: 0,
      countPending: 1,
      countPartial: 1,
    });
    expect(jun.valorTotal).toBeCloseTo(55);
    expect(jun.valorPago).toBeCloseTo(10);
    expect(jun.valorPendente).toBeCloseTo(45);
    expect(jul).toMatchObject({ countTotal: 2, countPaid: 2, countPending: 0 });
    expect(jul.valorTotal).toBeCloseTo(47.5 + 55);
    expect(jul.valorPago).toBeCloseTo(47.5 + 55);
    expect(ago).toMatchObject({ countTotal: 2, countPaid: 0, countPending: 2 });
    expect(ago.valorTotal).toBeCloseTo(47.5 + 25);
    expect(ago.valorPendente).toBeCloseTo(47.5 + 25);
  });

  it("ScheduleEntry.dataCompra preenchida: filamento usa lote, insumo usa insumo.dataCompra, fallback dataParaPagamento", () => {
    const f = buildFixture();
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-07",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "all",
      today: "2026-07-31",
    });
    const filPendente = entries.find((e) => e.inst.id === "inst-fil-01-02")!;
    const insJulho = entries.find((e) => e.inst.id === "inst-ins-02-02")!;
    const insAgo = entries.find((e) => e.inst.id === "inst-ins-01-01")!;
    expect(filPendente.dataCompra).toBe("2026-07-01");
    expect(insJulho.dataCompra).toBe("2026-06-20");
    expect(insAgo.dataCompra).toBe("2026-07-01");
  });

  it("Breakdown do mês (08/2026) mostra Total devido / Já pago / A pagar + lista com DataCompra", () => {
    const f = buildFixture();
    const entries = buildScheduleEntries({
      filamentoInstallments: f.filamentoInstallments,
      insumoInstallments: f.insumoInstallments,
      installmentKpiMonthAnchor: "2026-08",
      filamentoPayments: f.filamentoPayments,
      filamentos: f.filamentos,
      insumoPayments: f.insumoPayments,
      insumos: f.insumos,
      filamentoPaymentProgress: getPaymentProgress(f.filamentoInstallments),
      insumoPaymentProgress: getPaymentProgress(f.insumoInstallments),
      installmentViewFilter: "pending",
      today: "2026-07-31",
    });
    const breakdown = buildCurrentMonthInstallmentBreakdown({
      entries,
      dueMonth: "2026-08",
    });
    expect(breakdown.dueMonth).toBe("2026-08");
    expect(breakdown.valorTotalDevido).toBeCloseTo(47.5 + 25);
    expect(breakdown.valorJaPago).toBe(0);
    expect(breakdown.valorApagarNoMes).toBeCloseTo(47.5 + 25);
    expect(breakdown.vencimentos.map((v) => v.id)).toStrictEqual([
      "inst-fil-01-02",
      "inst-ins-01-01",
    ]);
    expect(breakdown.vencimentos[0].dataCompra).toBe("2026-07-01");
    expect(breakdown.vencimentos[1].dataCompra).toBe("2026-07-01");
  });

  it("Auditoria com filterMonths retorna apenas meses pedidos", () => {
    const f = buildFixture();
    const allInstallments = [...f.filamentoInstallments, ...f.insumoInstallments];
    const rows = buildInstallmentAuditByMonth({
      allInstallments,
      filterMonths: ["2026-07", "2026-08"],
    });
    expect(rows.map((r) => r.dueMonth)).toStrictEqual(["2026-07", "2026-08"]);
  });
});
