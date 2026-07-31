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
  label: string;
  overdue: boolean;
  progress: PaymentProgress;
};

export type InstallmentViewFilter = "pending" | "paid" | "all";

export function getInstallmentPaidAmount(installment: { valor: number; valorPago: number | null }) {
  return Math.min(installment.valorPago ?? 0, installment.valor);
}

export function getInstallmentRemainingAmount(installment: { valor: number; valorPago: number | null }) {
  return Math.max(installment.valor - getInstallmentPaidAmount(installment), 0);
}

export function isPartialInstallment(installment: { pago: boolean; valor: number; valorPago: number | null }) {
  return !installment.pago && getInstallmentPaidAmount(installment) > 0;
}

function getEventSignedAmount(event: { tipo: "pagamento" | "estorno"; valor: number }) {
  return event.tipo === "estorno" ? -event.valor : event.valor;
}

export function computeInstallmentKpis(params: {
  allInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  referenceMonthInstallments: (FilamentoPaymentInstallment | InsumoPaymentInstallment)[];
  allPaymentEvents: { tipo: "pagamento" | "estorno"; valor: number; dataPagamento: string; installmentId: string }[];
  installmentKpiMonthAnchor: string;
  today: string;
}) {
  const { allInstallments, referenceMonthInstallments, allPaymentEvents, installmentKpiMonthAnchor, today } = params;
  let pendente = 0;
  let vencendoNoMes = 0;
  let atrasadas = 0;
  for (const inst of allInstallments) {
    if (!inst.pago) {
      const remainingAmount = getInstallmentRemainingAmount(inst);
      pendente += remainingAmount;
      if (inst.vencimento < today) {
        atrasadas += 1;
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
  return { pendente, pagoNoMes, vencendoNoMes, atrasadas };
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
    const label = payment
      ? filamentos.filter((f) => f.batchId === payment.batchId).map((f) => f.sku).join(", ")
      : "";
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
      label,
      overdue: !i.pago && i.vencimento <= today,
      progress,
    };
  };
  const buildInsumoEntry = (i: InsumoPaymentInstallment): ScheduleEntry<"insumo"> => {
    const payment = insumoPayments.find((p) => p.id === i.paymentId) ?? null;
    const insumo = payment ? insumos.find((item) => item.id === payment.insumoId) : null;
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
      label: insumo?.nome ?? "",
      overdue: !i.pago && i.vencimento <= today,
      progress,
    };
  };

  const pendingFilamentEntries = filamentoInstallments
    .filter((i) => !i.pago)
    .map(buildFilamentEntry);
  const pendingInsumoEntries = insumoInstallments
    .filter((i) => !i.pago)
    .map(buildInsumoEntry);
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
      return (b.inst.dataPagamento ?? b.inst.vencimento).localeCompare(a.inst.dataPagamento ?? a.inst.vencimento);
    }
    if (installmentViewFilter === "all" && a.inst.pago !== b.inst.pago) {
      return a.inst.pago ? 1 : -1;
    }
    const aDate = a.inst.pago ? a.inst.dataPagamento ?? a.inst.vencimento : a.inst.vencimento;
    const bDate = b.inst.pago ? b.inst.dataPagamento ?? b.inst.vencimento : b.inst.vencimento;
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

export function getPaymentProgress<T extends { pago: boolean; valor: number; valorPago: number | null; paymentId: string }>(
  installments: T[],
): Map<string, PaymentProgress> {
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
