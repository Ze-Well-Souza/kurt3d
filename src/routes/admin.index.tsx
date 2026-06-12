import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSnapshot } from "@/lib/api/data.functions";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Dashboard() {
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const orders = snap.data?.orders ?? [];
  const vendas = snap.data?.vendas ?? [];

  const stats = useMemo(() => {
    // Trabalhos ativos: orders with status todo or printing
    const trabalhosAtivos = orders.filter(
      (o) => o.status === "todo" || o.status === "printing",
    ).length;

    // Receita (Mês): sum of valor from vendas
    const receita = vendas.reduce((sum, v) => sum + v.valor, 0);

    // Lucro Líquido: receita - custo total
    const custoTotal = vendas.reduce((sum, v) => sum + v.custo, 0);
    const lucro = receita - custoTotal;

    // Impressoras online (placeholder)
    const impressorasOnline = "6/6";

    return [
      { label: "Trabalhos ativos", value: String(trabalhosAtivos), delta: `de ${orders.length} pedidos` },
      { label: "Receita (Mês)", value: brl(receita), delta: `${vendas.length} vendas` },
      { label: "Lucro Líquido", value: brl(lucro), delta: lucro >= 0 ? "positivo" : "negativo" },
      { label: "Impressoras online", value: impressorasOnline, delta: "100%" },
    ];
  }, [orders, vendas]);

  // Recent terminal orders for activity section
  const recentActivity = useMemo(() => {
    return orders
      .filter((o) => ["vendido", "presente", "falha", "done"].includes(o.status))
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua fábrica de impressão.</p>
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
                  <p className="truncate font-medium">{o.project}</p>
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
