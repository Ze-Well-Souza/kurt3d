import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Calculator, ListChecks } from "lucide-react";
import { brl, cn } from "@/lib/utils";
import { useCalcPedidosState } from "@/components/portfolio/use-calc-pedidos-state";
import { CreateOrderFromProjectDialog } from "@/components/portfolio/CreateOrderFromProjectDialog";
import { NewOrderDialog } from "@/components/portfolio/NewOrderDialog";
import { OrderDetailDialog } from "@/components/portfolio/OrderDetailDialog";
import { DeleteOrderDialog } from "@/components/portfolio/DeleteOrderDialog";
import { EditOrderDialog } from "@/components/portfolio/EditOrderDialog";
import { EditProjectDialog } from "@/components/portfolio/EditProjectDialog";
import { CalculatorTab } from "@/components/portfolio/CalculatorTab";
import { OrdersTab } from "@/components/portfolio/OrdersTab";

export const Route = createFileRoute("/admin/portfolio")({
  validateSearch: (search: Record<string, unknown>) => ({
    aba: search.aba === "orders" ? "orders" : "calc",
  }),
  head: () => ({ meta: [{ title: "Calculadora e Pedidos — Kurti 3D" }] }),
  component: CalcPedidos,
});

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
function CalcPedidos() {
  const ctx = useCalcPedidosState();
  const { orders, projects, totals } = ctx;
  const { aba } = Route.useSearch();
  const navigate = useNavigate();
  const activeTab: "calc" | "orders" = aba === "orders" ? "orders" : "calc";
  const setTab = (tab: "calc" | "orders") =>
    navigate({
      to: "/admin/portfolio",
      search: (prev: Record<string, unknown>) => ({ ...prev, aba: tab }),
    });

  /* ═══════════ JSX ═══════════ */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Calculadora e Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Calcule custos, salve projetos e gerencie sua fila de produção.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Lucro acumulado
            </div>
            <div className="font-display text-xl font-bold filament-text">{brl(totals.lucro)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Projetos</div>
            <div className="font-display text-xl font-bold">{projects.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Pedidos ativos
            </div>
            <div className="font-display text-xl font-bold">
              {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "calc"
              ? "bg-background text-foreground shadow-sm filament-text"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("calc")}
        >
          <Calculator className="h-4 w-4" /> Calculadora
        </button>
        <button
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "orders"
              ? "bg-background text-foreground shadow-sm filament-text"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setTab("orders")}
        >
          <ListChecks className="h-4 w-4" /> Pedidos
          {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold">
              {orders.filter((o) => ["todo", "printing", "done"].includes(o.status)).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "calc" ? <CalculatorTab ctx={ctx} /> : <OrdersTab ctx={ctx} />}

      {/* ── Create Order from Portfolio dialog ── */}
      <CreateOrderFromProjectDialog ctx={ctx} onCreated={() => setTab("orders")} />

      {/* ── New Order dialog ── */}
      <NewOrderDialog ctx={ctx} />

      {/* ── Order Detail dialog ── */}
      <OrderDetailDialog ctx={ctx} />

      {/* ── Delete Order dialog ── */}
      <DeleteOrderDialog ctx={ctx} />

      {/* ── Edit Order dialog ── */}
      <EditOrderDialog ctx={ctx} />

      {/* ── Edit Project dialog ── */}
      <EditProjectDialog ctx={ctx} />
    </div>
  );
}
