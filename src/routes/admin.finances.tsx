import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, TrendingUp, DollarSign, Package, Plus, Trash2, AlertCircle, BookOpen, LayoutList, Table as TableIcon, CreditCard, Banknote, CalendarClock, Check, Download, FileText } from "lucide-react";
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
import { listSnapshot, addManualExpense, removeExpense, payInstallment, settlePayment } from "@/lib/api/data.functions";
import type { FilamentoPayment, FilamentoPaymentInstallment } from "@/lib/domain/types";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

const EXPENSE_CATEGORIES = ["Aluguel","Internet","Manutenção","Energia","Perda de Material","Transporte","Marketing","Outros"] as const;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  insumo: { label: "Insumo", color: "var(--filament-yellow)" },
  manual: { label: "Manual", color: "var(--filament-cyan)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

type FinancePeriodPreset = "all" | "month" | "quarter";

function Finances() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const vendas = snap.data?.vendas ?? [];
  const orders = snap.data?.orders ?? [];
  const filamentos = snap.data?.filamentos ?? [];
  const expenses = snap.data?.expenses ?? [];
  const filamentoPayments = (snap.data?.filamentoPayments ?? []) as FilamentoPayment[];
  const filamentoInstallments = (snap.data?.filamentoInstallments ?? []) as FilamentoPaymentInstallment[];

  const [search, setSearch] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [stockView, setStockView] = useState<"list" | "table">("table");
  const [expForm, setExpForm] = useState({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" });
  const [periodPreset, setPeriodPreset] = useState<FinancePeriodPreset>("month");
  const [periodAnchor, setPeriodAnchor] = useState(new Date().toISOString().slice(0, 7));

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); };
  const mutateAddExp = useMutation({ mutationFn: (data: any) => addManualExpense({ data }), onSuccess: () => { invalidate(); toast.success("Despesa adicionada."); setShowExpense(false); setExpForm({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" }); } });
  const mutateRemoveExp = useMutation({ mutationFn: (id: string) => removeExpense({ data: { id } }), onSuccess: () => { invalidate(); toast.success("Despesa removida."); } });
  const mutatePayInstallment = useMutation({
    mutationFn: (input: { installmentId: string; dataPagamento: string; valorPago?: number }) =>
      payInstallment({ data: input }),
    onSuccess: () => { invalidate(); toast.success("Parcela marcada como paga."); },
  });
  const mutateSettlePayment = useMutation({
    mutationFn: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) =>
      settlePayment({ data: input }),
    onSuccess: () => { invalidate(); toast.success("Todas as parcelas quitadas."); },
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

  const filteredInstallments = useMemo(
    () =>
      filamentoInstallments.filter((installment) =>
        isDateInSelectedPeriod(installment.pago ? installment.dataPagamento ?? installment.vencimento : installment.vencimento),
      ),
    [filamentoInstallments, periodAnchor, periodPreset],
  );

  const totals = useMemo(() => {
    const receita = periodFilteredVendas.reduce((s, v) => s + v.valor, 0);
    const custo = periodFilteredVendas.reduce((s, v) => s + v.custo, 0);
    const despesas = filteredExpenses.reduce((s, e) => s + e.valor, 0);
    const lucro = receita - custo - despesas;
    const depreciacaoAcumulada = periodFilteredVendas.reduce((s, v) => s + v.depreciacao, 0);
    return { receita, custo, lucro, depreciacaoAcumulada, despesas };
  }, [periodFilteredVendas, filteredExpenses]);

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

  const despesasManuais = filteredExpenses.filter((e) => e.source === "manual").reduce((s, e) => s + e.valor, 0);
  const despesasFalha = filteredExpenses.filter((e) => e.source === "falha").reduce((s, e) => s + e.valor, 0);
  const despesasInsumos = filteredExpenses.filter((e) => e.source === "insumo").reduce((s, e) => s + e.valor, 0);

  // Installment (parcelas) KPIs
  const installmentKpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const yearMonth = today.slice(0, 7);
    let pendente = 0;
    let pagoNoMes = 0;
    let vencendoEm30 = 0;
    let atrasadas = 0;
    for (const inst of filteredInstallments) {
      if (!inst.pago) {
        pendente += inst.valor;
        if (inst.vencimento <= today) atrasadas++;
        const diffDays = (new Date(inst.vencimento).getTime() - new Date(today).getTime()) / 86400000;
        if (diffDays >= 0 && diffDays <= 30) vencendoEm30 += inst.valor;
      } else if (inst.dataPagamento && inst.dataPagamento.slice(0, 7) === yearMonth) {
        pagoNoMes += inst.valorPago ?? inst.valor;
      }
    }
    return { pendente, pagoNoMes, vencendoEm30, atrasadas };
  }, [filteredInstallments]);

  const upcomingInstallments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return filteredInstallments
      .filter((i) => !i.pago)
      .map((i) => {
        const payment = filamentoPayments.find((p) => p.id === i.paymentId);
        const batchSkus = payment
          ? filamentos.filter((f) => f.batchId === payment.batchId).map((f) => f.sku)
          : [];
        return { inst: i, payment, batchSkus, overdue: i.vencimento <= today };
      })
      .sort((a, b) => a.inst.vencimento.localeCompare(b.inst.vencimento));
  }, [filteredInstallments, filamentoPayments, filamentos]);

  const filteredVendas = useMemo(() => {
    if (!search.trim()) return periodFilteredVendas;
    const s = search.toLowerCase().trim();
    return periodFilteredVendas.filter((v) => v.projectName.toLowerCase().includes(s) || v.client.toLowerCase().includes(s));
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

    const expenseRows = filteredExpenses.map((expense) => ({
      tipo: "Despesa",
      data: expense.data,
      descricao: expense.descricao,
      categoria: expense.categoria ?? SOURCE_LABELS[expense.source]?.label ?? expense.source,
      cliente: "",
      valor: expense.valor,
      custo: "",
      depreciacao: "",
      status: expense.source === "manual" ? "Lançada" : "Automática",
      observacao: expense.source,
    }));

    const installmentRows = filteredInstallments.map((installment) => ({
      tipo: "Parcela",
      data: installment.pago ? installment.dataPagamento ?? installment.vencimento : installment.vencimento,
      descricao: `Parcela ${installment.numero}`,
      categoria: "Filamento",
      cliente: "",
      valor: installment.pago ? installment.valorPago ?? installment.valor : installment.valor,
      custo: "",
      depreciacao: "",
      status: installment.pago ? "Pago" : "Pendente",
      observacao: installment.observacao ?? "",
    }));

    return [...vendaRows, ...expenseRows, ...installmentRows].sort((a, b) => a.data.localeCompare(b.data));
  }, [filteredExpenses, filteredInstallments, periodFilteredVendas]);

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
      ["Despesas", brl(totals.despesas)],
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
                vendas finalizadas, despesas registradas e o custo de produção de cada peça.
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
                  <li><strong className="text-foreground">Insumo</strong> — todo item cadastrado em <em>Estoque → Outros Insumos</em> vira despesa automática com o valor pago.</li>
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
                  Lucro = Receita Total − Custo de Produção − Despesas (insumos + manuais + falhas)
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-2 font-semibold text-foreground">Exemplo prático</h4>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>Você comprou 1 rolo PLA por <strong>R$ 120</strong> e 1 frasco de álcool por <strong>R$ 25</strong>.</li>
                  <li>→ Despesas automáticas: <strong>R$ 145</strong> (origem Insumo).</li>
                  <li>Vendeu 10 chaveiros por <strong>R$ 150</strong> (Kurtido e Vendido).</li>
                  <li>→ Receita: <strong>R$ 150</strong>. Custo calculado (filamento + energia + depreciação): <strong>R$ 18</strong>.</li>
                  <li>→ <strong className="filament-text">Lucro Líquido = 150 − 18 − 145 = −R$ 13</strong> (no vermelho até diluir o investimento do rolo nas próximas vendas).</li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Dica: o rolo de filamento é despesa única no mês da compra, mas rende ~166 chaveiros de 6g. A partir da
                  segunda dúzia de vendas o lucro fica positivo.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground">Checklist diário</h4>
                <ol className="ml-4 list-decimal space-y-1 text-xs">
                  <li>Cadastrou compra de filamento ou insumo? → vai direto para Despesas.</li>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Despesas"
          value={brl(totals.despesas)}
          color="var(--filament-magenta)"
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
              <p className="text-xs text-muted-foreground">
                {upcomingInstallments.length} parcela(s) pendente(s)
                {installmentKpis.atrasadas > 0 && (
                  <span className="ml-2 font-semibold text-destructive">
                    · {installmentKpis.atrasadas} atrasada(s)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        {upcomingInstallments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma parcela pendente. Todos os pagamentos estão em dia.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Forma</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingInstallments.map(({ inst, payment, batchSkus, overdue }) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-mono text-xs">{inst.numero}</TableCell>
                    <TableCell className="text-xs">
                      {batchSkus.length > 0 ? (
                        <span className="font-mono">{batchSkus.join(", ")}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs tabular-nums ${overdue ? "font-semibold text-destructive" : ""}`}
                      >
                        {new Date(inst.vencimento).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(inst.valor)}</TableCell>
                    <TableCell className="text-center">
                      {overdue ? (
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
                          disabled={mutatePayInstallment.isPending || mutateSettlePayment.isPending}
                          onClick={() =>
                            mutatePayInstallment.mutate({
                              installmentId: inst.id,
                              dataPagamento: new Date().toISOString().slice(0, 10),
                            })
                          }
                        >
                          <Check className="h-3 w-3" /> Pagar
                        </Button>
                        {payment && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs"
                            disabled={mutateSettlePayment.isPending}
                            onClick={() =>
                              mutateSettlePayment.mutate({
                                paymentId: payment.id,
                                dataPagamento: new Date().toISOString().slice(0, 10),
                              })
                            }
                          >
                            Quitar lote
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

      {/* Expenses Section */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Despesas</h2>
          </div>
          <Button size="sm" className="btn-filament gap-2" onClick={() => setShowExpense(true)}><Plus className="h-4 w-4" />Nova despesa</Button>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhuma despesa registrada.</div>
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
              {filteredExpenses.map((e) => {
                const src = SOURCE_LABELS[e.source] ?? { label: e.source, color: "#999" };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.descricao}</TableCell>
                    <TableCell>{e.categoria ? <Badge variant="secondary">{e.categoria}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant="outline" style={{ borderColor: src.color, color: src.color }}>{src.label}</Badge></TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-BR")}</TableCell>
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
