import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Trash2,
  AlertCircle,

  CreditCard,
  Banknote,
  CalendarClock,
  Check,
  Download,
  FileText,
  Tags,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/utils";
import { SearchInput } from "@/components/SearchInput";
import {
  addManualExpense,
  removeExpense,
  payInstallment,
  payInsumoInstallment,
  rescheduleInstallments,
  settleInsumoPayment,
  settlePayment,
} from "@/lib/api/data.functions";
import { formatIsoDatePtBr, parseIsoDateLocal, todayIso } from "@/lib/domain/installments";
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
  type InstallmentAuditMonthRow,
  type InstallmentViewFilter,
  type TotalApagarNoMes,
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
import { normalizeText } from "@/lib/utils/normalization";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Internet",
  "Manutenção",
  "Energia",
  "Perda de Material",
  "Transporte",
  "Marketing",
  "Outros",
] as const;

const getEventSignedAmount = (event: { tipo: "pagamento" | "estorno"; valor: number }) =>
  event.tipo === "estorno" ? -event.valor : event.valor;

const formatMonthYearLabel = (monthIso: string) => {
  const [year, month] = monthIso.split("-").map(Number);
  if (!year || !month) return monthIso;
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  insumo: { label: "Insumo", color: "var(--filament-yellow)" },
  manual: { label: "Manual", color: "var(--filament-cyan)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

type FinancePeriodPreset = "all" | "month" | "quarter";
type PaymentHistorySourceFilter = "all" | "filamento" | "insumo";
type PaymentHistoryTypeFilter = "all" | "pagamento" | "estorno";

function Finances() {
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

  const invalidateExpenses = () => qc.invalidateQueries({ queryKey: ["expenses"] });
  const invalidateFilamentoPayments = () => {
    qc.invalidateQueries({ queryKey: ["filamento-payments"] });
    qc.invalidateQueries({ queryKey: ["filamento-payment-events"] });
  };
  const invalidateInsumoPayments = () => {
    qc.invalidateQueries({ queryKey: ["insumo-payments"] });
    qc.invalidateQueries({ queryKey: ["insumo-payment-events"] });
  };
  const mutateAddExp = useMutation({
    mutationFn: (data: any) => addManualExpense({ data }),
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
    mutationFn: (items: { installmentId: string; kind: "filamento" | "insumo"; newVencimento: string }[]) =>
      rescheduleInstallments({ data: { items } }),
    onSuccess: (_data) => {
      invalidateFilamentoPayments();
      invalidateInsumoPayments();
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

  const insumoById = useMemo(() => new Map(insumos.map((item) => [item.id, item])), [insumos]);

  const classifiedExpenses = useMemo(
    () =>
      filteredExpenses.map((expense) => {
        const linkedInsumo = expense.source === "insumo" ? insumoById.get(expense.refId) : null;
        const financialClass =
          linkedInsumo?.classificacaoFinanceira === "investimento" ||
          expense.categoria === "Investimento / Imobilizado"
            ? "investimento"
            : "operacional";
        return { ...expense, financialClass };
      }),
    [filteredExpenses, insumoById],
  );

  const allFilamentPurchases = useMemo(
    () => [...filamentos, ...filamentosHistory],
    [filamentos, filamentosHistory],
  );

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

  const totals = useMemo(() => {
    const receita = periodFilteredVendas.reduce((s, v) => s + v.valor, 0);
    const custo = periodFilteredVendas.reduce((s, v) => s + v.custo, 0);

    // Exclui despesas de insumos que já têm parcelamento (evita dupla contagem com fluxo de caixa)
    const insumoIdsComParcelamento = new Set(
      insumoPayments.map((p) => p.insumoId),
    );
    const despesasOperacionais = classifiedExpenses
      .filter((expense) => {
        if (expense.financialClass !== "operacional") return false;
        // Exclui insumos que possuem parcelamento próprio
        if (expense.source === "insumo" && insumoIdsComParcelamento.has(expense.refId)) return false;
        return true;
      })
      .reduce((s, e) => s + e.valor, 0);
    const investimentos = classifiedExpenses
      .filter((expense) => expense.financialClass === "investimento")
      .reduce((s, e) => s + e.valor, 0);
    const lucro = receita - custo - despesasOperacionais;
    return { receita, custo, lucro, despesasOperacionais, investimentos };
  }, [classifiedExpenses, periodFilteredVendas, insumoPayments]);


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
  }, [filamentoInstallments, insumoInstallments, insumoPayments, insumos, installmentKpiMonthAnchor]);

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
    const eventRows = filteredPaymentEvents.map((event) => {
      if (event.kind === "filamento") {
        const installment = filamentoInstallmentsById.get(event.installmentId) ?? null;
        const payment = filamentoPaymentsById.get(event.paymentId) ?? null;
        const reference = payment
          ? filamentos
              .filter((item) => item.batchId === payment.batchId)
              .map((item) => item.sku)
              .join(", ")
          : "—";
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
        const reference = payment
          ? filamentos
              .filter((item) => item.batchId === payment.batchId)
              .map((item) => item.sku)
              .join(", ")
          : "—";
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

    return [...vendaRows, ...expenseRows, ...paymentEventRows].sort((a, b) =>
      a.data.localeCompare(b.data),
    );
  }, [classifiedExpenses, visibleFinanceHistoryRows, periodFilteredVendas]);

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
    const csvLines = [
      headers.join(";"),
      ...exportRows.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] ?? "";
            const text =
              typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value);
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financeiro-${periodPreset}-${installmentKpiMonthAnchor}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!popup) {
      toast.error("Não foi possível abrir a janela de exportação PDF.");
      return;
    }

    const summaryCards = [
      ["Período", periodLabel],
      ["Receita", brl(totals.receita)],
      ["Despesas Operacionais", brl(totals.despesasOperacionais)],
      ["Investimentos", brl(totals.investimentos)],
      ["Lucro", brl(totals.lucro)],
      ["Parcelas pendentes", brl(installmentKpis.pendente)],
      ["Parcelas pagas", brl(installmentKpis.pagoNoMes)],
    ]
      .map(
        ([label, value]) =>
          `<div class="chip"><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join("");

    const tableRows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${row.tipo}</td>
            <td>${new Date(row.data).toLocaleDateString("pt-BR")}</td>
            <td>${escapeHtml(row.descricao)}</td>
            <td>${escapeHtml(row.categoria)}</td>
            <td>${escapeHtml(row.cliente)}</td>
            <td>${typeof row.valor === "number" ? brl(row.valor) : row.valor}</td>
            <td>${row.status}</td>
            <td>${escapeHtml(String(row.observacao ?? ""))}</td>
          </tr>`,
      )
      .join("");

    popup.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <title>Financeiro ${periodLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 16px; color: #4b5563; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
            .chip { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
            .chip span { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; }
            .chip strong { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Relatório Financeiro</h1>
          <p>${periodLabel}</p>
          <div class="grid">${summaryCards}</div>
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
          </table>
        </body>
      </html>`);
    popup.document.close();
    popup.focus();
    popup.print();
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
        const row = [
          e.data,
          e.descricao,
          categoria,
          fonte,
          e.valor.toFixed(2).replace(".", ","),
        ];
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

  // Falha count
  const falhasCount = orders.filter((o) => o.status === "falha").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Finanças</h1>
        <p className="text-sm text-muted-foreground">
          Receita, custos e fundo de reserva de depreciação.
        </p>
      </div>

      {/* ═══ Hero: TOTAL A PAGAR ESTE MÊS ═══ */}
      <Card
        className={cn(
          "overflow-hidden border-2 bg-gradient-to-br",
          heroCardState.kind === "paid"
            ? "border-green-500/40 from-green-50/50 to-card"
            : heroCardState.kind === "pending"
              ? "border-amber-500/40 from-amber-50/50 to-card"
              : "border-muted/40 from-muted/30 to-card",
        )}
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {heroCardState.kind === "paid" ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <CalendarClock
                  className={cn(
                    "h-5 w-5",
                    heroCardState.kind === "pending" ? "text-amber-600" : "text-muted-foreground",
                  )}
                />
              )}
              <span
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider",
                  heroCardState.kind === "paid"
                    ? "text-green-700"
                    : heroCardState.kind === "pending"
                      ? "text-amber-700"
                      : "text-muted-foreground",
                )}
              >
                {heroCardState.kind === "paid"
                  ? "Pago em"
                  : heroCardState.kind === "pending"
                    ? "Total a pagar em"
                    : "Sem vencimentos em"}{" "}
                {formatMonthYearLabel(installmentKpiMonthAnchor)}
              </span>
              {heroCardState.kind === "paid" && (
                <Badge className="gap-1 bg-green-600 text-[10px]">
                  <Check className="h-3 w-3" /> Pago
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "mt-2 font-display text-4xl font-bold tabular-nums",
                heroCardState.kind === "paid"
                  ? "text-green-600"
                  : heroCardState.kind === "pending"
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
            >
              {brl(heroCardState.displayValue)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Filamentos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">
                {brl(
                  heroCardState.kind === "paid"
                    ? totalApagarNoMes.filamentosDue
                    : totalApagarNoMes.filamentos,
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Insumos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">
                {brl(
                  heroCardState.kind === "paid"
                    ? totalApagarNoMes.insumosDue
                    : totalApagarNoMes.insumos,
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressora</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">
                {brl(
                  heroCardState.kind === "paid"
                    ? totalApagarNoMes.impressoraDue
                    : totalApagarNoMes.impressora,
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="filament-top flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-2">
          <Label>Período</Label>
          <Select
            value={periodPreset}
            onValueChange={(value) => setPeriodPreset(value as FinancePeriodPreset)}
          >
            <SelectTrigger className="min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportPdf}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Total"
          value={brl(totals.receita)}
          color="var(--filament-cyan)"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro Líquido"
          value={brl(totals.lucro)}
          color={totals.lucro >= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Custo de Produção"
          value={brl(totals.custo)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<Wrench className="h-4 w-4" />}
          label="Despesas Operacionais"
          value={brl(totals.despesasOperacionais)}
          color="var(--filament-magenta)"
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Investimentos"
          value={brl(totals.investimentos)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Perdas por Falha"
          value={brl(despesasFalha)}
          color="var(--filament-magenta)"
        />
      </div>

      {/* Purchase Analysis — Compact */}
      <div className="filament-top flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4" style={{ color: "var(--filament-cyan)" }} />
          <span className="text-sm font-semibold">Compras de Filamento</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={purchaseBrandFilter} onValueChange={setPurchaseBrandFilter}>
            <SelectTrigger className="h-7 min-w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {purchaseBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={purchaseMaterialFilter} onValueChange={setPurchaseMaterialFilter}>
            <SelectTrigger className="h-7 min-w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os materiais</SelectItem>
              {purchaseMaterials.map((material) => (
                <SelectItem key={material} value={material}>{material}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {purchaseAnalysis.count} compras · média {purchaseAnalysis.count > 0 ? brl(purchaseAnalysis.average) : "—"}
          </Badge>
          {purchaseAnalysis.count > 0 && (
            <Badge
              variant="outline"
              className={`text-[10px] ${purchaseAnalysis.delta <= 0 ? "border-green-500/30 bg-green-50 text-green-700" : "border-red-500/30 bg-red-50 text-red-700"}`}
            >
              {purchaseAnalysis.delta <= 0 ? `${brl(Math.abs(purchaseAnalysis.delta))} abaixo` : `${brl(Math.abs(purchaseAnalysis.delta))} acima`}
            </Badge>
          )}
        </div>
      </div>

      {/* Installments (Parcelas) KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Mês de referência das parcelas
          </div>
          <div className="text-xs text-muted-foreground">
            Os cards e o cronograma abaixo acompanham este mês de referência de forma independente
            do filtro global da tela.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={!previousInstallmentKpiMonth}
            onClick={() =>
              previousInstallmentKpiMonth &&
              setInstallmentKpiMonthAnchor(previousInstallmentKpiMonth)
            }
            aria-label="Mês anterior com movimento"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Badge
            variant="secondary"
            className="min-w-[140px] justify-center px-3 py-1 text-xs capitalize"
          >
            {formatMonthYearLabel(installmentKpiMonthAnchor)}
          </Badge>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={!nextInstallmentKpiMonth}
            onClick={() =>
              nextInstallmentKpiMonth && setInstallmentKpiMonthAnchor(nextInstallmentKpiMonth)
            }
            aria-label="Próximo mês com movimento"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={`A Pagar em ${formatMonthYearLabel(installmentKpiMonthAnchor)}`}
          value={brl(totalApagarNoMes.total)}
          color={totalApagarNoMes.total > 0 ? "var(--filament-yellow)" : "var(--filament-green)"}
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={`Parcelas Pagas (ref. ${formatMonthYearLabel(installmentKpiMonthAnchor)})`}
          value={brl(installmentKpis.pagoNoMes)}
          color="var(--filament-green)"
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={`A Pagar em ${formatMonthYearLabel(installmentKpiMonthAnchor)}`}
          value={brl(installmentKpis.vencendoNoMes)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label={`Parcelas Atrasadas (qtd · valor)`}
          value={`${String(installmentKpis.atrasadas)} · ${brl(installmentKpis.atrasadasValor)}`}
          color={installmentKpis.atrasadas > 0 ? "var(--filament-magenta)" : "var(--filament-cyan)"}
        />
      </div>

      {/* Installments Schedule */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Cronograma de Parcelas</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setRescheduleDialog({ open: true, targetDate: "" })}
            >
              <CalendarClock className="h-3 w-3" /> Adiar vencimentos
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={installmentViewFilter === "pending" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("pending")}
              >
                Pendentes
              </Button>
              <Button
                size="sm"
                variant={installmentViewFilter === "paid" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("paid")}
              >
                Pagas
              </Button>
              <Button
                size="sm"
                variant={installmentViewFilter === "all" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("all")}
              >
                Todas
              </Button>
            </div>
          </div>
        </div>
        <div className="border-b border-border px-6 py-3 text-xs text-muted-foreground">
          Ao clicar em <strong className="text-foreground">Pagar</strong>, voce pode registrar o
          valor total ou um valor parcial. A parcela so vira{" "}
          <strong className="text-foreground">Pago</strong> quando o saldo restante chegar a zero.
        </div>
        <div className="grid gap-4 border-b border-border px-6 py-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Auditoria por Mês de Vencimento
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {installmentAuditByMonth.length} mês(es)
              </Badge>
            </div>
            <div className="space-y-2">
              {installmentAuditByMonth.map((row: InstallmentAuditMonthRow) => (
                <div
                  key={row.dueMonth}
                  className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px]"
                >
                  <div className="col-span-2 font-mono font-semibold text-foreground">
                    {formatMonthYearLabel(row.dueMonth)}
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    Total: <span className="font-mono text-foreground">{row.countTotal}</span> ·{" "}
                    <span className="tabular-nums text-foreground">{brl(row.valorTotal)}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    Pagas: <span className="font-mono text-green-700">{row.countPaid}</span> ·{" "}
                    <span className="tabular-nums text-green-700">{brl(row.valorPago)}</span>
                  </div>
                  <div className="col-span-3 text-muted-foreground">
                    Pendentes: <span className="font-mono text-amber-700">{row.countPending}</span>{" "}
                    · <span className="tabular-nums text-amber-700">{brl(row.valorPendente)}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    {row.countPartial > 0 && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-50 text-[10px] text-amber-700"
                      >
                        {row.countPartial} parcial(is)
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {installmentAuditByMonth.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                  Nenhuma parcela cadastrada.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                O que tenho a pagar em {formatMonthYearLabel(installmentKpiMonthAnchor)}
              </div>
              <Badge
                variant={currentMonthBreakdown.vencimentos.length === 0 ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {currentMonthBreakdown.vencimentos.length} vencimento(s)
              </Badge>
            </div>
            <div className="grid gap-2 text-[11px] sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">Total dev. mês</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(currentMonthBreakdown.valorTotalDevido)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">Já pago mês</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-green-700">
                  {brl(currentMonthBreakdown.valorJaPago)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">A pagar (pendente)</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-amber-700">
                  {brl(currentMonthBreakdown.valorApagarNoMes)}
                </div>
              </div>
            </div>
            {currentMonthBreakdown.vencimentos.length > 0 && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1">
                {currentMonthBreakdown.vencimentos.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1.5 text-[10px]"
                  >
                    <div className="col-span-2 font-mono">{formatIsoDatePtBr(v.vencimento)}</div>
                    <div className="col-span-2 font-mono text-muted-foreground">
                      {v.dataCompra ? formatIsoDatePtBr(v.dataCompra) : "—"}
                    </div>
                    <div className="col-span-5 truncate">
                      <Badge variant="secondary" className="mr-1 text-[9px]">
                        {v.tipo === "filamento" ? "Filam." : "Insumo"}
                      </Badge>
                      <span className="text-foreground">{v.label || "Sem referência"}</span>
                    </div>
                    <div className="col-span-3 text-right tabular-nums">
                      {v.pago ? (
                        <span className="text-green-700">Pago {brl(v.pagoValor)}</span>
                      ) : (
                        <span className="text-amber-700">Falta {brl(v.restante)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {scheduleEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {installmentViewFilter === "pending"
              ? "Nenhuma parcela pendente. Todos os pagamentos estão em dia."
              : installmentViewFilter === "paid"
                ? "Nenhuma parcela paga encontrada no período selecionado."
                : "Nenhuma parcela encontrada no período selecionado."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Data Compra</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Data Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Forma</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleEntries.map(
                  ({ kind, inst, payment, label, overdue, progress, dataCompra }) => {
                    const totalInstallments =
                      (payment?.parcelas ?? progress.totalInstallments) || 1;
                    const totalPlanAmount = payment?.custoTotal ?? progress.totalAmount;
                    return (
                      <TableRow
                        key={inst.id}
                        className={
                          highlightedInstallmentId === inst.id ||
                          highlightedPaymentId === inst.paymentId
                            ? "bg-green-50/60"
                            : undefined
                        }
                      >
                        <TableCell className="font-mono text-xs">{`${inst.numero}/${totalInstallments}`}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            {label ? (
                              <span className={kind === "filamento" ? "font-mono" : "font-medium"}>
                                {label}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            <Badge
                              variant="secondary"
                              className={
                                progress.totalAmount > 0 &&
                                progress.paidAmount >= progress.totalAmount
                                  ? "border-green-600/20 bg-green-50 text-green-700"
                                  : progress.paidAmount > 0
                                    ? "border-amber-500/20 bg-amber-50 text-amber-700"
                                    : ""
                              }
                            >
                              {progress.totalAmount > 0 &&
                              progress.paidAmount >= progress.totalAmount
                                ? `Quitado ${totalInstallments}/${totalInstallments}`
                                : progress.paidAmount > 0
                                  ? `Pago ${progress.paidInstallments}/${totalInstallments}${isPartialInstallment(inst) ? ` + parcial ${brl(getInstallmentPaidAmount(inst))}` : ""}`
                                  : totalInstallments > 1
                                    ? `Em aberto 0/${totalInstallments}`
                                    : "Em aberto"}
                            </Badge>
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {payment && payment.parcelas > 1
                              ? `Parcela ${inst.numero}/${totalInstallments} · Total ${brl(totalPlanAmount)}`
                              : `Pagamento único · Total ${brl(totalPlanAmount)}`}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums text-xs text-muted-foreground">
                          {dataCompra ? formatIsoDatePtBr(dataCompra) : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs tabular-nums ${overdue ? "font-semibold text-destructive" : ""}`}
                          >
                            {formatIsoDatePtBr(inst.vencimento)}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-xs text-muted-foreground">
                          {inst.dataPagamento ? formatIsoDatePtBr(inst.dataPagamento) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div>{brl(inst.valor)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Total {brl(totalPlanAmount)}
                          </div>
                          {!inst.pago && (
                            <div className="text-[10px] text-muted-foreground">
                              Falta {brl(getInstallmentRemainingAmount(inst))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {inst.pago ? (
                            <Badge className="gap-1 bg-green-600 text-[10px]">
                              <Check className="h-3 w-3" /> Pago
                            </Badge>
                          ) : isPartialInstallment(inst) ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 bg-amber-50 text-[10px] text-amber-700"
                            >
                              Parcial
                            </Badge>
                          ) : overdue ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Atrasado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {!payment || payment.parcelas <= 1 ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]"
                            >
                              <Banknote className="h-3 w-3" /> À vista
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]"
                            >
                              <CreditCard className="h-3 w-3" />
                              Parcelado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              disabled={
                                mutatePayInstallment.isPending ||
                                mutateSettlePayment.isPending ||
                                mutatePayInsumoInstallment.isPending ||
                                mutateSettleInsumoPayment.isPending
                              }
                              title={inst.pago ? "Pagamento já confirmado" : "Registrar pagamento"}
                              onClick={() =>
                                setPayDialog({
                                  kind,
                                  installmentId: inst.id,
                                  dataPagamento: todayIso(),
                                  valorPago: String(getInstallmentRemainingAmount(inst)),
                                })
                              }
                              style={{ visibility: inst.pago ? "hidden" : "visible" }}
                            >
                              <Check className="h-3 w-3" /> Pagar
                            </Button>
                            {payment && !inst.pago && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                disabled={
                                  mutateSettlePayment.isPending ||
                                  mutateSettleInsumoPayment.isPending
                                }
                                onClick={() =>
                                  kind === "filamento"
                                    ? mutateSettlePayment.mutate({
                                        paymentId: payment.id,
                                        dataPagamento: todayIso(),
                                      })
                                    : mutateSettleInsumoPayment.mutate({
                                        paymentId: payment.id,
                                        dataPagamento: todayIso(),
                                      })
                                }
                              >
                                {kind === "filamento" ? "Quitar lote" : "Quitar compra"}
                              </Button>
                            )}
                            {!inst.pago && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                disabled={mutateReschedule.isPending}
                                onClick={() => {
                                  const target = "2026-09-01";
                                  mutateReschedule.mutate([{
                                    installmentId: inst.id,
                                    kind,
                                    newVencimento: target,
                                  }]);
                                }}
                                title="Mover vencimento para 01/09"
                              >
                                <CalendarClock className="h-3 w-3" /> Adiar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!payDialog} onOpenChange={(open) => !open && setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4" /> Registrar pagamento
            </DialogTitle>
          </DialogHeader>
          {payDialog && selectedFinanceInstallment && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Parcela de{" "}
                <strong className="text-foreground">{brl(selectedFinanceInstallment.valor)}</strong>
                {" · "}
                ja pago:{" "}
                <strong className="text-foreground">
                  {brl(getInstallmentPaidAmount(selectedFinanceInstallment))}
                </strong>
                {" · "}
                restante:{" "}
                <strong className="text-foreground">
                  {brl(getInstallmentRemainingAmount(selectedFinanceInstallment))}
                </strong>
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Data do pagamento</Label>
                <Input
                  type="date"
                  value={payDialog.dataPagamento}
                  onChange={(e) =>
                    setPayDialog((current) =>
                      current ? { ...current, dataPagamento: e.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor a adicionar (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payDialog.valorPago}
                  onChange={(e) =>
                    setPayDialog((current) =>
                      current ? { ...current, valorPago: e.target.value } : current,
                    )
                  }
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!payDialog || !selectedFinanceInstallment) return;
                    const amount = Number(payDialog.valorPago);
                    if (
                      !Number.isFinite(amount) ||
                      amount <= 0 ||
                      amount > getInstallmentRemainingAmount(selectedFinanceInstallment)
                    ) {
                      return;
                    }
                    if (payDialog.kind === "filamento") {
                      mutatePayInstallment.mutate({
                        installmentId: payDialog.installmentId,
                        dataPagamento: payDialog.dataPagamento,
                        valorPago: amount,
                      });
                    } else {
                      mutatePayInsumoInstallment.mutate({
                        installmentId: payDialog.installmentId,
                        dataPagamento: payDialog.dataPagamento,
                        valorPago: amount,
                      });
                    }
                    setPayDialog(null);
                  }}
                  disabled={
                    mutatePayInstallment.isPending ||
                    mutatePayInsumoInstallment.isPending ||
                    !Number.isFinite(Number(payDialog.valorPago)) ||
                    Number(payDialog.valorPago) <= 0 ||
                    Number(payDialog.valorPago) >
                      getInstallmentRemainingAmount(selectedFinanceInstallment)
                  }
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open) => setRescheduleDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reagendar vencimentos
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione as parcelas pendentes abaixo para mover o vencimento para uma nova data.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nova data de vencimento</Label>
              <Input
                type="date"
                value={rescheduleDialog.targetDate}
                onChange={(e) =>
                  setRescheduleDialog((prev) => ({ ...prev, targetDate: e.target.value }))
                }
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {scheduleEntries
                .filter(({ inst }) => !inst.pago)
                .map(({ kind, inst, label }) => (
                  <label
                    key={inst.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded"
                      defaultChecked={false}
                      data-installment-id={inst.id}
                      data-kind={kind}
                    />
                    <span className="font-mono text-muted-foreground">
                      {inst.vencimento.slice(5)}
                    </span>
                    <span className="flex-1 truncate">
                      {kind === "filamento" ? "🧵" : "📦"} {label || "—"}
                    </span>
                    <span className="tabular-nums">{brl(inst.valor)}</span>
                  </label>
                ))}
              {scheduleEntries.filter(({ inst }) => !inst.pago).length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhuma parcela pendente para reagendar.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog({ open: false, targetDate: "" })}>
              Cancelar
            </Button>
            <Button
              disabled={!rescheduleDialog.targetDate || mutateReschedule.isPending}
              onClick={() => {
                const checks = document.querySelectorAll<HTMLInputElement>(
                  '[data-installment-id]',
                );
                const selected: { installmentId: string; kind: "filamento" | "insumo"; newVencimento: string }[] = [];
                checks.forEach((cb) => {
                  if (cb.checked) {
                    selected.push({
                      installmentId: cb.dataset.installmentId!,
                      kind: cb.dataset.kind as "filamento" | "insumo",
                      newVencimento: rescheduleDialog.targetDate,
                    });
                  }
                });
                if (selected.length === 0) {
                  toast.error("Selecione ao menos uma parcela.");
                  return;
                }
                mutateReschedule.mutate(selected);
              }}
            >
              {mutateReschedule.isPending ? "Reagendando..." : `Reagendar ${rescheduleDialog.targetDate ? `para ${rescheduleDialog.targetDate.split("-").reverse().join("/")}` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Histórico de Pagamentos</h2>
            <p className="text-xs text-muted-foreground">
              Cada parcial, quitação e estorno fica registrado como um evento separado para
              auditoria.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-[11px]">Origem</Label>
              <Select
                value={paymentHistorySourceFilter}
                onValueChange={(value) =>
                  setPaymentHistorySourceFilter(value as PaymentHistorySourceFilter)
                }
              >
                <SelectTrigger className="h-8 min-w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="filamento">Filamentos</SelectItem>
                  <SelectItem value="insumo">Insumos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Evento</Label>
              <Select
                value={paymentHistoryTypeFilter}
                onValueChange={(value) =>
                  setPaymentHistoryTypeFilter(value as PaymentHistoryTypeFilter)
                }
              >
                <SelectTrigger className="h-8 min-w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pagamento">Pagamentos</SelectItem>
                  <SelectItem value="estorno">Estornos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {visibleFinanceHistoryRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum movimento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFinanceHistoryRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums text-xs text-muted-foreground">
                      {formatIsoDatePtBr(row.dataPagamento)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={row.kind === "filamento" ? "font-mono" : "font-medium"}>
                        {row.reference}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.numero ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.tipo === "pagamento"
                            ? "border-green-600/30 bg-green-50 text-green-700"
                            : "border-red-500/30 bg-red-50 text-red-700"
                        }
                      >
                        {row.tipo === "pagamento" ? "Pagamento" : "Estorno"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.formaPagamento === "a_vista" || row.numero === 1 ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]"
                        >
                          <Banknote className="h-3 w-3" /> À vista
                        </Badge>
                      ) : row.formaPagamento === "parcelado" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]"
                        >
                          <CreditCard className="h-3 w-3" /> Parcelado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        row.tipo === "pagamento" ? "text-green-700" : "text-destructive"
                      }`}
                    >
                      {row.tipo === "pagamento" ? "+" : "-"}
                      {brl(Math.abs(row.valor))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.observacao?.trim() ? row.observacao : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">Saídas Financeiras</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">Operacionais: {brl(totals.despesasOperacionais)}</Badge>
              <Badge variant="secondary">Investimentos: {brl(totals.investimentos)}</Badge>
              <Badge variant="secondary">
                Insumos operacionais: {brl(despesasInsumosOperacionais)}
              </Badge>
              <Badge variant="secondary">Manuais: {brl(despesasManuais)}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={exportCostCsv}>
              <Download className="h-3 w-3" /> Exportar Excel
            </Button>
            <Button size="sm" className="btn-filament gap-2" onClick={() => setShowExpense(true)}>
              <Plus className="h-4 w-4" />
              Nova despesa
            </Button>
          </div>
        </div>
        {classifiedExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma saída registrada.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {classifiedExpenses.map((e) => {
                const src = SOURCE_LABELS[e.source] ?? { label: e.source, color: "#999" };
                const categoryLabel =
                  e.categoria ??
                  (e.financialClass === "investimento"
                    ? "Investimento / Imobilizado"
                    : "Despesa Operacional");
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: src.color, color: src.color }}>
                        {src.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatIsoDatePtBr(e.data)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {brl(e.valor)}
                    </TableCell>
                    <TableCell>
                      {e.source !== "insumo" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => mutateRemoveExp.mutate(e.id)}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sales History Table */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Histórico de Vendas</h2>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar venda..." />
            <Badge variant="secondary">{filteredVendas.length} registros</Badge>
          </div>
        </div>
        {periodFilteredVendas.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada no período selecionado. Finalize pedidos como &ldquo;Kurtido e
            Vendido&rdquo; na Fila de Pedidos.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor da Venda</TableHead>
                <TableHead className="text-right">Custo de Produção</TableHead>
                <TableHead className="text-right">Depreciação</TableHead>
                <TableHead className="text-right">Lucro Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.map((v) => {
                const lucro = v.valor - v.custo;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">{v.client}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(v.valor)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(v.custo)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(v.depreciacao)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        lucro >= 0 ? "filament-text" : "text-destructive"
                      }`}
                    >
                      {brl(lucro)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutateAddExp.mutate({
                descricao: expForm.descricao.trim(),
                valor: Number(expForm.valor),
                data: expForm.data,
                categoria: expForm.categoria || null,
              });
            }}
          >
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Input
                value={expForm.descricao}
                onChange={(e) => setExpForm((s) => ({ ...s, descricao: e.target.value }))}
                required
                placeholder="Ex: Aluguel do mês, Internet..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={expForm.valor}
                  onChange={(e) => setExpForm((s) => ({ ...s, valor: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={expForm.data}
                  onChange={(e) => setExpForm((s) => ({ ...s, data: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={expForm.categoria}
                onValueChange={(v) => setExpForm((s) => ({ ...s, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpense(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="btn-filament"
                disabled={!expForm.descricao.trim() || !expForm.valor || mutateAddExp.isPending}
              >
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="filament-top border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span
          className="grid h-6 w-6 place-items-center rounded-md text-white"
          style={{ background: color }}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
