import type {
  Filamento,
  FilamentoPayment,
  FilamentoPaymentInstallment,
  Insumo,
  InsumoPayment,
  InsumoPaymentInstallment,
} from "./types";

export type PaymentProgress = {
  totalInstallments: number;
  paidInstallments: number;
  totalAmount: number;
  paidAmount: number;
};

export type ScheduleEntryKind = "filamento" | "insumo";

export type ScheduleEntry<Kind extends ScheduleEntryKind = ScheduleEntryKind> = {
  kind: Kind;
  inst: Kind extends "filamento" ? FilamentoPaymentInstallment : InsumoPaymentInstallment;
  payment: (Kind extends "filamento" ? FilamentoPayment : InsumoPayment) | null;
  dataCompra: string | null;
  label: string;
  overdue: boolean;
  progress: PaymentProgress;
};

export type InstallmentViewFilter = "pending" | "paid" | "all";

export function getInstallmentPaidAmount(installment: { valor: number; valorPago: number | null }) {
  return Math.min(installment.valorPago ?? 0, installment.valor);
}

export function getInstallmentRemainingAmount(installment: {
  valor: number;
  valorPago: number | null;
}) {
  return Math.max(installment.valor - getInstallmentPaidAmount(installment), 0);
}

export function isPartialInstallment(installment: {
  pago: boolean;
  valor: number;
  valorPago: number | null;
}) {
  return !installment.pago && getInstallmentPaidAmount(installment) > 0;
}

function getEventSignedAmount(event: { tipo: "pagamento" | "estorno"; valor: number }) {
  return event.tipo === "estorno" ? -event.valor : event.valor;
}

export function computeInstallmentKpis(params: {
  allInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  referenceMonthInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  allPaymentEvents: {
    tipo: "pagamento" | "estorno";
    valor: number;
    dataPagamento: string;
    installmentId: string;
  }[];
  installmentKpiMonthAnchor: string;
  today: string;
}) {
  const {
    allInstallments,
    referenceMonthInstallments,
    allPaymentEvents,
    installmentKpiMonthAnchor,
    today,
  } = params;
  let pendente = 0;
  let vencendoNoMes = 0;
  let atrasadas = 0;
  let atrasadasValor = 0;
  for (const inst of allInstallments) {
    if (!inst.pago) {
      const remainingAmount = getInstallmentRemainingAmount(inst);
      pendente += remainingAmount;
      if (inst.vencimento < today) {
        atrasadas += 1;
        atrasadasValor += remainingAmount;
      }
    }
  }
  for (const inst of referenceMonthInstallments) {
    if (!inst.pago) {
      const remainingAmount = getInstallmentRemainingAmount(inst);
      if (inst.vencimento >= today) {
        vencendoNoMes += remainingAmount;
      }
    }
  }
  const installmentIdsWithEventThisMonth = new Set(
    allPaymentEvents
      .filter((event) => event.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor)
      .map((event) => event.installmentId),
  );
  const paidFallbackNoMes = allInstallments
    .filter(
      (inst) =>
        !!inst.dataPagamento &&
        inst.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor &&
        getInstallmentPaidAmount(inst) > 0 &&
        !installmentIdsWithEventThisMonth.has(inst.id),
    )
    .reduce((sum, inst) => sum + getInstallmentPaidAmount(inst), 0);
  const paidFromEventsNoMes = allPaymentEvents
    .filter((event) => event.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor)
    .reduce((sum, event) => sum + getEventSignedAmount(event), 0);
  const pagoNoMes = paidFromEventsNoMes + paidFallbackNoMes;
  return { pendente, pagoNoMes, vencendoNoMes, atrasadas, atrasadasValor };
}

