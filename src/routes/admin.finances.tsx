import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CashTab } from "@/components/finance/CashTab";
import { DashboardTab } from "@/components/finance/DashboardTab";
import { ExpensesTab } from "@/components/finance/ExpensesTab";
import { FinancePeriodHeader } from "@/components/finance/FinancePeriodHeader";
import { InstallmentsTab } from "@/components/finance/InstallmentsTab";
import { PeriodChip } from "@/components/finance/finance-shared";
import { PurchasesTab } from "@/components/finance/PurchasesTab";
import { SalesTab } from "@/components/finance/SalesTab";
import { useFinancePageState } from "@/components/finance/use-finance-page-state";

const FINANCE_TABS = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "parcelas", label: "Parcelas" },
  { id: "caixa", label: "Caixa" },
  { id: "compras", label: "Compras" },
  { id: "despesas", label: "Despesas" },
  { id: "vendas", label: "Vendas" },
] as const;

type FinanceTabId = (typeof FINANCE_TABS)[number]["id"];

export const Route = createFileRoute("/admin/finances")({
  validateSearch: (search: Record<string, unknown>) => ({
    aba: typeof search.aba === "string" ? search.aba : "visao-geral",
  }),
  component: Finances,
});

function Finances() {
  const ctx = useFinancePageState();
  const { aba } = Route.useSearch();
  const navigate = useNavigate();

  const activeTab: FinanceTabId = FINANCE_TABS.some((tab) => tab.id === aba)
    ? (aba as FinanceTabId)
    : "visao-geral";

  const setTab = (id: FinanceTabId) =>
    navigate({
      to: "/admin/finances",
      search: (prev: Record<string, unknown>) => ({ ...prev, aba: id }),
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Finanças</h1>
        <p className="text-sm text-muted-foreground">
          Receita, custos e fundo de reserva de depreciação.
        </p>
      </div>

      {/* Período global: todas as abas respondem a este controle */}
      <FinancePeriodHeader ctx={ctx} />

      {/* Barra de abas estilo planilha */}
      <div
        role="tablist"
        aria-label="Seções do financeiro"
        className="flex flex-wrap items-end gap-1 border-b border-border"
      >
        {FINANCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`aba-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`painel-${tab.id}`}
            onClick={() => setTab(tab.id)}
            className={cn(
              "rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "filament-top border-border bg-card text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Painéis permanecem montados (hidden) para preservar filtros e estados */}
      <div
        role="tabpanel"
        id="painel-visao-geral"
        aria-labelledby="aba-visao-geral"
        hidden={activeTab !== "visao-geral"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <DashboardTab ctx={ctx} onNavigate={setTab} />
      </div>
      <div
        role="tabpanel"
        id="painel-parcelas"
        aria-labelledby="aba-parcelas"
        hidden={activeTab !== "parcelas"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <InstallmentsTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-caixa"
        aria-labelledby="aba-caixa"
        hidden={activeTab !== "caixa"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <CashTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-compras"
        aria-labelledby="aba-compras"
        hidden={activeTab !== "compras"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <PurchasesTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-despesas"
        aria-labelledby="aba-despesas"
        hidden={activeTab !== "despesas"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <ExpensesTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-vendas"
        aria-labelledby="aba-vendas"
        hidden={activeTab !== "vendas"}
        className="space-y-8"
      >
        <PeriodChip label={ctx.periodLabel} />
        <SalesTab ctx={ctx} />
      </div>
    </div>
  );
}
