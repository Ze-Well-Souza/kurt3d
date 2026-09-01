import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addManualExpense,
  removeExpense,
  payInstallment,
  payInsumoInstallment,
  rescheduleInstallments,
  settleInsumoPayment,
  settlePayment,
} from "@/lib/api/data.functions";
import { formatIsoDatePtBr, todayIso } from "@/lib/domain/installments";
import {
  buildCurrentMonthInstallmentBreakdown,
  buildInstallmentAuditByMonth,
  buildScheduleEntries,
  computeInstallmentKpis,
  computeTotalApagarNoMes,
  getInstallmentPaidAmount,
  getInstallmentRemainingAmount,
  getPaymentProgress,
  isPartialInstallment,
  type InstallmentViewFilter,
} from "@/lib/domain/finance-schedule";
import type {
  Filamento,
  FilamentoHistory,
  FilamentoPayment,
  FilamentoPaymentEvent,
  FilamentoPaymentInstallment,
  Insumo,
  InsumoPayment,
  InsumoPaymentEvent,
  InsumoPaymentInstallment,
} from "@/lib/domain/types";
import { useOrders } from "@/lib/hooks/use-orders";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { useVendas } from "@/lib/hooks/use-vendas";
import { useInsumos } from "@/lib/hooks/use-insumos";
import { useExpenses } from "@/lib/hooks/use-expenses";
import {
  useFilamentoPayments,
  useFilamentoPaymentEvents,
} from "@/lib/hooks/use-filamento-payments";
import { useInsumoPayments, useInsumoPaymentEvents } from "@/lib/hooks/use-insumo-payments";
import {
  calcularTotaisFinanceiros,
  classificarDespesas,
  ehDespesaOperacional,
} from "@/lib/domain/finance-totals";
import { invalidarPor } from "@/lib/query-keys";
import { normalizeText } from "@/lib/utils/normalization";
import { brl } from "@/lib/utils";
import { escapeHtml } from "@/lib/domain/print-html";
import {
  buildPrintChips,
  downloadCsvFile,
  formatMonthYearLabel,
  getEventSignedAmount,
  openPrintWindow,
  SOURCE_LABELS,
  type FinancePeriodPreset,
  type PaymentHistorySourceFilter,
  type PaymentHistoryTypeFilter,
} from "./finance-shared";

const MONTHS_SHORT_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** Situacao legivel de uma parcela, usada nos relatorios e no modal de contas.
 * Aceita tanto a parcela bruta (valorPago) quanto a linha do modal (pagoValor). */
function installmentStatusLabel(inst: {
  pago: boolean;
  valor: number;
  valorPago?: number | null;
  pagoValor?: number | null;
}) {
  if (inst.pago) return "Paga";
  return (inst.valorPago ?? inst.pagoValor ?? 0) > 0 ? "Parcial" : "Pendente";
}

export type MonthBillsKind = "filamentos" | "insumos" | "impressora";

export const MONTH_BILLS_TITLES: Record<MonthBillsKind, string> = {
  filamentos: "Filamentos",
  insumos: "Insumos",
  impressora: "Impressora",
};

export type MonthBillRow = {
  id: string;
  label: string;
  numero: number;
  /** Total de parcelas do plano (para exibir "3/6" em compras parceladas). */
  parcelaTotal: number;
  /** Cor do rolo (apenas filamentos; insumos nao tem cor cadastrada). */
  cor: string | null;
  dataCompra: string | null;
  vencimento: string;
  valor: number;
  pago: boolean;
  pagoValor: number;
  restante: number;
};

/** Notacao da parcela: "3/6" quando parcelado, "À vista" quando parcela unica. */
function monthBillParcelaLabel(row: MonthBillRow) {
  return row.parcelaTotal > 1 ? `${row.numero}/${row.parcelaTotal}` : "À vista";
}

/**
 * Estado completo da pagina financeira: dados, filtros, dialogs, mutacoes,
 * metricas derivadas e exportacoes. As abas recebem este objeto como `ctx`
 * e apenas renderizam — nenhuma logica de dominio vive nos componentes de aba.
 */