export function buildScheduleEntries(params: {
  filamentoInstallments: FilamentoPaymentInstallment[];
  insumoInstallments: InsumoPaymentInstallment[];
  installmentKpiMonthAnchor: string;
  filamentoPayments: FilamentoPayment[];
  filamentos: Filamento[];
  insumoPayments: InsumoPayment[];
  insumos: Insumo[];
  filamentoPaymentProgress: Map<string, PaymentProgress>;
  insumoPaymentProgress: Map<string, PaymentProgress>;
  installmentViewFilter: InstallmentViewFilter;
  today: string;
}): ScheduleEntry[] {
  const {
    filamentoInstallments,
    insumoInstallments,
    installmentKpiMonthAnchor,
    filamentoPayments,
    filamentos,
    insumoPayments,
    insumos,
    filamentoPaymentProgress,
    insumoPaymentProgress,
    installmentViewFilter,
    today,
  } = params;

  const buildFilamentEntry = (i: FilamentoPaymentInstallment): ScheduleEntry<"filamento"> => {
    const payment = filamentoPayments.find((p) => p.id === i.paymentId) ?? null;
    const batchFilamentos = payment ? filamentos.filter((f) => f.batchId === payment.batchId) : [];
    const label = batchFilamentos.map((f) => f.sku).join(", ");
    const dataCompra = batchFilamentos.length
      ? (batchFilamentos
          .map((f) => f.dataCompra)
          .sort()
          .shift() ?? null)
      : payment
        ? payment.dataParaPagamento
        : null;
    const progress = filamentoPaymentProgress.get(i.paymentId) ?? {
      totalInstallments: 0,
      paidInstallments: 0,
      totalAmount: 0,
      paidAmount: 0,
    };
    return {
      kind: "filamento",
      inst: i,
      payment,
      dataCompra,
      label,
      overdue: !i.pago && i.vencimento <= today,
      progress,
    };
  };
  const buildInsumoEntry = (i: InsumoPaymentInstallment): ScheduleEntry<"insumo"> => {
    const payment = insumoPayments.find((p) => p.id === i.paymentId) ?? null;
    const insumo = payment ? insumos.find((item) => item.id === payment.insumoId) : null;
    const dataCompra = insumo?.dataCompra ?? payment?.dataParaPagamento ?? null;
    const progress = insumoPaymentProgress.get(i.paymentId) ?? {
      totalInstallments: 0,
      paidInstallments: 0,
      totalAmount: 0,
      paidAmount: 0,
    };
    return {
      kind: "insumo",
      inst: i,
      payment,
      dataCompra,
      label: insumo?.nome ?? "",
      overdue: !i.pago && i.vencimento <= today,
      progress,
    };
  };

  const pendingFilamentEntries = filamentoInstallments
    .filter((i) => !i.pago)
    .map(buildFilamentEntry);
  const pendingInsumoEntries = insumoInstallments.filter((i) => !i.pago).map(buildInsumoEntry);
  const pendingEntries = [...pendingFilamentEntries, ...pendingInsumoEntries];

  const paidFilamentEntries = filamentoInstallments
    .filter((i) => {
      if (!i.pago) return false;
      const effectiveMonth = (i.dataPagamento ?? i.vencimento).slice(0, 7);
      return effectiveMonth === installmentKpiMonthAnchor;
    })
    .map(buildFilamentEntry);
  const paidInsumoEntries = insumoInstallments
    .filter((i) => {
      if (!i.pago) return false;
      const effectiveMonth = (i.dataPagamento ?? i.vencimento).slice(0, 7);
      return effectiveMonth === installmentKpiMonthAnchor;
    })
    .map(buildInsumoEntry);
  const paidEntries = [...paidFilamentEntries, ...paidInsumoEntries];

  const seenIds = new Set<string>();
  const allEntries = [...pendingEntries, ...paidEntries].filter((entry) => {
    if (seenIds.has(entry.inst.id)) return false;
    seenIds.add(entry.inst.id);
    return true;
  });
  const visibleEntries = allEntries.filter(({ inst }) => {
    if (installmentViewFilter === "pending") return !inst.pago;
    if (installmentViewFilter === "paid") return inst.pago;
    return true;
  });
  return visibleEntries.sort((a, b) => {
    if (installmentViewFilter === "paid") {
      return (b.inst.dataPagamento ?? b.inst.vencimento).localeCompare(
        a.inst.dataPagamento ?? a.inst.vencimento,
      );
    }
    if (installmentViewFilter === "all" && a.inst.pago !== b.inst.pago) {
      return a.inst.pago ? 1 : -1;
    }
    const aDate = a.inst.pago ? (a.inst.dataPagamento ?? a.inst.vencimento) : a.inst.vencimento;
    const bDate = b.inst.pago ? (b.inst.dataPagamento ?? b.inst.vencimento) : b.inst.vencimento;
    return aDate.localeCompare(bDate);
  });
}

export function getScheduleCounts(params: {
  allInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  installmentKpiMonthAnchor: string;
}) {
  const { allInstallments, installmentKpiMonthAnchor } = params;
  const pendingItems = allInstallments.filter((item) => !item.pago);
  const paidInRefMonth = allInstallments.filter((item) => {
    if (!item.pago) return false;
    const effectiveMonth = (item.dataPagamento ?? item.vencimento).slice(0, 7);
    return effectiveMonth === installmentKpiMonthAnchor;
  });
  const partialPending = pendingItems.filter((item) => isPartialInstallment(item)).length;
  const partialPaid = paidInRefMonth.filter((item) => isPartialInstallment(item)).length;
  return {
    pending: pendingItems.length,
    paid: paidInRefMonth.length,
    partial: partialPending + partialPaid,
    total: pendingItems.length + paidInRefMonth.length,
  };
}

export function getPaymentProgress<
  T extends { pago: boolean; valor: number; valorPago: number | null; paymentId: string },
>(installments: T[]): Map<string, PaymentProgress> {
  const grouped = new Map<string, PaymentProgress>();
  for (const installment of installments) {
    const current = grouped.get(installment.paymentId) ?? {
      totalInstallments: 0,
      paidInstallments: 0,
      totalAmount: 0,
      paidAmount: 0,
    };
    current.totalInstallments += 1;
    current.totalAmount += installment.valor;
    current.paidAmount += getInstallmentPaidAmount(installment);
    if (installment.pago) current.paidInstallments += 1;
    grouped.set(installment.paymentId, current);
  }
  return grouped;
}

