import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { brl } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Download, 
  FileText, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useOrders } from "@/lib/hooks/use-orders";
import { useVendas } from "@/lib/hooks/use-vendas";
import { useFilamentos } from "@/lib/hooks/use-filamentos";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useCalendarEvents } from "@/lib/hooks/use-calendar-events";
import { useBudgetQuotes } from "@/lib/hooks/use-budget-quotes";
import { normalizeText } from "@/lib/utils/normalization";

export const Route = createFileRoute("/admin/reports")({
  component: Reports,
});

type ReportPeriodPreset = "7d" | "30d" | "90d" | "all" | "custom";

interface PerformanceMetrics {
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  successRate: number;
  avgProductionTimeHours: number;
  avgDeliveryDays: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  avgTicketValue: number;
  filamentConsumedGrams: number;
  activeClients: number;
}

function Reports() {
  const qc = useQueryClient();
  const { data: ordersData } = useOrders();
  const { data: vendasData } = useVendas();
  const { data: filamentosData } = useFilamentos();
  const { data: expensesData } = useExpenses();
  const { data: calendarEventsData } = useCalendarEvents();
  const { data: budgetQuotesData } = useBudgetQuotes();

  const orders = ordersData ?? [];
  const vendas = vendasData ?? [];
  const filamentos = filamentosData?.filamentos ?? [];
  const expenses = expensesData ?? [];
  const calendarEvents = calendarEventsData ?? [];
  const budgetQuotes = budgetQuotesData ?? [];

  const [periodPreset, setPeriodPreset] = useState<ReportPeriodPreset>("30d");
  const [reportType, setReportType] = useState<"overview" | "revenue" | "performance" | "inventory">("overview");
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Filter dates based on period preset
  const getFilteredDates = () => {
    const now = new Date();
    let start = new Date();
    
    switch (periodPreset) {
      case "7d":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        start = new Date(startDate);
        break;
      case "all":
      default:
        return { start: null, end: null };
    }
    
    return {
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  };

  const filteredDates = getFilteredDates();

  const isInPeriod = (dateIso?: string | null) => {
    if (!dateIso) return periodPreset === "all";
    if (periodPreset === "all") return true;
    if (!filteredDates.start) return true;
    return dateIso >= filteredDates.start && dateIso <= filteredDates.end;
  };

  // Performance Metrics Calculation
  const performanceMetrics: PerformanceMetrics = useMemo(() => {
    const filteredOrders = orders.filter((o) => isInPeriod(o.createdAt));
    const filteredVendas = vendas.filter((v) => isInPeriod(v.data));
    const filteredExpenses = expenses.filter((e) => isInPeriod(e.data));
    
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === "vendido").length;
    const failedOrders = filteredOrders.filter((o) => o.status === "falha").length;
    const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    const avgProductionTimeHours = filteredOrders.length > 0
      ? filteredOrders.reduce((sum, o) => sum + o.timeMinutes, 0) / filteredOrders.length / 60
      : 0;
    
    const totalRevenue = filteredVendas.reduce((sum, v) => sum + v.valor, 0);
    const totalCost = filteredVendas.reduce((sum, v) => sum + v.custo, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);
    const totalProfit = totalRevenue - totalCost - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgTicketValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    
    // Calculate filament consumption from inventory transactions
    const filamentConsumedGrams = filamentos.reduce((sum, f) => sum + (f.pesoInicial - f.pesoAtual), 0);
    
    // Active clients (those with orders in period)
    const activeClients = new Set(filteredOrders.map((o) => o.clientId).filter(Boolean)).size;
    
    // Average delivery time (estimate based on created_at to now for completed orders)
    const completedOrdersList = filteredOrders.filter((o) => o.status === "vendido");
    const avgDeliveryDays = completedOrdersList.length > 0
      ? completedOrdersList.reduce((sum, o) => {
          const created = new Date(o.createdAt).getTime();
          const now = Date.now();
          return sum + ((now - created) / (1000 * 60 * 60 * 24));
        }, 0) / completedOrdersList.length
      : 0;

    return {
      totalOrders,
      completedOrders,
      failedOrders,
      successRate,
      avgProductionTimeHours,
      avgDeliveryDays,
      totalRevenue,
      totalProfit,
      profitMargin,
      avgTicketValue,
      filamentConsumedGrams,
      activeClients,
    };
  }, [orders, vendas, expenses, filamentos, periodPreset, filteredDates]);

  // Revenue by month for chart data
  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    }).reverse();

    for (const month of last12Months) {
      months[month] = 0;
    }

    vendas.forEach((v) => {
      const month = v.data.slice(0, 7);
      if (months.hasOwnProperty(month)) {
        months[month] += v.valor;
      }
    });

    return Object.entries(months).map(([month, value]) => ({ month, value }));
  }, [vendas]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    return statusCounts;
  }, [orders]);

  // Top clients by revenue
  const topClients = useMemo(() => {
    const clientRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
    
    vendas.forEach((v) => {
      if (!clientRevenue[v.client]) {
        clientRevenue[v.client] = { name: v.client, revenue: 0, orders: 0 };
      }
      clientRevenue[v.client].revenue += v.valor;
      clientRevenue[v.client].orders++;
    });

    return Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [vendas]);

  // Budget quotes stats
  const quotesStats = useMemo(() => {
    const stats = {
      total: budgetQuotes.length,
      draft: budgetQuotes.filter((q) => q.status === "draft").length,
      sent: budgetQuotes.filter((q) => q.status === "sent").length,
      approved: budgetQuotes.filter((q) => q.status === "approved").length,
      converted: budgetQuotes.filter((q) => q.status === "converted").length,
      rejected: budgetQuotes.filter((q) => q.status === "rejected").length,
      expired: budgetQuotes.filter((q) => q.status === "expired").length,
      conversionRate: 0,
    };
    return stats;
  }, [budgetQuotes]);

  // Export functions
  const exportToCSV = (data: any[], filename: string, columns: string[]) => {
    const csvLines = [
      columns.join(";"),
      ...data.map((row) =>
        columns
          .map((col) => {
            const value = row[col] ?? "";
            const text = typeof value === "number" ? value.toFixed(2).replace(".", ",") : String(value);
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(";")
      ),
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ${filename}`);
  };

  const handleExportRevenue = () => {
    const data = vendas.map((v) => ({
      data: v.data,
      projeto: v.projectName,
      cliente: v.client,
      valor: v.valor,
      custo: v.custo,
      lucro: v.valor - v.custo,
      depreciacao: v.depreciacao,
    }));
    exportToCSV(data, `receita-${new Date().toISOString().slice(0, 10)}.csv`, [
      "data",
      "projeto",
      "cliente",
      "valor",
      "custo",
      "lucro",
      "depreciacao",
    ]);
  };

  const handleExportPerformance = () => {
    const data = orders.map((o) => ({
      id: o.id,
      projeto: o.projectName,
      cliente: o.client,
      status: o.status,
      quantidade: o.quantity,
      tempo_minutos: o.timeMinutes,
      criado_em: o.createdAt,
      atualizado_em: o.updatedAt,
    }));
    exportToCSV(data, `performance-${new Date().toISOString().slice(0, 10)}.csv`, [
      "id",
      "projeto",
      "cliente",
      "status",
      "quantidade",
      "tempo_minutos",
      "criado_em",
      "atualizado_em",
    ]);
  };

  const handleExportInventory = () => {
    const data = filamentos.map((f) => ({
      sku: f.sku,
      marca: f.marca,
      cor: f.cor,
      material: f.material,
      peso_inicial_g: f.pesoInicial,
      peso_atual_g: f.pesoAtual,
      consumido_g: f.pesoInicial - f.pesoAtual,
      preco_pago: f.precoPago,
      data_compra: f.dataCompra,
    }));
    exportToCSV(data, `estoque-${new Date().toISOString().slice(0, 10)}.csv`, [
      "sku",
      "marca",
      "cor",
      "material",
      "peso_inicial_g",
      "peso_atual_g",
      "consumido_g",
      "preco_pago",
      "data_compra",
    ]);
  };

  const handleExportAll = () => {
    handleExportRevenue();
    handleExportPerformance();
    handleExportInventory();
    toast.success("Todos os relatórios exportados!");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Relatórios & Performance</h1>
          <p className="text-sm text-muted-foreground">
            Métricas de faturamento, performance operacional e exportação de dados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportRevenue}>
            <Download className="h-4 w-4 mr-2" />
            Receita CSV
          </Button>
          <Button variant="outline" onClick={handleExportPerformance}>
            <Download className="h-4 w-4 mr-2" />
            Pedidos CSV
          </Button>
          <Button variant="outline" onClick={handleExportInventory}>
            <Download className="h-4 w-4 mr-2" />
            Estoque CSV
          </Button>
          <Button className="btn-filament" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <Label>Período</Label>
            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as ReportPeriodPreset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodPreset === "custom" && (
            <>
              <div className="grid gap-2">
                <Label>Data início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Data fim</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant={reportType === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType("overview")}
            >
              Visão Geral
            </Button>
            <Button
              variant={reportType === "revenue" ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType("revenue")}
            >
              Faturamento
            </Button>
            <Button
              variant={reportType === "performance" ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType("performance")}
            >
              Performance
            </Button>
            <Button
              variant={reportType === "inventory" ? "default" : "outline"}
              size="sm"
              onClick={() => setReportType("inventory")}
            >
              Estoque
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Total"
          value={brl(performanceMetrics.totalRevenue)}
          color="var(--filament-green)"
          trend={performanceMetrics.totalRevenue > 0 ? "up" : "neutral"}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro Líquido"
          value={brl(performanceMetrics.totalProfit)}
          color={performanceMetrics.totalProfit >= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
          trend={performanceMetrics.totalProfit >= 0 ? "up" : "down"}
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Pedidos Totais"
          value={performanceMetrics.totalOrders.toString()}
          color="var(--filament-cyan)"
          subvalue={`${performanceMetrics.completedOrders} concluídos`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Taxa de Sucesso"
          value={`${performanceMetrics.successRate.toFixed(1)}%`}
          color={performanceMetrics.successRate >= 90 ? "var(--filament-green)" : "var(--filament-yellow)"}
          trend={performanceMetrics.successRate >= 90 ? "up" : "neutral"}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clientes Ativos"
          value={performanceMetrics.activeClients.toString()}
          color="var(--filament-blue)"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Tempo Médio Produção"
          value={`${performanceMetrics.avgProductionTimeHours.toFixed(1)}h`}
          color="var(--filament-purple)"
        />
        <KpiCard
          icon={<Printer className="h-4 w-4" />}
          label="Filamento Consumido"
          value={`${(performanceMetrics.filamentConsumedGrams / 1000).toFixed(2)} kg`}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="Orçamentos"
          value={`${quotesStats.approved}/${quotesStats.total}`}
          color="var(--filament-cyan)"
          subvalue={`${quotesStats.conversionRate.toFixed(1)}% conversão`}
        />
      </div>

      {/* Revenue Chart Placeholder */}
      {(reportType === "overview" || reportType === "revenue") && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Receita Mensal (Últimos 12 meses)</h2>
          </div>
          <div className="p-6">
            <div className="h-[300px] flex items-end gap-2">
              {revenueByMonth.map(({ month, value }) => {
                const maxValue = Math.max(...revenueByMonth.map((m) => m.value));
                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-filament-green/80 to-filament-green rounded-t-md transition-all"
                      style={{ height: `${height}%`, minHeight: value > 0 ? "8px" : "0" }}
                    />
                    <span className="text-xs text-muted-foreground rotate-0">
                      {new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Top Clients */}
      {(reportType === "overview" || reportType === "performance") && (
        <Card>
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Top 5 Clientes</h2>
            <Badge variant="secondary">{topClients.length} clientes</Badge>
          </div>
          {topClients.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum cliente com vendas registradas.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total Vendas</TableHead>
                  <TableHead className="text-right">Receita Gerada</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client) => (
                  <TableRow key={client.name}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-right">{client.orders}</TableCell>
                    <TableCell className="text-right font-semibold">{brl(client.revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {brl(client.revenue / client.orders)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Orders by Status */}
      {(reportType === "overview" || reportType === "performance") && (
        <Card>
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Pedidos por Status</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div key={status} className="rounded-lg border border-border p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {status === "todo" && "A Fazer"}
                    {status === "printing" && "Imprimindo"}
                    {status === "done" && "Concluído"}
                    {status === "vendido" && "Vendido"}
                    {status === "presente" && "Presente"}
                    {status === "falha" && "Falha"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Budget Quotes Stats */}
      {(reportType === "overview" || reportType === "revenue") && (
        <Card>
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Orçamentos</h2>
            <Badge variant="secondary">{quotesStats.total} total</Badge>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
              {[
                { key: "draft", label: "Rascunho", color: "bg-muted" },
                { key: "sent", label: "Enviado", color: "bg-blue-500" },
                { key: "approved", label: "Aprovado", color: "bg-green-500" },
                { key: "converted", label: "Convertido", color: "bg-filament-green" },
                { key: "rejected", label: "Rejeitado", color: "bg-red-500" },
                { key: "expired", label: "Expirado", color: "bg-orange-500" },
              ].map((item) => (
                <div key={item.key} className="rounded-lg border border-border p-4 text-center">
                  <div className={`mx-auto mb-2 h-3 w-3 rounded-full ${item.color}`} />
                  <div className="text-xl font-bold text-foreground">
                    {quotesStats[item.key as keyof typeof quotesStats] as number}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Toaster />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  trend,
  subvalue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: "up" | "down" | "neutral";
  subvalue?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md text-white" style={{ background: color }}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="font-display text-2xl font-bold" style={{ color }}>
          {value}
        </div>
        {trend && (
          <span className={trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}>
            {trend === "up" ? <ArrowUpRight className="h-4 w-4" /> : trend === "down" ? <ArrowDownRight className="h-4 w-4" /> : null}
          </span>
        )}
      </div>
      {subvalue && <div className="mt-1 text-xs text-muted-foreground">{subvalue}</div>}
    </Card>
  );
}
