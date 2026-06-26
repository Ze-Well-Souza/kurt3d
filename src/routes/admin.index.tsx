import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSnapshot } from "@/lib/hooks/use-snapshot";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Dashboard() {
  const snap = useSnapshot();
  const orders = snap.data?.orders ?? [];
  const vendas = snap.data?.vendas ?? [];
  const expenses = snap.data?.expenses ?? [];
  const [period, setPeriod] = useState<"month" | "all">("month");

  const periodLabel = period === "month" ? "este mês" : "total";

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const filteredVendas = useMemo(() => {
    if (period === "all") return vendas;
    return vendas.filter((v) => v.data >= monthStart);
  }, [vendas, period, monthStart]);

  const filteredExpenses = useMemo(() => {
    if (period === "all") return expenses;
    const monthStartDate = monthStart.slice(0, 10);
    return expenses.filter((e) => e.data >= monthStartDate);
  }, [expenses, period, monthStart]);

  const stats = useMemo(() => {
    const trabalhosAtivos = orders.filter(
      (o) => o.status === "todo" || o.status === "printing",
    ).length;
    const receita = filteredVendas.reduce((sum, v) => sum + v.valor, 0);
    const custoTotal = filteredVendas.reduce((sum, v) => sum + v.custo, 0);
    const despesas = filteredExpenses.reduce((sum, e) => sum + e.valor, 0);
    const lucro = receita - custoTotal - despesas;
    return [
      { label: "Trabalhos ativos", value: String(trabalhosAtivos), delta: `de ${orders.length} pedidos` },
      { label: `Receita (${periodLabel})`, value: brl(receita), delta: `${filteredVendas.length} vendas` },
      { label: `Lucro Líquido (${periodLabel})`, value: brl(lucro), delta: lucro >= 0 ? "positivo" : "negativo" },
      { label: `Despesas (${periodLabel})`, value: brl(despesas), delta: `${filteredExpenses.length} lançamentos` },
    ];
  }, [orders, filteredVendas, filteredExpenses, periodLabel]);

  // Recent terminal orders for activity section
  const recentActivity = useMemo(() => {
    return orders
      .filter((o) => ["vendido", "presente", "falha", "done"].includes(o.status))
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua fábrica de impressão.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", period === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setPeriod("month")}>Este Mês</button>
          <button className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", period === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setPeriod("all")}>Todo Período</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="filament-top rounded-xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-medium filament-text">{s.delta}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Atividade recente</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentActivity.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.projectName}</p>
                  <p className="text-xs text-muted-foreground">{o.client}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{
                    color: o.status === "vendido" ? "var(--filament-green)" :
                           o.status === "presente" ? "var(--filament-yellow)" :
                           o.status === "falha" ? "var(--filament-magenta)" :
                           "var(--filament-cyan)"
                  }}>
                    {o.status === "vendido" ? "Vendido" :
                     o.status === "presente" ? "Presente" :
                     o.status === "falha" ? "Falha" : "Concluído"}
                  </p>
                  {o.valorRecebido !== undefined && (
                    <p className="text-xs text-muted-foreground">R$ {o.valorRecebido.toFixed(2)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