export type InstallmentAuditMonthRow = {
  dueMonth: string;
  countTotal: number;
  countPaid: number;
  countPending: number;
  countPartial: number;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
};

export function buildInstallmentAuditByMonth(params: {
  allInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  filterMonths?: string[];
}): InstallmentAuditMonthRow[] {
  const { allInstallments, filterMonths } = params;
  const rows = new Map<string, InstallmentAuditMonthRow>();
  const ensure = (dueMonth: string) => {
    if (!rows.has(dueMonth)) {
      rows.set(dueMonth, {
        dueMonth,
        countTotal: 0,
        countPaid: 0,
        countPending: 0,
        countPartial: 0,
        valorTotal: 0,
        valorPago: 0,
        valorPendente: 0,
      });
    }
    return rows.get(dueMonth)!;
  };
  for (const inst of allInstallments) {
    const dueMonth = inst.vencimento.slice(0, 7);
    if (filterMonths && !filterMonths.includes(dueMonth)) continue;
    const row = ensure(dueMonth);
    const paid = getInstallmentPaidAmount(inst);
    const remaining = getInstallmentRemainingAmount(inst);
    row.countTotal += 1;
    row.valorTotal += inst.valor;
    row.valorPago += paid;
    row.valorPendente += remaining;
    if (inst.pago) row.countPaid += 1;
    else row.countPending += 1;
    if (isPartialInstallment(inst)) row.countPartial += 1;
  }
  return Array.from(rows.values()).sort((a, b) => a.dueMonth.localeCompare(b.dueMonth));
}

export type CurrentMonthInstallmentBreakdown = {
  dueMonth: string;
  valorTotalDevido: number;
  valorJaPago: number;
  valorApagarNoMes: number;
  vencimentos: {
    vencimento: string;
    tipo: ScheduleEntryKind;
    label: string;
    dataCompra: string | null;
    valor: number;
    pago: boolean;
    pagoValor: number;
    restante: number;
    id: string;
  }[];
};

export function buildCurrentMonthInstallmentBreakdown(params: {
  entries: ScheduleEntry[];
  dueMonth: string;
}): CurrentMonthInstallmentBreakdown {
  const { entries, dueMonth } = params;
  const vencimentos = entries
    .filter((entry) => entry.inst.vencimento.slice(0, 7) === dueMonth)
    .map((entry) => ({
      id: entry.inst.id,
      vencimento: entry.inst.vencimento,
      tipo: entry.kind,
      label: entry.label,
      dataCompra: entry.dataCompra,
      valor: entry.inst.valor,
      pago: entry.inst.pago,
      pagoValor: getInstallmentPaidAmount(entry.inst),
      restante: getInstallmentRemainingAmount(entry.inst),
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  return {
    dueMonth,
    valorTotalDevido: vencimentos.reduce((s, v) => s + v.valor, 0),
    valorJaPago: vencimentos.reduce((s, v) => s + v.pagoValor, 0),
    valorApagarNoMes: vencimentos.reduce((s, v) => s + (v.pago ? 0 : v.restante), 0),
    vencimentos,
  };
}

export type TotalApagarNoMes = {
  dueMonth: string;
  total: number;
  filamentos: number;
  insumos: number;
  impressora: number;
};

/**
 * Calcula o total a pagar no mês de referência, separado por categoria.
 * Considera apenas parcelas pendentes com vencimento dentro do mês.
 */
export function computeTotalApagarNoMes(params: {
  allInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  insumoPayments: InsumoPayment[];
  insumos: Insumo[];
  dueMonth: string;
}): TotalApagarNoMes {
  const { allInstallments, insumoPayments, insumos, dueMonth } = params;

  let filamentos = 0;
  let insumosTotal = 0;
  let impressora = 0;

  const insumoClassificacao = new Map<string, string>();
  for (const ip of insumoPayments) {
    const insumo = insumos.find((i) => i.id === ip.insumoId);
    if (insumo) {
      insumoClassificacao.set(ip.id, insumo.classificacaoFinanceira);
    }
  }

  for (const inst of allInstallments) {
    if (inst.pago) continue;
    if (inst.vencimento.slice(0, 7) !== dueMonth) continue;

    const remaining = getInstallmentRemainingAmount(inst);
    if (remaining <= 0) continue;

    // Distingue filamento vs insumo pelo paymentId (IDs de pagamentos de insumos são conhecidos)
    if ("paymentId" in inst && insumoClassificacao.has(inst.paymentId)) {
      const classification = insumoClassificacao.get(inst.paymentId);
      if (classification === "investimento") {
        impressora += remaining;
      } else {
        insumosTotal += remaining;
      }
    } else {
      filamentos += remaining;
    }
  }

  return {
    dueMonth,
    total: filamentos + insumosTotal + impressora,
    filamentos,
    insumos: insumosTotal,
    impressora,
  };
}
