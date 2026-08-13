import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilamentoPaymentInstallment, InsumoPaymentInstallment } from "../../domain/types";

// ═══════════════════════════════════════════════════════════════════════════
// P0-2 — quitação de lote não pode gravar valor negativo nem pagar a mais
// ═══════════════════════════════════════════════════════════════════════════
// `settlePayment` distribuía o valor informado sem nunca descontar o saldo:
// pagava cada parcela integralmente e jogava `remaining - distributed` na
// última — um número negativo sempre que a quitação era parcial.
//
// Com 3 parcelas de R$ 100 e quitação de R$ 150, o resultado era:
//   parcela 1: R$ 100 (paga)   parcela 2: R$ 100 (paga)   parcela 3: R$ -50
// ou seja, R$ 200 registrados para R$ 150 recebidos, e um saldo devedor de
// R$ 150 numa parcela de R$ 100.
//
// O mesmo código estava duplicado em settleInsumoPayment, então os dois são
// testados lado a lado — a duplicação (P2-1) é exatamente o motivo do bug
// existir em dobro.

type Installment = FilamentoPaymentInstallment | InsumoPaymentInstallment;

const filamentoInstallments: { list: Installment[]; update: ReturnType<typeof vi.fn> } = {
  list: [],
  update: vi.fn(),
};
const insumoInstallments: { list: Installment[]; update: ReturnType<typeof vi.fn> } = {
  list: [],
  update: vi.fn(),
};
const filamentoEvents = { list: [] as any[], insert: vi.fn() };
const insumoEvents = { list: [] as any[], insert: vi.fn() };

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
  requireSession: vi.fn(async () => "test-user-id"),
}));

vi.mock("../../server/mutation-guard.server", () => ({
  checkMutationRateLimit: vi.fn(async () => undefined),
}));

vi.mock("../../server/repositories.server", () => ({
  filamentoInstallmentsRepo: vi.fn(async () => filamentoInstallments),
  filamentoPaymentEventsRepo: vi.fn(async () => filamentoEvents),
  filamentoPaymentsRepo: vi.fn(async () => ({ list: [], insert: vi.fn(), update: vi.fn() })),
  insumoInstallmentsRepo: vi.fn(async () => insumoInstallments),
  insumoPaymentEventsRepo: vi.fn(async () => insumoEvents),
  insumoPaymentsRepo: vi.fn(async () => ({ list: [], insert: vi.fn(), update: vi.fn() })),
}));

function parcelas(valores: number[], pagos: (number | null)[] = []): Installment[] {
  return valores.map((valor, i) => ({
    id: `p${i + 1}`,
    paymentId: "pay-1",
    numero: i + 1,
    valor,
    vencimento: `2026-0${i + 1}-10`,
    pago: (pagos[i] ?? 0) >= valor,
    dataPagamento: pagos[i] ? "2026-01-05" : null,
    valorPago: pagos[i] ?? null,
    observacao: null,
  }));
}

/** Estado final das parcelas, aplicando os update() capturados sobre a lista. */
function estadoFinal(repo: { list: Installment[]; update: ReturnType<typeof vi.fn> }) {
  const porId = new Map(repo.list.map((i) => [i.id, i]));
  for (const call of repo.update.mock.calls) porId.set(call[0].id, call[0]);
  return [...porId.values()].sort((a, b) => a.numero - b.numero);
}

function totalRegistradoEmEventos(events: { insert: ReturnType<typeof vi.fn> }) {
  return events.insert.mock.calls.reduce((s, c) => s + c[0].valor, 0);
}

beforeEach(() => {
  vi.clearAllMocks();
  filamentoInstallments.list = [];
  insumoInstallments.list = [];
});

describe.each([
  {
    nome: "filamento",
    repo: filamentoInstallments,
    events: filamentoEvents,
    fn: async () => (await import("./payments.functions")).settlePayment,
  },
  {
    nome: "insumo",
    repo: insumoInstallments,
    events: insumoEvents,
    fn: async () => (await import("./payments.functions")).settleInsumoPayment,
  },
])("quitacao de lote ($nome)", ({ repo, events, fn }) => {
  it("quitacao parcial nunca grava valorPago negativo", async () => {
    repo.list = parcelas([100, 100, 100]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", totalPago: 150, dataPagamento: "2026-08-13" } });

    const final = estadoFinal(repo);
    for (const p of final) {
      expect(p.valorPago ?? 0).toBeGreaterThanOrEqual(0);
      expect(p.valorPago ?? 0).toBeLessThanOrEqual(p.valor);
    }
  });

  it("quitacao parcial distribui exatamente o valor informado", async () => {
    repo.list = parcelas([100, 100, 100]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", totalPago: 150, dataPagamento: "2026-08-13" } });

    const total = estadoFinal(repo).reduce((s, p) => s + (p.valorPago ?? 0), 0);
    expect(total).toBe(150);
    expect(totalRegistradoEmEventos(events)).toBe(150);
  });

  it("quitacao parcial quita da primeira em diante e nao toca nas seguintes", async () => {
    repo.list = parcelas([100, 100, 100]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", totalPago: 150, dataPagamento: "2026-08-13" } });

    const [p1, p2, p3] = estadoFinal(repo);
    expect({ valorPago: p1.valorPago, pago: p1.pago }).toEqual({ valorPago: 100, pago: true });
    expect({ valorPago: p2.valorPago, pago: p2.pago }).toEqual({ valorPago: 50, pago: false });
    expect({ valorPago: p3.valorPago, pago: p3.pago }).toEqual({ valorPago: null, pago: false });
  });

  it("quitacao total zera o saldo de todas as parcelas", async () => {
    repo.list = parcelas([100, 100, 100]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", dataPagamento: "2026-08-13" } });

    const final = estadoFinal(repo);
    expect(final.every((p) => p.pago)).toBe(true);
    expect(final.reduce((s, p) => s + (p.valorPago ?? 0), 0)).toBe(300);
    expect(totalRegistradoEmEventos(events)).toBe(300);
  });

  it("respeita pagamento parcial ja existente na parcela", async () => {
    repo.list = parcelas([100, 100], [30, null]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", totalPago: 100, dataPagamento: "2026-08-13" } });

    const [p1, p2] = estadoFinal(repo);
    expect(p1.valorPago).toBe(100); // 30 que ja tinha + 70
    expect(p2.valorPago).toBe(30); // os 30 restantes do orcamento
    expect(totalRegistradoEmEventos(events)).toBe(100);
  });

  it("lida com centavos sem sobrar residuo", async () => {
    repo.list = parcelas([33.33, 33.33, 33.34]);
    const settle = await fn();

    await settle({ data: { paymentId: "pay-1", dataPagamento: "2026-08-13" } });

    const total = estadoFinal(repo).reduce((s, p) => s + (p.valorPago ?? 0), 0);
    expect(total).toBeCloseTo(100, 2);
    expect(estadoFinal(repo).every((p) => p.pago)).toBe(true);
  });

  it("recusa valor maior que o saldo do lote", async () => {
    repo.list = parcelas([100, 100]);
    const settle = await fn();

    await expect(
      settle({ data: { paymentId: "pay-1", totalPago: 500, dataPagamento: "2026-08-13" } }),
    ).rejects.toThrow(/maior que o saldo/i);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("recusa valor zero ou negativo", async () => {
    repo.list = parcelas([100]);
    const settle = await fn();

    await expect(
      settle({ data: { paymentId: "pay-1", totalPago: 0, dataPagamento: "2026-08-13" } }),
    ).rejects.toThrow(/maior que zero/i);
  });
});