export function useFinancePageState() {
  const qc = useQueryClient();
  const { data: vendasData } = useVendas();
  const { data: ordersData } = useOrders();
  const { data: filamentosData } = useFilamentos();
  const { data: insumosData } = useInsumos();
  const { data: expensesData } = useExpenses();
  const { data: fpData } = useFilamentoPayments();
  const { data: fpeData } = useFilamentoPaymentEvents();
  const { data: ipData } = useInsumoPayments();
  const { data: ipeData } = useInsumoPaymentEvents();
  const vendas = vendasData ?? [];
  const orders = ordersData ?? [];
  const filamentos = (filamentosData?.filamentos ?? []) as (Filamento & {
    label?: string;
    reservedGrams?: number;
    disponivelGrams?: number;
  })[];
  const filamentosHistory = (filamentosData?.filamentosHistory ?? []) as FilamentoHistory[];
  const insumos = (insumosData ?? []) as Insumo[];
  const expenses = expensesData ?? [];
  const filamentoPayments = (fpData?.filamentoPayments ?? []) as FilamentoPayment[];
  const filamentoInstallments = (fpData?.filamentoInstallments ??
    []) as FilamentoPaymentInstallment[];
  const filamentoPaymentEvents = (fpeData ?? []) as FilamentoPaymentEvent[];
  const insumoPayments = (ipData?.insumoPayments ?? []) as InsumoPayment[];
  const insumoInstallments = (ipData?.insumoInstallments ?? []) as InsumoPaymentInstallment[];
  const insumoPaymentEvents = (ipeData ?? []) as InsumoPaymentEvent[];

  const [search, setSearch] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [installmentViewFilter, setInstallmentViewFilter] =
    useState<InstallmentViewFilter>("pending");
  const [purchaseBrandFilter, setPurchaseBrandFilter] = useState("all");
  const [purchaseMaterialFilter, setPurchaseMaterialFilter] = useState("all");
  const [highlightedInstallmentId, setHighlightedInstallmentId] = useState<string | null>(null);
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{
    kind: "filamento" | "insumo";
    installmentId: string;
    dataPagamento: string;
    valorPago: string;
  } | null>(null);
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    targetDate: string;
  }>({ open: false, targetDate: "" });
  const [installmentKpiMonthAnchor, setInstallmentKpiMonthAnchor] = useState(() =>
    todayIso().slice(0, 7),
  );
  const [paymentHistorySourceFilter, setPaymentHistorySourceFilter] =
    useState<PaymentHistorySourceFilter>("all");
  const [paymentHistoryTypeFilter, setPaymentHistoryTypeFilter] =
    useState<PaymentHistoryTypeFilter>("all");
  const [expForm, setExpForm] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    categoria: "",
  });
  const [periodPreset, setPeriodPreset] = useState<FinancePeriodPreset>("month");
  const [monthBillsDialog, setMonthBillsDialog] = useState<MonthBillsKind | null>(null);

  // P1-2: os efeitos colaterais de cada operacao ficam em query-keys.ts.
  const invalidateExpenses = () => invalidarPor(qc, "despesaManual");
  const invalidateFilamentoPayments = () => invalidarPor(qc, "pagamentoFilamento");
  const invalidateInsumoPayments = () => invalidarPor(qc, "pagamentoInsumo");
  const mutateAddExp = useMutation({
    mutationFn: (data: {
      descricao: string;
      valor: number;
      data: string;
      categoria: string | null;
    }) => addManualExpense({ data }),
    onSuccess: () => {
      invalidateExpenses();
      toast.success("Despesa adicionada.");
      setShowExpense(false);
      setExpForm({
        descricao: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        categoria: "",
      });
    },
  });
  const mutateRemoveExp = useMutation({
    mutationFn: (id: string) => removeExpense({ data: { id } }),
    onSuccess: () => {
      invalidateExpenses();
      toast.success("Despesa removida.");
    },
  });
  const mutatePayInstallment = useMutation({
    mutationFn: (input: { installmentId: string; dataPagamento: string; valorPago?: number }) =>
      payInstallment({ data: input }),
    onSuccess: (_data, variables) => {
      const currentInstallment = filamentoInstallments.find(
        (item) => item.id === variables.installmentId,
      );
      const remaining = currentInstallment ? getInstallmentRemainingAmount(currentInstallment) : 0;
      const amount = variables.valorPago ?? remaining;
      const settled = amount >= remaining;
      invalidateFilamentoPayments();
      setInstallmentViewFilter(settled ? "paid" : "all");
      setHighlightedInstallmentId(variables.installmentId);
      setHighlightedPaymentId(null);
      toast.success(
        settled
          ? "Parcela quitada. Confira em Pagas."
          : "Pagamento parcial registrado. Confira em Todas.",
      );
    },
  });
  const mutateSettlePayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settlePayment({ data: input }),
    onSuccess: (_data, variables) => {
      invalidateFilamentoPayments();
      setInstallmentViewFilter("paid");
      setHighlightedInstallmentId(null);
      setHighlightedPaymentId(variables.paymentId);
      toast.success("Lote quitado. Confira em Pagas.");
    },
  });
  const mutatePayInsumoInstallment = useMutation({
    mutationFn: (input: { installmentId: string; dataPagamento: string; valorPago?: number }) =>
      payInsumoInstallment({ data: input }),
    onSuccess: (_data, variables) => {
      const currentInstallment = insumoInstallments.find(
        (item) => item.id === variables.installmentId,
      );
      const remaining = currentInstallment ? getInstallmentRemainingAmount(currentInstallment) : 0;
      const amount = variables.valorPago ?? remaining;
      const settled = amount >= remaining;
      invalidateInsumoPayments();
      setInstallmentViewFilter(settled ? "paid" : "all");
      setHighlightedInstallmentId(variables.installmentId);
      setHighlightedPaymentId(null);
      toast.success(
        settled
          ? "Parcela do insumo quitada. Confira em Pagas."
          : "Pagamento parcial do insumo registrado. Confira em Todas.",
      );
    },
  });
  const mutateSettleInsumoPayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settleInsumoPayment({ data: input }),
    onSuccess: (_data, variables) => {
      invalidateInsumoPayments();
      setInstallmentViewFilter("paid");
      setHighlightedInstallmentId(null);
      setHighlightedPaymentId(variables.paymentId);
      toast.success("Compra quitada. Confira em Pagas.");
    },
  });
  const mutateReschedule = useMutation({
    mutationFn: (
      items: { installmentId: string; kind: "filamento" | "insumo"; newVencimento: string }[],
    ) => rescheduleInstallments({ data: { items } }),
    onSuccess: (_data) => {
      invalidarPor(qc, "reagendarParcelas");
      setRescheduleDialog({ open: false, targetDate: "" });
      toast.success(`${_data?.count ?? 0} parcela(s) reagendada(s).`);
    },
  });

  const periodLabel = useMemo(() => {
    if (periodPreset === "all") return "Período completo";
    const [year, month] = installmentKpiMonthAnchor.split("-").map(Number);
    if (!year || !month) return "Período selecionado";
    if (periodPreset === "month") {
      return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${quarter}º trimestre de ${year}`;
  }, [installmentKpiMonthAnchor, periodPreset]);

  const isDateInSelectedPeriod = useCallback(
    (dateIso?: string | null) => {
      if (!dateIso) return periodPreset === "all";
      if (periodPreset === "all") return true;
      const [anchorYear, anchorMonth] = installmentKpiMonthAnchor.split("-").map(Number);
      const [dateYear, dateMonth] = dateIso.slice(0, 7).split("-").map(Number);
      if (!anchorYear || !anchorMonth || !dateYear || !dateMonth) return false;
      if (periodPreset === "month") {
        return anchorYear === dateYear && anchorMonth === dateMonth;
      }
      return (
        anchorYear === dateYear &&
        Math.floor((anchorMonth - 1) / 3) === Math.floor((dateMonth - 1) / 3)
      );
    },
    [installmentKpiMonthAnchor, periodPreset],
  );

  const periodFilteredVendas = useMemo(
    () => vendas.filter((v) => isDateInSelectedPeriod(v.data)),
    [vendas, isDateInSelectedPeriod],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => isDateInSelectedPeriod(expense.data)),
    [expenses, isDateInSelectedPeriod],
  );

  // P1-6: a classificacao e os totais moram em domain/finance-totals.ts, para
  // que o Painel use exatamente a mesma regra e as duas telas parem de mostrar
  // lucros diferentes para o mesmo mes.
  const allClassifiedExpenses = useMemo(
    () => classificarDespesas(expenses, insumos),
    [expenses, insumos],
  );

  const classifiedExpenses = useMemo(
    () => allClassifiedExpenses.filter((expense) => isDateInSelectedPeriod(expense.data)),
    [allClassifiedExpenses, isDateInSelectedPeriod],
  );

  const allFilamentPurchases = useMemo(
    () => [...filamentos, ...filamentosHistory],
    [filamentos, filamentosHistory],
  );

  // Rotulo humano de cada plano de pagamento de filamento (SKUs do lote), usado
  // tanto pelo relatorio exportado quanto pelo modal de contas do mes.
  const filamentoLabelByPaymentId = useMemo(() => {
    const map = new Map<string, string>();
    for (const payment of filamentoPayments) {
      const batch = allFilamentPurchases.filter((item) => item.batchId === payment.batchId);
      map.set(
        payment.id,
        batch.length > 0
          ? batch.map((item) => item.sku).join(", ")
          : `Lote ${payment.batchId?.slice(0, 8) ?? payment.id.slice(0, 8)}`,
      );
    }
    return map;
  }, [filamentoPayments, allFilamentPurchases]);

  const insumoByPaymentId = useMemo(() => {
    const map = new Map<string, Insumo | null>();
    for (const payment of insumoPayments) {
      map.set(
        payment.id,
        insumos.find((item) => item.id === payment.insumoId) ?? null,
      );
    }
    return map;
  }, [insumoPayments, insumos]);

  // Metadados do lote de filamento por plano de pagamento (cores distintas,
  // data de compra mais antiga e total de parcelas), usados pelo modal de contas.
  const filamentoBatchMetaByPaymentId = useMemo(() => {
    const map = new Map<string, { cor: string | null; dataCompra: string | null; parcelas: number }>();
    for (const payment of filamentoPayments) {
      const batch = allFilamentPurchases.filter((item) => item.batchId === payment.batchId);
      const cores = Array.from(new Set(batch.map((item) => item.cor.trim()).filter(Boolean)));
      map.set(payment.id, {
        cor: cores.length > 0 ? cores.join(", ") : null,
        dataCompra: batch.map((item) => item.dataCompra).sort()[0] ?? null,
        parcelas: payment.parcelas,
      });
    }
    return map;
  }, [filamentoPayments, allFilamentPurchases]);

  const purchaseBrands = useMemo(
    () =>
      Array.from(
        new Set(allFilamentPurchases.map((item) => item.marca.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [allFilamentPurchases],
  );

  const purchaseMaterials = useMemo(
    () =>
      Array.from(
        new Set(allFilamentPurchases.map((item) => item.material.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [allFilamentPurchases],
  );

  const filteredPurchaseAnalysis = useMemo(
    () =>
      allFilamentPurchases.filter((item) => {
        if (!isDateInSelectedPeriod(item.dataCompra)) return false;
        if (purchaseBrandFilter !== "all" && item.marca !== purchaseBrandFilter) return false;
        if (purchaseMaterialFilter !== "all" && item.material !== purchaseMaterialFilter)
          return false;
        return true;
      }),
    [allFilamentPurchases, isDateInSelectedPeriod, purchaseBrandFilter, purchaseMaterialFilter],
  );

  const purchaseAnalysis = useMemo(() => {
    const count = filteredPurchaseAnalysis.length;
    const total = filteredPurchaseAnalysis.reduce((sum, item) => sum + item.precoPago, 0);
    const average = count > 0 ? total / count : 0;
    const min = count > 0 ? Math.min(...filteredPurchaseAnalysis.map((item) => item.precoPago)) : 0;
    const max = count > 0 ? Math.max(...filteredPurchaseAnalysis.map((item) => item.precoPago)) : 0;
    const target = 100;
    const delta = average - target;
    const belowTargetCount = filteredPurchaseAnalysis.filter(
      (item) => item.precoPago < target,
    ).length;
    const aboveTargetCount = filteredPurchaseAnalysis.filter(
      (item) => item.precoPago > target,
    ).length;
    const atTargetCount = filteredPurchaseAnalysis.filter(
      (item) => item.precoPago === target,
    ).length;
    return {
      count,
      total,
      average,
      min,
      max,
      target,
      delta,
      belowTargetCount,
      aboveTargetCount,
      atTargetCount,
    };
  }, [filteredPurchaseAnalysis]);

  const filteredFilamentoInstallments = useMemo(
    () =>
      filamentoInstallments.filter((installment) =>
        isDateInSelectedPeriod(
          installment.pago || isPartialInstallment(installment)
            ? (installment.dataPagamento ?? installment.vencimento)
            : installment.vencimento,
        ),
      ),
    [filamentoInstallments, isDateInSelectedPeriod],
  );
  const filteredInsumoInstallments = useMemo(
    () =>
      insumoInstallments.filter((installment) =>
        isDateInSelectedPeriod(
          installment.pago || isPartialInstallment(installment)
            ? (installment.dataPagamento ?? installment.vencimento)
            : installment.vencimento,
        ),
      ),
    [insumoInstallments, isDateInSelectedPeriod],
  );
  const allInstallments = useMemo(
    () => [...filamentoInstallments, ...insumoInstallments],
    [filamentoInstallments, insumoInstallments],
  );

  const filteredInstallments = useMemo(
    () => [...filteredFilamentoInstallments, ...filteredInsumoInstallments],
    [filteredFilamentoInstallments, filteredInsumoInstallments],
  );

  const referenceMonthFilamentoInstallments = useMemo(
    () =>
      filamentoInstallments.filter(
        (installment) => installment.vencimento.slice(0, 7) === installmentKpiMonthAnchor,
      ),
    [filamentoInstallments, installmentKpiMonthAnchor],
  );

  const referenceMonthInsumoInstallments = useMemo(
    () =>
      insumoInstallments.filter(
        (installment) => installment.vencimento.slice(0, 7) === installmentKpiMonthAnchor,
      ),
    [insumoInstallments, installmentKpiMonthAnchor],
  );

  const referenceMonthInstallments = useMemo(
    () => [...referenceMonthFilamentoInstallments, ...referenceMonthInsumoInstallments],
    [referenceMonthFilamentoInstallments, referenceMonthInsumoInstallments],
  );

  const allPaymentEvents = useMemo(
    () =>
      [
        ...filamentoPaymentEvents.map((event) => ({ ...event, kind: "filamento" as const })),
        ...insumoPaymentEvents.map((event) => ({ ...event, kind: "insumo" as const })),
      ].sort((a, b) => {
        const byDate = b.dataPagamento.localeCompare(a.dataPagamento);
        return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
      }),
    [filamentoPaymentEvents, insumoPaymentEvents],
  );

  const filteredPaymentEvents = useMemo(
    () =>
      allPaymentEvents
        .filter((event) => isDateInSelectedPeriod(event.dataPagamento))
        .sort((a, b) => {
          const byDate = b.dataPagamento.localeCompare(a.dataPagamento);
          return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
        }),
    [allPaymentEvents, isDateInSelectedPeriod],
  );

  const totals = useMemo(
    () =>
      calcularTotaisFinanceiros({
        vendas: periodFilteredVendas,
        despesasClassificadas: classifiedExpenses,
        insumoPayments,
      }),
    [classifiedExpenses, periodFilteredVendas, insumoPayments],
  );

  // Série dos últimos 6 meses (terminando no mês âncora) para comparativo mês a mês
  // na aba Vendas, usando a mesma regra de despesas operacionais do totals.
  const monthlySalesSeries = useMemo(() => {
    const [anchorYear, anchorMonth] = installmentKpiMonthAnchor.split("-").map(Number);
    if (!anchorYear || !anchorMonth) return [];
    const insumoIdsComParcelamento = new Set(insumoPayments.map((p) => p.insumoId));
    const series: {
      key: string;
      label: string;
      receita: number;
      custo: number;
      despesas: number;
      liquido: number;
    }[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(anchorYear, anchorMonth - 1 - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthVendas = vendas.filter((v) => v.data.slice(0, 7) === key);
      const receita = monthVendas.reduce((s, v) => s + v.valor, 0);
      const custo = monthVendas.reduce((s, v) => s + v.custo, 0);
      const despesas = allClassifiedExpenses
        .filter(
          (e) => e.data.slice(0, 7) === key && ehDespesaOperacional(e, insumoIdsComParcelamento),
        )
        .reduce((s, e) => s + e.valor, 0);
      series.push({
        key,
        label: `${MONTHS_SHORT_PT[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`,
        receita,
        custo,
        despesas,
        liquido: receita - custo - despesas,
      });
    }
    return series;
  }, [vendas, allClassifiedExpenses, insumoPayments, installmentKpiMonthAnchor]);

  const despesasManuais = classifiedExpenses
    .filter((e) => e.source === "manual")
    .reduce((s, e) => s + e.valor, 0);
  const despesasFalha = classifiedExpenses
    .filter((e) => e.source === "falha")
    .reduce((s, e) => s + e.valor, 0);
  const despesasInsumosOperacionais = classifiedExpenses
    .filter((e) => e.source === "insumo" && e.financialClass === "operacional")
    .reduce((s, e) => s + e.valor, 0);

  // Installment (parcelas) KPIs
  const installmentKpis = useMemo(() => {
    const today = todayIso();
    return computeInstallmentKpis({
      allInstallments,
      referenceMonthInstallments,
      allPaymentEvents,
      installmentKpiMonthAnchor,
      today,
    });
  }, [referenceMonthInstallments, allPaymentEvents, allInstallments, installmentKpiMonthAnchor]);

  const installmentKpiAvailableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(todayIso().slice(0, 7));
    for (const installment of allInstallments) {
      months.add(installment.vencimento.slice(0, 7));
      if (installment.dataPagamento) months.add(installment.dataPagamento.slice(0, 7));
    }
    for (const event of allPaymentEvents) {
      months.add(event.dataPagamento.slice(0, 7));
    }
    return Array.from(months).sort((a, b) => a.localeCompare(b));
  }, [allInstallments, allPaymentEvents]);

  const installmentKpiMonthIndex = installmentKpiAvailableMonths.indexOf(installmentKpiMonthAnchor);
  const previousInstallmentKpiMonth =
    installmentKpiMonthIndex > 0
      ? installmentKpiAvailableMonths[installmentKpiMonthIndex - 1]
      : null;
  const nextInstallmentKpiMonth =
    installmentKpiMonthIndex >= 0 &&
    installmentKpiMonthIndex < installmentKpiAvailableMonths.length - 1
      ? installmentKpiAvailableMonths[installmentKpiMonthIndex + 1]
      : null;

  const filamentoPaymentProgress = useMemo(
    () => getPaymentProgress(filamentoInstallments),
    [filamentoInstallments],
  );

  const insumoPaymentProgress = useMemo(
    () => getPaymentProgress(insumoInstallments),
    [insumoInstallments],
  );

  const scheduleEntries = useMemo(() => {
    const today = todayIso();
    return buildScheduleEntries({
      filamentoInstallments,
      insumoInstallments,
      installmentKpiMonthAnchor,
      filamentoPayments,
      filamentos,
      filamentosHistory,
      insumoPayments,
      insumos,
      filamentoPaymentProgress,
      insumoPaymentProgress,
      installmentViewFilter,
      today,
    });
  }, [
    filamentoInstallments,
    insumoInstallments,
    installmentKpiMonthAnchor,
    filamentoPayments,
    filamentos,
    filamentosHistory,
    insumoPayments,
    insumos,
    filamentoPaymentProgress,
    insumoPaymentProgress,
    installmentViewFilter,
  ]);

  // Caixa pago no mes de referencia quitando parcelas de OUTROS meses
  // (ex.: parcela com vencimento em julho paga em agosto). Mesma matematica
  // eventos + fallback de computeInstallmentKpis, restrita ao cruzamento de meses.
  const pagoNoMesDeOutrosMeses = useMemo(() => {
    const vencimentoByInstallmentId = new Map<string, string>();
    for (const inst of filamentoInstallments) {
      vencimentoByInstallmentId.set(inst.id, inst.vencimento);
    }
    for (const inst of insumoInstallments) {
      vencimentoByInstallmentId.set(inst.id, inst.vencimento);
    }
    const eventsCross = allPaymentEvents
      .filter((event) => event.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor)
      .filter(
        (event) =>
          (vencimentoByInstallmentId.get(event.installmentId) ?? "").slice(0, 7) !==
          installmentKpiMonthAnchor,
      )
      .reduce((sum, event) => sum + getEventSignedAmount(event), 0);
    const installmentIdsWithEventThisMonth = new Set(
      allPaymentEvents
        .filter((event) => event.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor)
        .map((event) => event.installmentId),
    );
    const fallbackCross = allInstallments
      .filter(
        (inst) =>
          !!inst.dataPagamento &&
          inst.dataPagamento.slice(0, 7) === installmentKpiMonthAnchor &&
          getInstallmentPaidAmount(inst) > 0 &&
          !installmentIdsWithEventThisMonth.has(inst.id) &&
          inst.vencimento.slice(0, 7) !== installmentKpiMonthAnchor,
      )
      .reduce((sum, inst) => sum + getInstallmentPaidAmount(inst), 0);
    return eventsCross + fallbackCross;
  }, [
    allPaymentEvents,
    allInstallments,
    filamentoInstallments,
    insumoInstallments,
    installmentKpiMonthAnchor,
  ]);

  // Visao "pendentes" do cronograma para o dashboard (proximos vencimentos e
  // atrasados), independente do filtro ativo na aba Parcelas.
  const pendingScheduleEntries = useMemo(() => {
    const today = todayIso();
    return buildScheduleEntries({
      filamentoInstallments,
      insumoInstallments,
      installmentKpiMonthAnchor,
      filamentoPayments,
      filamentos,
      filamentosHistory,
      insumoPayments,
      insumos,
      filamentoPaymentProgress,
      insumoPaymentProgress,
      installmentViewFilter: "pending",
      today,
    });
  }, [
    filamentoInstallments,
    insumoInstallments,
    installmentKpiMonthAnchor,
    filamentoPayments,
    filamentos,
    filamentosHistory,
    insumoPayments,
    insumos,
    filamentoPaymentProgress,
    insumoPaymentProgress,
  ]);

  const installmentAuditByMonth = useMemo(
    () => buildInstallmentAuditByMonth({ allInstallments }),
    [allInstallments],
  );

  const currentMonthBreakdown = useMemo(() => {
    return buildCurrentMonthInstallmentBreakdown({
      entries: scheduleEntries,
      dueMonth: installmentKpiMonthAnchor,
    });
  }, [scheduleEntries, installmentKpiMonthAnchor]);

  const totalApagarNoMes = useMemo(() => {
    return computeTotalApagarNoMes({
      filamentoInstallments,
      insumoInstallments,
      insumoPayments,
      insumos,
      dueMonth: installmentKpiMonthAnchor,
    });
  }, [
    filamentoInstallments,
    insumoInstallments,
    insumoPayments,
    insumos,
    installmentKpiMonthAnchor,
  ]);

  const heroCardState = useMemo(() => {
    const { total, totalDue, totalPaid } = totalApagarNoMes;
    if (total > 0) {
      return { kind: "pending" as const, displayValue: total, color: "amber" as const };
    }
    if (totalDue > 0) {
      return { kind: "paid" as const, displayValue: totalDue, color: "green" as const };
    }
    return { kind: "empty" as const, displayValue: 0, color: "neutral" as const };
  }, [totalApagarNoMes]);

  const selectedFinanceInstallment = useMemo(() => {
    if (!payDialog) return null;
    const list = payDialog.kind === "filamento" ? filamentoInstallments : insumoInstallments;
    return list.find((item) => item.id === payDialog.installmentId) ?? null;
  }, [filamentoInstallments, insumoInstallments, payDialog]);

  const financeHistoryRows = useMemo(() => {
    const filamentoPaymentsById = new Map(
      filamentoPayments.map((payment) => [payment.id, payment]),
    );
    const insumoPaymentsById = new Map(insumoPayments.map((payment) => [payment.id, payment]));
    const filamentoInstallmentsById = new Map(
      filamentoInstallments.map((installment) => [installment.id, installment]),
    );
    const insumoInstallmentsById = new Map(
      insumoInstallments.map((installment) => [installment.id, installment]),
    );
    const installmentsWithTrackedEvents = new Set(
      allPaymentEvents.map((event) => event.installmentId),
    );
    // Fallback para filamentos arquivados: mantem a referencia (SKU) visivel
    // no historico mesmo quando o rolo ja saiu do estoque ativo.
    const filamentoReferenceForBatch = (batchId: string | null): string => {
      if (!batchId) return "—";
      const active = filamentos.filter((item) => item.batchId === batchId);
      const source =
        active.length > 0 ? active : filamentosHistory.filter((item) => item.batchId === batchId);
      const skus = source.map((item) => item.sku).join(", ");
      return skus || `Lote ${batchId.slice(0, 8)}`;
    };
    const eventRows = filteredPaymentEvents.map((event) => {
      if (event.kind === "filamento") {
        const installment = filamentoInstallmentsById.get(event.installmentId) ?? null;
        const payment = filamentoPaymentsById.get(event.paymentId) ?? null;
        const reference = filamentoReferenceForBatch(payment?.batchId ?? null);
        return {
          ...event,
          reference,
          numero: installment?.numero ?? null,
          formaPagamento: payment?.formaPagamento ?? null,
        };
      }
      const installment = insumoInstallmentsById.get(event.installmentId) ?? null;
      const payment = insumoPaymentsById.get(event.paymentId) ?? null;
      const insumo = payment ? insumos.find((item) => item.id === payment.insumoId) : null;
      return {
        ...event,
        reference: insumo?.nome ?? "—",
        numero: installment?.numero ?? null,
        formaPagamento: payment?.formaPagamento ?? null,
      };
    });

    const legacyFilamentoRows = filamentoInstallments
      .filter(
        (installment) =>
          !!installment.dataPagamento &&
          isDateInSelectedPeriod(installment.dataPagamento) &&
          getInstallmentPaidAmount(installment) > 0 &&
          !installmentsWithTrackedEvents.has(installment.id),
      )
      .map((installment) => {
        const payment = filamentoPaymentsById.get(installment.paymentId) ?? null;
        const reference = filamentoReferenceForBatch(payment?.batchId ?? null);
        return {
          id: `legacy-filamento-${installment.id}`,
          installmentId: installment.id,
          paymentId: installment.paymentId,
          kind: "filamento" as const,
          tipo: "pagamento" as const,
          valor: getInstallmentPaidAmount(installment),
          dataPagamento: installment.dataPagamento ?? installment.vencimento,
          observacao:
            installment.observacao ?? "Pagamento confirmado antes do historico detalhado.",
          createdAt: installment.dataPagamento ?? installment.vencimento,
          reference,
          numero: installment.numero,
          formaPagamento: payment?.formaPagamento ?? null,
        };
      });

    const legacyInsumoRows = insumoInstallments
      .filter(
        (installment) =>
          !!installment.dataPagamento &&
          isDateInSelectedPeriod(installment.dataPagamento) &&
          getInstallmentPaidAmount(installment) > 0 &&
          !installmentsWithTrackedEvents.has(installment.id),
      )
      .map((installment) => {
        const payment = insumoPaymentsById.get(installment.paymentId) ?? null;
        const insumo = payment ? insumos.find((item) => item.id === payment.insumoId) : null;
        return {
          id: `legacy-insumo-${installment.id}`,
          installmentId: installment.id,
          paymentId: installment.paymentId,
          kind: "insumo" as const,
          tipo: "pagamento" as const,
          valor: getInstallmentPaidAmount(installment),
          dataPagamento: installment.dataPagamento ?? installment.vencimento,
          observacao:
            installment.observacao ?? "Pagamento confirmado antes do historico detalhado.",
          createdAt: installment.dataPagamento ?? installment.vencimento,
          reference: insumo?.nome ?? "—",
          numero: installment.numero,
          formaPagamento: payment?.formaPagamento ?? null,
        };
      });

    return [...eventRows, ...legacyFilamentoRows, ...legacyInsumoRows].sort((a, b) => {
      const byDate = b.dataPagamento.localeCompare(a.dataPagamento);
      return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
    });
  }, [
    allPaymentEvents,
    filteredPaymentEvents,
    filamentoPayments,
    insumoPayments,
    filamentoInstallments,
    insumoInstallments,
    filamentos,
    filamentosHistory,
    insumos,
    isDateInSelectedPeriod,
  ]);

  const visibleFinanceHistoryRows = useMemo(
    () =>
      financeHistoryRows.filter((row) => {
        if (paymentHistorySourceFilter !== "all" && row.kind !== paymentHistorySourceFilter)
          return false;
        if (paymentHistoryTypeFilter !== "all" && row.tipo !== paymentHistoryTypeFilter)
          return false;
        return true;
      }),
    [financeHistoryRows, paymentHistorySourceFilter, paymentHistoryTypeFilter],
  );

  const filteredVendas = useMemo(() => {
    if (!search.trim()) return periodFilteredVendas;
    const s = normalizeText(search);
    return periodFilteredVendas.filter(
      (v) => normalizeText(v.projectName).includes(s) || normalizeText(v.client).includes(s),
    );
  }, [periodFilteredVendas, search]);

  const exportRows = useMemo(() => {
    const vendaRows = periodFilteredVendas.map((venda) => ({
      tipo: "Venda",
      data: venda.data,
      descricao: venda.projectName,
      categoria: "Receita",
      cliente: venda.client,
      valor: venda.valor,
      custo: venda.custo,
      depreciacao: venda.depreciacao,
      status: "Recebido",
      observacao: "",
    }));

    const expenseRows = classifiedExpenses.map((expense) => ({
      tipo: "Despesa",
      data: expense.data,
      descricao: expense.descricao,
      categoria:
        expense.categoria ??
        (expense.financialClass === "investimento"
          ? "Investimento / Imobilizado"
          : (SOURCE_LABELS[expense.source]?.label ?? expense.source)),
      cliente: "",
      valor: expense.valor,
      custo: "",
      depreciacao: "",
      status: expense.source === "manual" ? "Lançada" : "Automática",
      observacao: expense.source,
    }));

    const paymentEventRows = visibleFinanceHistoryRows.map((event) => ({
      tipo: "Movimento de Parcela",
      data: event.dataPagamento,
      descricao: `${event.kind === "filamento" ? "Filamento" : "Insumo"} · ${event.reference}${event.numero ? ` · Parcela ${event.numero}` : ""}`,
      categoria: event.tipo === "pagamento" ? "Pagamento" : "Estorno",
      cliente: "",
      valor: getEventSignedAmount(event),
      custo: "",
      depreciacao: "",
      status: event.tipo === "pagamento" ? "Confirmado" : "Estornado",
      observacao: event.observacao ?? "",
    }));

    // Contas do periodo: parcelas com vencimento dentro do periodo selecionado,
    // para que o relatorio mostre o que precisa ser pago — nao so o que ja foi
    // vendido, gasto ou quitado.
    const parcelaRows = [
      ...filamentoInstallments
        .filter((inst) => isDateInSelectedPeriod(inst.vencimento))
        .map((inst) => ({
          tipo: "Parcela",
          data: inst.vencimento,
          descricao: filamentoLabelByPaymentId.get(inst.paymentId) ?? "Filamento",
          categoria: "Filamento",
          cliente: "",
          valor: inst.valor,
          custo: "",
          depreciacao: "",
          status: installmentStatusLabel(inst),
          observacao: `Parcela ${inst.numero}`,
        })),
      ...insumoInstallments
        .filter((inst) => isDateInSelectedPeriod(inst.vencimento))
        .map((inst) => {
          const insumo = insumoByPaymentId.get(inst.paymentId) ?? null;
          return {
            tipo: "Parcela",
            data: inst.vencimento,
            descricao: insumo?.nome ?? "Insumo",
            categoria:
              insumo?.classificacaoFinanceira === "investimento" ? "Impressora" : "Insumo",
            cliente: "",
            valor: inst.valor,
            custo: "",
            depreciacao: "",
            status: installmentStatusLabel(inst),
            observacao: `Parcela ${inst.numero}`,
          };
        }),
    ];

    return [...vendaRows, ...expenseRows, ...paymentEventRows, ...parcelaRows].sort((a, b) =>
      a.data.localeCompare(b.data),
    );
  }, [
    classifiedExpenses,
    visibleFinanceHistoryRows,
    periodFilteredVendas,
    filamentoInstallments,
    insumoInstallments,
    filamentoLabelByPaymentId,
    insumoByPaymentId,
    isDateInSelectedPeriod,
  ]);

  const exportCsv = () => {
    const headers = [
      "tipo",
      "data",
      "descricao",
      "categoria",
      "cliente",
      "valor",
      "custo",
      "depreciacao",
      "status",
      "observacao",
    ];
    const rows = exportRows.map((row) =>
      headers.map((header) => {
        const value = row[header as keyof typeof row] ?? "";
        return typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value);
      }),
    );
    downloadCsvFile(`financeiro-${periodPreset}-${installmentKpiMonthAnchor}.csv`, headers, rows);
  };

  const exportPdf = () => {
    const summaryCards = buildPrintChips([
      ["Período", periodLabel],
      ["Receita", brl(totals.receita)],
      ["Despesas Operacionais", brl(totals.despesasOperacionais)],
      ["Investimentos", brl(totals.investimentos)],
      ["Lucro", brl(totals.lucro)],
      ["Parcelas pendentes", brl(installmentKpis.pendente)],
      ["Parcelas pagas", brl(installmentKpis.pagoNoMes)],
    ]);

    const tableRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.tipo)}</td>
            <td>${formatIsoDatePtBr(row.data)}</td>
            <td>${escapeHtml(row.descricao)}</td>
            <td>${escapeHtml(row.categoria)}</td>
            <td>${escapeHtml(row.cliente)}</td>
            <td>${typeof row.valor === "number" ? brl(row.valor) : escapeHtml(String(row.valor))}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(String(row.observacao ?? ""))}</td>
          </tr>`,
      )
      .join("");

    const opened = openPrintWindow(
      `Financeiro ${periodLabel}`,
      `<h1>Relatório Financeiro</h1>
        <p>${escapeHtml(periodLabel)}</p>
        ${summaryCards}
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>`,
    );
    if (!opened) {
      toast.error("Não foi possível abrir a janela de exportação PDF.");
    }
  };

  // ═══ Modal de contas do mes: parcelas com vencimento no mes de referencia,
  // filtradas pela categoria clicada no cartao principal (Filamentos, Insumos
  // ou Impressora). ═══
  const monthBillsRows = useMemo<MonthBillRow[]>(() => {
    if (!monthBillsDialog) return [];
    const rows: MonthBillRow[] = [];
    if (monthBillsDialog === "filamentos") {
      for (const inst of filamentoInstallments) {
        if (inst.vencimento.slice(0, 7) !== installmentKpiMonthAnchor) continue;
        const meta = filamentoBatchMetaByPaymentId.get(inst.paymentId);
        rows.push({
          id: inst.id,
          label: filamentoLabelByPaymentId.get(inst.paymentId) ?? "Filamento",
          numero: inst.numero,
          parcelaTotal: meta?.parcelas ?? 1,
          cor: meta?.cor ?? null,
          dataCompra: meta?.dataCompra ?? null,
          vencimento: inst.vencimento,
          valor: inst.valor,
          pago: inst.pago,
          pagoValor: getInstallmentPaidAmount(inst),
          restante: getInstallmentRemainingAmount(inst),
        });
      }
    } else {
      for (const inst of insumoInstallments) {
        if (inst.vencimento.slice(0, 7) !== installmentKpiMonthAnchor) continue;
        const insumo = insumoByPaymentId.get(inst.paymentId) ?? null;
        const isInvestimento = insumo?.classificacaoFinanceira === "investimento";
        if (monthBillsDialog === "impressora" && !isInvestimento) continue;
        if (monthBillsDialog === "insumos" && isInvestimento) continue;
        const payment = insumoPayments.find((item) => item.id === inst.paymentId);
        rows.push({
          id: inst.id,
          label: insumo?.nome ?? "Insumo",
          numero: inst.numero,
          parcelaTotal: payment?.parcelas ?? 1,
          cor: null,
          dataCompra: insumo?.dataCompra ?? null,
          vencimento: inst.vencimento,
          valor: inst.valor,
          pago: inst.pago,
          pagoValor: getInstallmentPaidAmount(inst),
          restante: getInstallmentRemainingAmount(inst),
        });
      }
    }
    return rows.sort(
      (a, b) => a.vencimento.localeCompare(b.vencimento) || a.label.localeCompare(b.label),
    );
  }, [
    monthBillsDialog,
    filamentoInstallments,
    insumoInstallments,
    filamentoLabelByPaymentId,
    filamentoBatchMetaByPaymentId,
    insumoByPaymentId,
    insumoPayments,
    installmentKpiMonthAnchor,
  ]);

  const exportMonthBillsCsv = () => {
    if (!monthBillsDialog) return;
    const isFilamento = monthBillsDialog === "filamentos";
    const headers = isFilamento
      ? ["Descrição", "Parcela", "Cor", "Data Compra", "Vencimento", "Valor", "Pago", "Restante", "Status"]
      : ["Descrição", "Parcela", "Data Compra", "Vencimento", "Valor", "Pago", "Restante", "Status"];
    const rows = monthBillsRows.map((row) => {
      const cells = [row.label, monthBillParcelaLabel(row)];
      if (isFilamento) cells.push(row.cor ?? "—");
      cells.push(
        row.dataCompra ? formatIsoDatePtBr(row.dataCompra) : "—",
        formatIsoDatePtBr(row.vencimento),
        row.valor.toFixed(2).replace(".", ","),
        row.pagoValor.toFixed(2).replace(".", ","),
        row.restante.toFixed(2).replace(".", ","),
        installmentStatusLabel(row),
      );
      return cells;
    });
    downloadCsvFile(
      `contas-${monthBillsDialog}-${installmentKpiMonthAnchor}.csv`,
      headers,
      rows,
    );
  };

  const exportMonthBillsPdf = () => {
    if (!monthBillsDialog) return;
    const title = MONTH_BILLS_TITLES[monthBillsDialog];
    const monthLabel = formatMonthYearLabel(installmentKpiMonthAnchor);
    const total = monthBillsRows.reduce((sum, row) => sum + row.valor, 0);
    const aPagar = monthBillsRows.reduce((sum, row) => sum + row.restante, 0);
    const isFilamento = monthBillsDialog === "filamentos";
    const tableRows = monthBillsRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>${escapeHtml(monthBillParcelaLabel(row))}</td>
            ${isFilamento ? `<td>${escapeHtml(row.cor ?? "—")}</td>` : ""}
            <td>${row.dataCompra ? formatIsoDatePtBr(row.dataCompra) : "—"}</td>
            <td>${formatIsoDatePtBr(row.vencimento)}</td>
            <td>${brl(row.valor)}</td>
            <td>${escapeHtml(installmentStatusLabel(row))}</td>
            <td>${brl(row.restante)}</td>
          </tr>`,
      )
      .join("");
    const opened = openPrintWindow(
      `Contas de ${title} — ${monthLabel}`,
      `<h1>Contas de ${escapeHtml(title)}</h1>
        <p>${escapeHtml(monthLabel)} · ${monthBillsRows.length} parcela(s) com vencimento no mês</p>
        ${buildPrintChips([
          ["Total do mês", brl(total)],
          ["Já pago", brl(total - aPagar)],
          ["A pagar", brl(aPagar)],
        ])}
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Parcela</th>
              ${isFilamento ? "<th>Cor</th>" : ""}
              <th>Data Compra</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>A pagar</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>`,
    );
    if (!opened) {
      toast.error("Não foi possível abrir a janela de exportação PDF.");
    }
  };

  const exportCostCsv = () => {
    const headers = ["Data", "Descrição", "Categoria", "Fonte", "Valor"];
    const csvLines = [
      headers.join(";"),
      ...classifiedExpenses.map((e) => {
        const fonte = SOURCE_LABELS[e.source]?.label ?? e.source;
        const categoria =
          e.categoria ??
          (e.financialClass === "investimento"
            ? "Investimento / Imobilizado"
            : "Despesa Operacional");
        const row = [e.data, e.descricao, categoria, fonte, e.valor.toFixed(2).replace(".", ",")];
        return row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";");
      }),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `custos-${periodPreset}-${installmentKpiMonthAnchor}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return {
    // dados
    vendas,
    orders,
    filamentos,
    filamentosHistory,
    insumos,
    expenses,
    filamentoPayments,
    filamentoInstallments,
    filamentoPaymentEvents,
    insumoPayments,
    insumoInstallments,
    insumoPaymentEvents,
    // estados
    search,
    setSearch,
    showExpense,
    setShowExpense,
    installmentViewFilter,
    setInstallmentViewFilter,
    purchaseBrandFilter,
    setPurchaseBrandFilter,
    purchaseMaterialFilter,
    setPurchaseMaterialFilter,
    highlightedInstallmentId,
    highlightedPaymentId,
    payDialog,
    setPayDialog,
    rescheduleDialog,
    setRescheduleDialog,
    installmentKpiMonthAnchor,
    setInstallmentKpiMonthAnchor,
    paymentHistorySourceFilter,
    setPaymentHistorySourceFilter,
    paymentHistoryTypeFilter,
    setPaymentHistoryTypeFilter,
    expForm,
    setExpForm,
    periodPreset,
    setPeriodPreset,
    monthBillsDialog,
    setMonthBillsDialog,
    // mutacoes
    mutateAddExp,
    mutateRemoveExp,
    mutatePayInstallment,
    mutateSettlePayment,
    mutatePayInsumoInstallment,
    mutateSettleInsumoPayment,
    mutateReschedule,
    // derivados
    periodLabel,
    isDateInSelectedPeriod,
    periodFilteredVendas,
    filteredExpenses,
    classifiedExpenses,
    purchaseBrands,
    purchaseMaterials,
    filteredPurchaseAnalysis,
    purchaseAnalysis,
    filteredInstallments,
    allInstallments,
    allPaymentEvents,
    totals,
    monthlySalesSeries,
    despesasManuais,
    despesasFalha,
    despesasInsumosOperacionais,
    installmentKpis,
    installmentKpiAvailableMonths,
    previousInstallmentKpiMonth,
    nextInstallmentKpiMonth,
    scheduleEntries,
    pendingScheduleEntries,
    pagoNoMesDeOutrosMeses,
    installmentAuditByMonth,
    currentMonthBreakdown,
    totalApagarNoMes,
    heroCardState,
    selectedFinanceInstallment,
    visibleFinanceHistoryRows,
    filteredVendas,
    // contas do mes (modal)
    monthBillsRows,
    // exportacoes
    exportCsv,
    exportPdf,
    exportCostCsv,
    exportMonthBillsCsv,
    exportMonthBillsPdf,
  };
}

export type FinanceCtx = ReturnType<typeof useFinancePageState>;
