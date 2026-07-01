import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, TrendingUp, DollarSign, Package, Plus, Trash2, AlertCircle, BookOpen, LayoutList, Table as TableIcon, CreditCard, Banknote, CalendarClock, Check, Download, FileText, Tags } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { addManualExpense, removeExpense, payInstallment, payInsumoInstallment, settleInsumoPayment, settlePayment } from "@/lib/api/data.functions";
import { formatIsoDatePtBr, parseIsoDateLocal, todayIso } from "@/lib/domain/installments";
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
import { useSnapshot } from "@/lib/hooks/use-snapshot";
import { normalizeText } from "@/lib/utils/normalization";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

const EXPENSE_CATEGORIES = ["Aluguel","Internet","Manutenção","Energia","Perda de Material","Transporte","Marketing","Outros"] as const;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getInstallmentPaidAmount = (installment: { valor: number; valorPago: number | null }) =>
  Math.min(installment.valorPago ?? 0, installment.valor);

const getInstallmentRemainingAmount = (installment: { valor: number; valorPago: number | null }) =>
  Math.max(installment.valor - getInstallmentPaidAmount(installment), 0);

const isPartialInstallment = (installment: { pago: boolean; valor: number; valorPago: number | null }) =>
  !installment.pago && getInstallmentPaidAmount(installment) > 0;

const getEventSignedAmount = (event: { tipo: "pagamento" | "estorno"; valor: number }) =>
  event.tipo === "estorno" ? -event.valor : event.valor;

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  insumo: { label: "Insumo", color: "var(--filament-yellow)" },
  manual: { label: "Manual", color: "var(--filament-cyan)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

type FinancePeriodPreset = "all" | "month" | "quarter";
type InstallmentViewFilter = "pending" | "paid" | "all";
type PaymentHistorySourceFilter = "all" | "filamento" | "insumo";
type PaymentHistoryTypeFilter = "all" | "pagamento" | "estorno";

function Finances() {
  const qc = useQueryClient();
  const snap = useSnapshot();
  const vendas = snap.data?.vendas ?? [];
  const orders = snap.data?.orders ?? [];
  const filamentos = (snap.data?.filamentos ?? []) as Filamento[];
  const filamentosHistory = (snap.data?.filamentosHistory ?? []) as FilamentoHistory[];
  const insumos = (snap.data?.insumos ?? []) as Insumo[];
  const expenses = snap.data?.expenses ?? [];
  const filamentoPayments = (snap.data?.filamentoPayments ?? []) as FilamentoPayment[];
  const filamentoInstallments = (snap.data?.filamentoInstallments ?? []) as FilamentoPaymentInstallment[];
  const filamentoPaymentEvents = (snap.data?.filamentoPaymentEvents ?? []) as FilamentoPaymentEvent[];
  const insumoPayments = (snap.data?.insumoPayments ?? []) as InsumoPayment[];
  const insumoInstallments = (snap.data?.insumoInstallments ?? []) as InsumoPaymentInstallment[];
  const insumoPaymentEvents = (snap.data?.insumoPaymentEvents ?? []) as InsumoPaymentEvent[];

  const [search, setSearch] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [stockView, setStockView] = useState<"list" | "table">("table");
  const [installmentViewFilter, setInstallmentViewFilter] = useState<InstallmentViewFilter>("pending");
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
  const [paymentHistorySourceFilter, setPaymentHistorySourceFilter] = useState<PaymentHistorySourceFilter>("all");
  const [paymentHistoryTypeFilter, setPaymentHistoryTypeFilter] = useState<PaymentHistoryTypeFilter>("all");
  const [expForm, setExpForm] = useState({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" });
  const [periodPreset, setPeriodPreset] = useState<FinancePeriodPreset>("month");
  const [periodAnchor, setPeriodAnchor] = useState(new Date().toISOString().slice(0, 7));

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); };
  const mutateAddExp = useMutation({ mutationFn: (data: any) => addManualExpense({ data }), onSuccess: () => { invalidate(); toast.success("Despesa adicionada."); setShowExpense(false); setExpForm({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" }); } });
  const mutateRemoveExp = useMutation({ mutationFn: (id: string) => removeExpense({ data: { id } }), onSuccess: () => { invalidate(); toast.success("Despesa removida."); } });
  const mutatePayInstallment = useMutation({
    mutationFn: (input: { installmentId: string; dataPagamento: string; valorPago?: number }) =>
      payInstallment({ data: input }),
    onSuccess: (_data, variables) => {
      const currentInstallment = filamentoInstallments.find((item) => item.id === variables.installmentId);
      const remaining = currentInstallment ? getInstallmentRemainingAmount(currentInstallment) : 0;
      const amount = variables.valorPago ?? remaining;
      const settled = amount >= remaining;
      invalidate();
      setInstallmentViewFilter(settled ? "paid" : "all");
      setHighlightedInstallmentId(variables.installmentId);
      setHighlightedPaymentId(null);
      toast.success(settled ? "Parcela quitada. Confira em Pagas." : "Pagamento parcial registrado. Confira em Todas.");
    },
  });
  const mutateSettlePayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settlePayment({ data: input }),
    onSuccess: (_data, variables) => {
      invalidate();
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
      const currentInstallment = insumoInstallments.find((item) => item.id === variables.installmentId);
      const remaining = currentInstallment ? getInstallmentRemainingAmount(currentInstallment) : 0;
      const amount = variables.valorPago ?? remaining;
      const settled = amount >= remaining;
      invalidate();
      setInstallmentViewFilter(settled ? "paid" : "all");
      setHighlightedInstallmentId(variables.installmentId);
      setHighlightedPaymentId(null);
      toast.success(settled ? "Parcela do insumo quitada. Confira em Pagas." : "Pagamento parcial do insumo registrado. Confira em Todas.");
    },
  });
  const mutateSettleInsumoPayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settleInsumoPayment({ data: input }),
    onSuccess: (_data, variables) => {
      invalidate();
      setInstallmentViewFilter("paid");
      setHighlightedInstallmentId(null);
      setHighlightedPaymentId(variables.paymentId);
      toast.success("Compra quitada. Confira em Pagas.");
    },
  });

  const periodLabel = useMemo(() => {
    if (periodPreset === "all") return "Período completo";
    const [year, month] = periodAnchor.split("-").map(Number);
    if (!year || !month) return "Período selecionado";
    if (periodPreset === "month") {
      return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${quarter}º trimestre de ${year}`;
  }, [periodAnchor, periodPreset]);

  const isDateInSelectedPeriod = (dateIso?: string | null) => {
    if (!dateIso) return periodPreset === "all";
    if (periodPreset === "all") return true;
    const [anchorYear, anchorMonth] = periodAnchor.split("-").map(Number);
    const [dateYear, dateMonth] = dateIso.slice(0, 7).split("-").map(Number);
    if (!anchorYear || !anchorMonth || !dateYear || !dateMonth) return false;
    if (periodPreset === "month") {
      return anchorYear === dateYear && anchorMonth === dateMonth;
    }
    return anchorYear === dateYear && Math.floor((anchorMonth - 1) / 3) === Math.floor((dateMonth - 1) / 3);
  };

  const periodFilteredVendas = useMemo(
    () => vendas.filter((v) => isDateInSelectedPeriod(v.data)),
    [vendas, periodAnchor, periodPreset],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => isDateInSelectedPeriod(expense.data)),
    [expenses, periodAnchor, periodPreset],
  );

  const insumoById = useMemo(
    () => new Map(insumos.map((item) => [item.id, item])),
    [insumos],
  );

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
    () => Array.from(new Set(allFilamentPurchases.map((item) => item.marca.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allFilamentPurchases],
  );

  const purchaseMaterials = useMemo(
    () => Array.from(new Set(allFilamentPurchases.map((item) => item.material.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [allFilamentPurchases],
  );

  const filteredPurchaseAnalysis = useMemo(
    () =>
      allFilamentPurchases.filter((item) => {
        if (!isDateInSelectedPeriod(item.dataCompra)) return false;
        if (purchaseBrandFilter !== "all" && item.marca !== purchaseBrandFilter) return false;
        if (purchaseMaterialFilter !== "all" && item.material !== purchaseMaterialFilter) return false;
        return true;
      }),
    [allFilamentPurchases, periodAnchor, periodPreset, purchaseBrandFilter, purchaseMaterialFilter],
  );

  const purchaseAnalysis = useMemo(() => {
    const count = filteredPurchaseAnalysis.length;
    const total = filteredPurchaseAnalysis.reduce((sum, item) => sum + item.precoPago, 0);
    const average = count > 0 ? total / count : 0;
    const min = count > 0 ? Math.min(...filteredPurchaseAnalysis.map((item) => item.precoPago)) : 0;
    const max = count > 0 ? Math.max(...filteredPurchaseAnalysis.map((item) => item.precoPago)) : 0;
    const target = 100;
    const delta = average - target;
    const belowTargetCount = filteredPurchaseAnalysis.filter((item) => item.precoPago < target).length;
    const aboveTargetCount = filteredPurchaseAnalysis.filter((item) => item.precoPago > target).length;
    const atTargetCount = filteredPurchaseAnalysis.filter((item) => item.precoPago === target).length;
    return { count, total, average, min, max, target, delta, belowTargetCount, aboveTargetCount, atTargetCount };
  }, [filteredPurchaseAnalysis]);

  const filteredFilamentoInstallments = useMemo(
    () =>
      filamentoInstallments.filter((installment) =>
        isDateInSelectedPeriod(installment.pago || isPartialInstallment(installment) ? installment.dataPagamento ?? installment.vencimento : installment.vencimento),
      ),
    [filamentoInstallments, periodAnchor, periodPreset],
  );
  const filteredInsumoInstallments = useMemo(
    () =>
      insumoInstallments.filter((installment) =>
        isDateInSelectedPeriod(installment.pago || isPartialInstallment(installment) ? installment.dataPagamento ?? installment.vencimento : installment.vencimento),
      ),
    [insumoInstallments, periodAnchor, periodPreset],
  );
  const filteredInstallments = useMemo(
    () => [...filteredFilamentoInstallments, ...filteredInsumoInstallments],
    [filteredFilamentoInstallments, filteredInsumoInstallments],
  );

  const filteredPaymentEvents = useMemo(
    () =>
      [
        ...filamentoPaymentEvents.map((event) => ({ ...event, kind: "filamento" as const })),
        ...insumoPaymentEvents.map((event) => ({ ...event, kind: "insumo" as const })),
      ]
        .filter((event) => isDateInSelectedPeriod(event.dataPagamento))
        .sort((a, b) => {
          const byDate = b.dataPagamento.localeCompare(a.dataPagamento);
          return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
        }),
    [filamentoPaymentEvents, insumoPaymentEvents, periodAnchor, periodPreset],
  );


  const totals = useMemo(() => {
    const receita = periodFilteredVendas.reduce((s, v) => s + v.valor, 0);
    const custo = periodFilteredVendas.reduce((s, v) => s + v.custo, 0);
    const despesasOperacionais = classifiedExpenses
      .filter((expense) => expense.financialClass === "operacional")
      .reduce((s, e) => s + e.valor, 0);
    const investimentos = classifiedExpenses
      .filter((expense) => expense.financialClass === "investimento")
      .reduce((s, e) => s + e.valor, 0);
    const lucro = receita - custo - despesasOperacionais;
    const depreciacaoAcumulada = periodFilteredVendas.reduce((s, v) => s + v.depreciacao, 0);
    return { receita, custo, lucro, depreciacaoAcumulada, despesasOperacionais, investimentos };
  }, [classifiedExpenses, periodFilteredVendas]);

  // Stock summary with full cost accounting per filament
  const stockSummary = useMemo(() => {
    return filamentos.map((f) => {
      const used = f.pesoInicial - f.pesoAtual;
      const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
      const valorConsumido = used * custoPorGrama;
      const valorRestante = f.pesoAtual * custoPorGrama;
      return {
        id: f.id,
        sku: f.sku,
        marca: f.marca,
        cor: f.cor,
        material: f.material,
        nome: f.label ?? `[${f.sku}] ${f.marca} ${f.cor}`,
        pesoInicial: f.pesoInicial,
        pesoAtual: f.pesoAtual,
        precoPago: f.precoPago,
        dataCompra: f.dataCompra,
        linkProduto: f.linkProduto ?? null,
        used,
        remaining: f.pesoAtual,
        percent: f.pesoInicial > 0 ? (used / f.pesoInicial) * 100 : 0,
        custoPorGrama,
        valorConsumido,
        valorRestante,
      };
    });
  }, [filamentos]);

  // Aggregated filament KPIs
  const filamentTotals = useMemo(() => {
    return stockSummary.reduce(
      (acc, s) => ({
        investido: acc.investido + s.precoPago,
        consumido: acc.consumido + s.valorConsumido,
        restante: acc.restante + s.valorRestante,
        gramasConsumidos: acc.gramasConsumidos + s.used,
        gramasRestantes: acc.gramasRestantes + s.remaining,
      }),
      { investido: 0, consumido: 0, restante: 0, gramasConsumidos: 0, gramasRestantes: 0 },
    );
  }, [stockSummary]);

  const despesasManuais = classifiedExpenses.filter((e) => e.source === "manual").reduce((s, e) => s + e.valor, 0);
  const despesasFalha = classifiedExpenses.filter((e) => e.source === "falha").reduce((s, e) => s + e.valor, 0);
  const despesasInsumosOperacionais = classifiedExpenses
    .filter((e) => e.source === "insumo" && e.financialClass === "operacional")
    .reduce((s, e) => s + e.valor, 0);

  // Installment (parcelas) KPIs
  const installmentKpis = useMemo(() => {
    const today = todayIso();
    const yearMonth = today.slice(0, 7);
    let pendente = 0;
    let vencendoEm30 = 0;
    let atrasadas = 0;
    for (const inst of filteredInstallments) {
      if (!inst.pago) {
        pendente += getInstallmentRemainingAmount(inst);
        if (inst.vencimento <= today) atrasadas++;
        const diffDays = (parseIsoDateLocal(inst.vencimento).getTime() - parseIsoDateLocal(today).getTime()) / 86400000;
        if (diffDays >= 0 && diffDays <= 30) vencendoEm30 += getInstallmentRemainingAmount(inst);
      }
    }
    const pagoNoMes = filteredPaymentEvents
      .filter((event) => event.dataPagamento.slice(0, 7) === yearMonth)
      .reduce((sum, event) => sum + getEventSignedAmount(event), 0);
    return { pendente, pagoNoMes, vencendoEm30, atrasadas };
  }, [filteredInstallments, filteredPaymentEvents]);

  const filamentoPaymentProgress = useMemo(() => {
    const grouped = new Map<string, { totalInstallments: number; paidInstallments: number; totalAmount: number; paidAmount: number }>();
    for (const installment of filteredFilamentoInstallments) {
      const current = grouped.get(installment.paymentId) ?? { totalInstallments: 0, paidInstallments: 0, totalAmount: 0, paidAmount: 0 };
      current.totalInstallments += 1;
      current.totalAmount += installment.valor;
      current.paidAmount += getInstallmentPaidAmount(installment);
      if (installment.pago) current.paidInstallments += 1;
      grouped.set(installment.paymentId, current);
    }
    return grouped;
  }, [filteredFilamentoInstallments]);

  const insumoPaymentProgress = useMemo(() => {
    const grouped = new Map<string, { totalInstallments: number; paidInstallments: number; totalAmount: number; paidAmount: number }>();
    for (const installment of filteredInsumoInstallments) {
      const current = grouped.get(installment.paymentId) ?? { totalInstallments: 0, paidInstallments: 0, totalAmount: 0, paidAmount: 0 };
      current.totalInstallments += 1;
      current.totalAmount += installment.valor;
      current.paidAmount += getInstallmentPaidAmount(installment);
      if (installment.pago) current.paidInstallments += 1;
      grouped.set(installment.paymentId, current);
    }
    return grouped;
  }, [filteredInsumoInstallments]);

  const scheduleEntries = useMemo(() => {
    const today = todayIso();
    const filamentEntries = filteredFilamentoInstallments
      .map((i) => {
        const payment = filamentoPayments.find((p) => p.id === i.paymentId) ?? null;
        const label = payment
          ? filamentos.filter((f) => f.batchId === payment.batchId).map((f) => f.sku).join(", ")
          : "";
        const progress = filamentoPaymentProgress.get(i.paymentId) ?? { totalInstallments: 0, paidInstallments: 0, totalAmount: 0, paidAmount: 0 };
        return { kind: "filamento" as const, inst: i, payment, label, overdue: !i.pago && i.vencimento <= today, progress };
      });
    const insumoEntries = filteredInsumoInstallments
      .map((i) => {
        const payment = insumoPayments.find((p) => p.id === i.paymentId) ?? null;
        const insumo = payment ? insumos.find((item) => item.id === payment.insumoId) : null;
        const progress = insumoPaymentProgress.get(i.paymentId) ?? { totalInstallments: 0, paidInstallments: 0, totalAmount: 0, paidAmount: 0 };
        return { kind: "insumo" as const, inst: i, payment, label: insumo?.nome ?? "", overdue: !i.pago && i.vencimento <= today, progress };
      });
    const allEntries = [...filamentEntries, ...insumoEntries];
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
  }, [
    filteredFilamentoInstallments,
    filteredInsumoInstallments,
    filamentoPayments,
    filamentos,
    insumoPayments,
    insumos,
    filamentoPaymentProgress,
    insumoPaymentProgress,
    installmentViewFilter,
  ]);

  const scheduleCounts = useMemo(
    () => ({
      pending: filteredInstallments.filter((item) => !item.pago).length,
      paid: filteredInstallments.filter((item) => item.pago).length,
      partial: filteredInstallments.filter((item) => isPartialInstallment(item)).length,
      total: filteredInstallments.length,
    }),
    [filteredInstallments],
  );

  const selectedFinanceInstallment = useMemo(() => {
    if (!payDialog) return null;
    const list = payDialog.kind === "filamento" ? filteredFilamentoInstallments : filteredInsumoInstallments;
    return list.find((item) => item.id === payDialog.installmentId) ?? null;
  }, [filteredFilamentoInstallments, filteredInsumoInstallments, payDialog]);

  const financeHistoryRows = useMemo(() => {
    const filamentoPaymentsById = new Map(filamentoPayments.map((payment) => [payment.id, payment]));
    const insumoPaymentsById = new Map(insumoPayments.map((payment) => [payment.id, payment]));
    const filamentoInstallmentsById = new Map(filamentoInstallments.map((installment) => [installment.id, installment]));
    const insumoInstallmentsById = new Map(insumoInstallments.map((installment) => [installment.id, installment]));

    return filteredPaymentEvents.map((event) => {
      if (event.kind === "filamento") {
        const installment = filamentoInstallmentsById.get(event.installmentId) ?? null;
        const payment = filamentoPaymentsById.get(event.paymentId) ?? null;
        const reference = payment
          ? filamentos.filter((item) => item.batchId === payment.batchId).map((item) => item.sku).join(", ")
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
  }, [
    filteredPaymentEvents,
    filamentoPayments,
    insumoPayments,
    filamentoInstallments,
    insumoInstallments,
    filamentos,
    insumos,
  ]);

  const visibleFinanceHistoryRows = useMemo(
    () =>
      financeHistoryRows.filter((row) => {
        if (paymentHistorySourceFilter !== "all" && row.kind !== paymentHistorySourceFilter) return false;
        if (paymentHistoryTypeFilter !== "all" && row.tipo !== paymentHistoryTypeFilter) return false;
        return true;
      }),
    [financeHistoryRows, paymentHistorySourceFilter, paymentHistoryTypeFilter],
  );

  const financeHistorySummary = useMemo(
    () => ({
      pagamentos: visibleFinanceHistoryRows.filter((row) => row.tipo === "pagamento").length,
      estornos: visibleFinanceHistoryRows.filter((row) => row.tipo === "estorno").length,
      saldo: visibleFinanceHistoryRows.reduce((sum, row) => sum + getEventSignedAmount(row), 0),
    }),
    [visibleFinanceHistoryRows],
  );

  const filteredVendas = useMemo(() => {
    if (!search.trim()) return periodFilteredVendas;
    const s = normalizeText(search);
    return periodFilteredVendas.filter((v) => normalizeText(v.projectName).includes(s) || normalizeText(v.client).includes(s));
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
        (expense.financialClass === "investimento" ? "Investimento / Imobilizado" : SOURCE_LABELS[expense.source]?.label ?? expense.source),
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

    return [...vendaRows, ...expenseRows, ...paymentEventRows].sort((a, b) => a.data.localeCompare(b.data));
  }, [classifiedExpenses, visibleFinanceHistoryRows, periodFilteredVendas]);

  const exportCsv = () => {
    const headers = ["tipo", "data", "descricao", "categoria", "cliente", "valor", "custo", "depreciacao", "status", "observacao"];
    const csvLines = [
      headers.join(";"),
      ...exportRows.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] ?? "";
            const text = typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value);
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financeiro-${periodPreset}-${periodAnchor}.csv`;
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
      .map(([label, value]) => `<div class="chip"><span>${label}</span><strong>${value}</strong></div>`)
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

      <div className="filament-top flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Período</Label>
            <Select value={periodPreset} onValueChange={(value) => setPeriodPreset(value as FinancePeriodPreset)}>
              <SelectTrigger className="min-w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Mês de referência</Label>
            <Input
              type="month"
              value={periodAnchor}
              onChange={(e) => setPeriodAnchor(e.target.value)}
              disabled={periodPreset === "all"}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{periodLabel}</Badge>
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

      {/* Manual / Como funciona */}
      <Accordion type="single" collapsible className="filament-top rounded-2xl border border-border bg-card px-6">
        <AccordionItem value="manual" className="border-0">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" style={{ color: "var(--filament-cyan)" }} />
              <span className="font-display text-base font-semibold">Como funciona o seu Financeiro (manual rápido)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-sm text-muted-foreground">
            <div className="space-y-5 leading-relaxed">
              <p>
                Este módulo calcula o seu <strong className="text-foreground">lucro real</strong> a partir de três entradas:
                vendas finalizadas, despesas operacionais registradas e o custo de produção de cada peça.
              </p>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-cyan)" }}>
                  1. Receita Total (entradas)
                </h4>
                <p>
                  Só conta como receita quando você <strong className="text-foreground">finaliza um pedido</strong> em{" "}
                  <em>Calculadora e Pedidos → coluna Concluído → botão Finalizar → "Kurtido e Vendido"</em> e informa o
                  valor recebido. ⚠️ Apenas arrastar o card para "Concluído" no Kanban <strong>não</strong> gera receita —
                  isso é só o status de impressão.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-magenta)" }}>
                  2. Despesas (saídas)
                </h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong className="text-foreground">Insumo operacional</strong> — itens de apoio como álcool, bicos e ferramentas consumíveis entram em <em>Despesas Operacionais</em>.</li>
                  <li><strong className="text-foreground">Investimento / Imobilizado</strong> — compras como impressoras não derrubam o lucro do mês; ficam separadas em <em>Investimentos</em>.</li>
                  <li><strong className="text-foreground">Manual</strong> — despesas fixas (aluguel, internet, marketing) adicionadas pelo botão "Nova despesa".</li>
                  <li><strong className="text-foreground">Falha</strong> — pedidos finalizados como "Falha de Impressão" geram despesa automática com o custo do filamento desperdiçado.</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-yellow)" }}>
                  3. Custo de Produção (por venda)
                </h4>
                <p>
                  Calculado peça a peça com a fórmula:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    filamento consumido (R$/g × g) + energia (kWh × tarifa) + depreciação (R$/h) + custo fixo por unidade
                  </code>. Esses parâmetros vêm de <em>Configurações</em>.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-green)" }}>
                  4. Lucro Líquido (resultado)
                </h4>
                <p className="rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground">
                  Lucro = Receita Total − Custo de Produção − Despesas Operacionais
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-2 font-semibold text-foreground">Exemplo prático</h4>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>Você comprou 1 impressora por <strong>R$ 5.299</strong> e 1 frasco de álcool por <strong>R$ 25</strong>.</li>
                  <li>→ Investimentos: <strong>R$ 5.299</strong>. Despesas operacionais: <strong>R$ 25</strong>.</li>
                  <li>Vendeu 10 chaveiros por <strong>R$ 150</strong> (Kurtido e Vendido).</li>
                  <li>→ Receita: <strong>R$ 150</strong>. Custo calculado (filamento + energia + depreciação): <strong>R$ 18</strong>.</li>
                  <li>→ <strong className="filament-text">Lucro Líquido = 150 − 18 − 25 = R$ 107</strong>. A impressora continua visível em investimentos, sem distorcer o lucro operacional.</li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Dica: filamentos seguem como estoque/investimento de produção e a impressora entra como imobilizado. Assim o resultado mensal fica mais fiel para análise gerencial.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground">Checklist diário</h4>
                <ol className="ml-4 list-decimal space-y-1 text-xs">
                  <li>Cadastrou um item em Outros Insumos? → escolha se ele e despesa operacional ou investimento / imobilizado.</li>
                  <li>Imprimiu e entregou um pedido? → finalize como "Kurtido e Vendido" com o valor recebido.</li>
                  <li>Print falhou? → finalize como "Falha de Impressão" para contabilizar a perda.</li>
                  <li>Pagou algo fora do estoque (luz, internet)? → "Nova despesa" aqui em Finanças.</li>
                </ol>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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

      {/* Filament Investment KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Investido em Filamentos"
          value={brl(filamentTotals.investido)}
          color="var(--filament-cyan)"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Filamento em Estoque"
          value={brl(filamentTotals.restante)}
          color="var(--filament-green)"
        />
        <KpiCard
          icon={<Wrench className="h-4 w-4" />}
          label="Filamento Consumido"
          value={brl(filamentTotals.consumido)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Estoque Físico Restante"
          value={`${filamentTotals.gramasRestantes.toFixed(0)} g`}
          color="var(--filament-pink)"
        />
      </div>

      <div className="filament-top rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Análise de Compra de Filamentos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Média do preço pago por rolo para comprovar se as compras estão abaixo da meta de R$ 100,00.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Marca</Label>
              <Select value={purchaseBrandFilter} onValueChange={setPurchaseBrandFilter}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {purchaseBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Material</Label>
              <Select value={purchaseMaterialFilter} onValueChange={setPurchaseMaterialFilter}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os materiais</SelectItem>
                  {purchaseMaterials.map((material) => (
                    <SelectItem key={material} value={material}>
                      {material}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={<Tags className="h-4 w-4" />}
            label="Preço Médio por Rolo"
            value={purchaseAnalysis.count > 0 ? brl(purchaseAnalysis.average) : "—"}
            color={purchaseAnalysis.count === 0 ? "var(--muted-foreground)" : purchaseAnalysis.average <= purchaseAnalysis.target ? "var(--filament-green)" : "var(--filament-magenta)"}
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Diferença da Meta"
            value={
              purchaseAnalysis.count > 0
                ? `${purchaseAnalysis.delta <= 0 ? "-" : "+"}${brl(Math.abs(purchaseAnalysis.delta))}`
                : "—"
            }
            color={purchaseAnalysis.count === 0 ? "var(--muted-foreground)" : purchaseAnalysis.delta <= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
          />
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Menor Preço"
            value={purchaseAnalysis.count > 0 ? brl(purchaseAnalysis.min) : "—"}
            color="var(--filament-cyan)"
          />
          <KpiCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Maior Preço"
            value={purchaseAnalysis.count > 0 ? brl(purchaseAnalysis.max) : "—"}
            color="var(--filament-yellow)"
          />
          <KpiCard
            icon={<Package className="h-4 w-4" />}
            label="Compras Analisadas"
            value={String(purchaseAnalysis.count)}
            color="var(--filament-pink)"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={purchaseAnalysis.count === 0
              ? "text-muted-foreground"
              : purchaseAnalysis.delta <= 0
                ? "border-green-500/30 bg-green-50 text-green-700"
                : "border-red-500/30 bg-red-50 text-red-700"}
          >
            {purchaseAnalysis.count === 0
              ? "Nenhuma compra encontrada no filtro atual"
              : purchaseAnalysis.delta <= 0
                ? `Média ${brl(Math.abs(purchaseAnalysis.delta))} abaixo da meta de R$ 100,00`
                : `Média ${brl(Math.abs(purchaseAnalysis.delta))} acima da meta de R$ 100,00`}
          </Badge>
          <Badge variant="secondary">{purchaseAnalysis.belowTargetCount} abaixo de R$ 100</Badge>
          <Badge variant="secondary">{purchaseAnalysis.atTargetCount} exatamente em R$ 100</Badge>
          <Badge variant="secondary">{purchaseAnalysis.aboveTargetCount} acima de R$ 100</Badge>
        </div>
      </div>

      {/* Installments (Parcelas) KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Parcelas Pendentes"
          value={brl(installmentKpis.pendente)}
          color="var(--filament-magenta)"
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label="Parcelas Pagas (mês)"
          value={brl(installmentKpis.pagoNoMes)}
          color="var(--filament-green)"
        />
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Vencendo em 30 dias"
          value={brl(installmentKpis.vencendoEm30)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Parcelas Atrasadas"
          value={String(installmentKpis.atrasadas)}
          color={installmentKpis.atrasadas > 0 ? "var(--filament-magenta)" : "var(--filament-cyan)"}
        />
      </div>

      {/* Depreciation Reserve + Filament Stock (with list/table toggle) */}
      <div className="filament-top rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Fundo de Reserva de Depreciação
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Valor acumulado para manutenções e peças da Bambu Lab A1. Esse dinheiro é
              separado de cada venda para garantir a longevidade das impressoras.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Acumulado
            </div>
            <div className="font-display text-3xl font-bold filament-text">
              {brl(totals.depreciacaoAcumulada)}
            </div>
          </div>
        </div>

        {/* Filament Stock with list/table toggle */}
        {stockSummary.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Estoque de Filamentos
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stockSummary.length} rolo(s) · {brl(filamentTotals.investido)} investidos ·{" "}
                  {brl(filamentTotals.consumido)} consumidos
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                <Button
                  size="sm"
                  variant={stockView === "list" ? "default" : "ghost"}
                  className="h-7 gap-1.5 px-3 text-xs"
                  onClick={() => setStockView("list")}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Lista
                </Button>
                <Button
                  size="sm"
                  variant={stockView === "table" ? "default" : "ghost"}
                  className="h-7 gap-1.5 px-3 text-xs"
                  onClick={() => setStockView("table")}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Tabela
                </Button>
              </div>
            </div>

            {stockView === "list" ? (
              <div className="space-y-3">
                {stockSummary.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border bg-card/60 p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{s.nome}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {s.sku}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, s.percent)}%`,
                            background:
                              s.percent > 80
                                ? "var(--filament-magenta)"
                                : s.percent > 50
                                  ? "var(--filament-yellow)"
                                  : "var(--filament-green)",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {s.remaining}g restantes ({s.percent.toFixed(0)}% usado)
                        </span>
                        <span className="tabular-nums">
                          {s.used.toFixed(0)}g × {brl(s.custoPorGrama)}/g ={" "}
                          <strong className="text-foreground">{brl(s.valorConsumido)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <StatChip label="Investido" value={brl(s.precoPago)} />
                      <StatChip label="Consumido" value={brl(s.valorConsumido)} />
                      <StatChip label="Em estoque" value={brl(s.valorRestante)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Marca / Cor</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Peso Inicial</TableHead>
                      <TableHead className="text-right">Peso Atual</TableHead>
                      <TableHead className="text-right">% Usado</TableHead>
                      <TableHead className="text-right">Custo/g</TableHead>
                      <TableHead className="text-right">Investido</TableHead>
                      <TableHead className="text-right">Consumido</TableHead>
                      <TableHead className="text-right">Em Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSummary.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                        <TableCell className="font-medium">
                          {s.marca} — {s.cor}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.material}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {s.pesoInicial}g
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {s.pesoAtual}g
                        </TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          style={{
                            color:
                              s.percent > 80
                                ? "var(--filament-magenta)"
                                : s.percent > 50
                                  ? "var(--filament-yellow)"
                                  : "var(--filament-green)",
                          }}
                        >
                          {s.percent.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(s.custoPorGrama)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(s.precoPago)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(s.valorConsumido)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold filament-text">
                          {brl(s.valorRestante)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={7} className="text-right text-xs font-semibold">
                        Totais ({stockSummary.length} rolos)
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {brl(filamentTotals.investido)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-muted-foreground">
                        {brl(filamentTotals.consumido)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold filament-text">
                        {brl(filamentTotals.restante)}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Installments Schedule */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-display text-lg font-semibold">Cronograma de Parcelas</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{scheduleCounts.pending} pendente(s)</span>
                <span>· {scheduleCounts.paid} paga(s)</span>
                <span>· {scheduleCounts.partial} parcial(is)</span>
                <span>· {scheduleCounts.total} no período</span>
                {installmentKpis.atrasadas > 0 && (
                  <span className="font-semibold text-destructive">
                    · {installmentKpis.atrasadas} atrasada(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <Badge variant="secondary">
              {installmentViewFilter === "pending"
                ? "Mostrando apenas pendentes"
                : installmentViewFilter === "paid"
                  ? "Mostrando pagamentos confirmados"
                  : "Mostrando pendentes e pagas"}
            </Badge>
          </div>
        </div>
        <div className="border-b border-border px-6 py-3 text-xs text-muted-foreground">
          Ao clicar em <strong className="text-foreground">Pagar</strong>, voce pode registrar o valor total ou um valor parcial. A parcela so vira <strong className="text-foreground">Pago</strong> quando o saldo restante chegar a zero.
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
                  <TableHead>#</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Data Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Forma</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleEntries.map(({ kind, inst, payment, label, overdue, progress }) => (
                  <TableRow
                    key={inst.id}
                    className={
                      highlightedInstallmentId === inst.id || highlightedPaymentId === inst.paymentId
                        ? "bg-green-50/60"
                        : undefined
                    }
                  >
                    <TableCell className="font-mono text-xs">{inst.numero}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {label ? (
                          <span className={kind === "filamento" ? "font-mono" : "font-medium"}>{label}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <Badge
                          variant="secondary"
                          className={
                            progress.totalAmount > 0 && progress.paidAmount >= progress.totalAmount
                              ? "border-green-600/20 bg-green-50 text-green-700"
                              : progress.paidAmount > 0
                                ? "border-amber-500/20 bg-amber-50 text-amber-700"
                                : ""
                          }
                        >
                          {progress.totalAmount > 0 && progress.paidAmount >= progress.totalAmount
                            ? "Quitado"
                            : progress.paidAmount > 0
                              ? `Parcial ${brl(progress.paidAmount)}`
                              : payment?.formaPagamento === "a_vista"
                                ? "Em aberto"
                                : `Em aberto 0/${progress.totalInstallments}`}
                        </Badge>
                      </div>
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
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-50 text-[10px] text-amber-700">
                          Parcial
                        </Badge>
                      ) : overdue ? (
                        <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {payment?.formaPagamento === "a_vista" ? (
                        <Badge variant="outline" className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]">
                          <Banknote className="h-3 w-3" /> À vista
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]">
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
                          disabled={mutatePayInstallment.isPending || mutateSettlePayment.isPending || mutatePayInsumoInstallment.isPending || mutateSettleInsumoPayment.isPending}
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
                            disabled={mutateSettlePayment.isPending || mutateSettleInsumoPayment.isPending}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                Parcela de <strong className="text-foreground">{brl(selectedFinanceInstallment.valor)}</strong>
                {" · "}
                ja pago: <strong className="text-foreground">{brl(getInstallmentPaidAmount(selectedFinanceInstallment))}</strong>
                {" · "}
                restante: <strong className="text-foreground">{brl(getInstallmentRemainingAmount(selectedFinanceInstallment))}</strong>
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Data do pagamento</Label>
                <Input
                  type="date"
                  value={payDialog.dataPagamento}
                  onChange={(e) => setPayDialog((current) => current ? { ...current, dataPagamento: e.target.value } : current)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor a adicionar (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payDialog.valorPago}
                  onChange={(e) => setPayDialog((current) => current ? { ...current, valorPago: e.target.value } : current)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (!payDialog || !selectedFinanceInstallment) return;
                    const amount = Number(payDialog.valorPago);
                    if (!Number.isFinite(amount) || amount <= 0 || amount > getInstallmentRemainingAmount(selectedFinanceInstallment)) {
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
                    Number(payDialog.valorPago) > getInstallmentRemainingAmount(selectedFinanceInstallment)
                  }
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Histórico de Pagamentos</h2>
            <p className="text-xs text-muted-foreground">
              Cada parcial, quitação e estorno fica registrado como um evento separado para auditoria.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-[11px]">Origem</Label>
              <Select
                value={paymentHistorySourceFilter}
                onValueChange={(value) => setPaymentHistorySourceFilter(value as PaymentHistorySourceFilter)}
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
                onValueChange={(value) => setPaymentHistoryTypeFilter(value as PaymentHistoryTypeFilter)}
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
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{financeHistorySummary.pagamentos} pagamento(s)</Badge>
              <Badge variant="secondary">{financeHistorySummary.estornos} estorno(s)</Badge>
              <Badge
                variant="secondary"
                className={financeHistorySummary.saldo >= 0 ? "text-green-700" : "text-destructive"}
              >
                Saldo movimentado: {brl(financeHistorySummary.saldo)}
              </Badge>
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
                    <TableCell className="font-mono text-xs">
                      {row.numero ?? "—"}
                    </TableCell>
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
                      {row.formaPagamento === "a_vista" ? (
                        <Badge variant="outline" className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]">
                          <Banknote className="h-3 w-3" /> À vista
                        </Badge>
                      ) : row.formaPagamento === "parcelado" ? (
                        <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]">
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
              <Badge variant="secondary">Insumos operacionais: {brl(despesasInsumosOperacionais)}</Badge>
              <Badge variant="secondary">Manuais: {brl(despesasManuais)}</Badge>
            </div>
          </div>
          <Button size="sm" className="btn-filament gap-2" onClick={() => setShowExpense(true)}><Plus className="h-4 w-4" />Nova despesa</Button>
        </div>
        {classifiedExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhuma saída registrada.</div>
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
                  e.categoria ?? (e.financialClass === "investimento" ? "Investimento / Imobilizado" : "Despesa Operacional");
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.descricao}</TableCell>
                    <TableCell><Badge variant="secondary">{categoryLabel}</Badge></TableCell>
                    <TableCell><Badge variant="outline" style={{ borderColor: src.color, color: src.color }}>{src.label}</Badge></TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{formatIsoDatePtBr(e.data)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{brl(e.valor)}</TableCell>
                    <TableCell>
                      {e.source !== "insumo" && (
                        <Button size="icon" variant="ghost" onClick={() => mutateRemoveExp.mutate(e.id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
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
                    <TableCell className="text-right tabular-nums">
                      {brl(v.valor)}
                    </TableCell>
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
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutateAddExp.mutate({ descricao: expForm.descricao.trim(), valor: Number(expForm.valor), data: expForm.data, categoria: expForm.categoria || null }); }}>
            <div className="grid gap-2"><Label>Descrição *</Label><Input value={expForm.descricao} onChange={(e) => setExpForm((s) => ({ ...s, descricao: e.target.value }))} required placeholder="Ex: Aluguel do mês, Internet..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Valor (R$) *</Label><Input type="number" min={0.01} step={0.01} value={expForm.valor} onChange={(e) => setExpForm((s) => ({ ...s, valor: e.target.value }))} required /></div>
              <div className="grid gap-2"><Label>Data</Label><Input type="date" value={expForm.data} onChange={(e) => setExpForm((s) => ({ ...s, data: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Categoria</Label>
              <Select value={expForm.categoria} onValueChange={(v) => setExpForm((s) => ({ ...s, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpense(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={!expForm.descricao.trim() || !expForm.valor || mutateAddExp.isPending}>Adicionar</Button>
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
