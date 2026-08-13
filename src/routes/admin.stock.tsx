import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl, cn } from "@/lib/utils";
import { FilamentArchiveDialog } from "@/components/stock/FilamentArchiveDialog";
import { FilamentCreateDialog } from "@/components/stock/FilamentCreateDialog";
import { FilamentDetailDialog } from "@/components/stock/FilamentDetailDialog";
import { FilamentEditDialog } from "@/components/stock/FilamentEditDialog";
import { FilamentRestoreDialog } from "@/components/stock/FilamentRestoreDialog";
import { FilamentsTab } from "@/components/stock/FilamentsTab";
import { HistoryTab } from "@/components/stock/HistoryTab";
import { InsumoFormDialog } from "@/components/stock/InsumoFormDialog";
import { InsumosTab } from "@/components/stock/InsumosTab";
import { useStockPageState } from "@/components/stock/use-stock-page-state";

const STOCK_TABS = [
  { id: "filamentos", label: "Filamentos" },
  { id: "historico", label: "Histórico" },
  { id: "insumos", label: "Insumos" },
] as const;

type StockTabId = (typeof STOCK_TABS)[number]["id"];

export const Route = createFileRoute("/admin/stock")({
  validateSearch: (search: Record<string, unknown>) => ({
    aba: typeof search.aba === "string" ? search.aba : "filamentos",
  }),
  component: Stock,
});

function Stock() {
  const ctx = useStockPageState();
  const { aba } = Route.useSearch();
  const navigate = useNavigate();

  const activeTab: StockTabId = STOCK_TABS.some((tab) => tab.id === aba)
    ? (aba as StockTabId)
    : "filamentos";

  const setTab = (id: StockTabId) =>
    navigate({
      to: "/admin/stock",
      search: (prev: Record<string, unknown>) => ({ ...prev, aba: id }),
    });

  return (
    <div className="space-y-6">
      {/* Header global: título + KPIs + ação principal */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight">Estoque & Insumos</h1>
          <p className="text-sm text-muted-foreground">
            Gestão completa de filamentos, ferramentas e materiais de apoio.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm sm:gap-6 xl:justify-end">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Rolos ativos
            </div>
            <div className="font-display text-xl font-bold">{ctx.filamentos.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Estoque geral
            </div>
            <div className="font-display text-xl font-bold filament-text">
              {ctx.percentualGeral.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total investido
            </div>
            <div className="font-display text-xl font-bold">{brl(ctx.totalInvestido)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Consumido</div>
            <div className="font-display text-xl font-bold text-muted-foreground">
              {brl(ctx.totalConsumido)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Em Estoque</div>
            <div className="font-display text-xl font-bold filament-text">
              {brl(ctx.totalEmEstoque)}
            </div>
          </div>
        </div>
        <div className="flex w-full xl:w-auto xl:justify-end">
          <Button
            type="button"
            size="lg"
            className="btn-filament w-full gap-2 px-4 sm:w-auto sm:px-6"
            onClick={() => ctx.setCreateFilamentOpen(true)}
          >
            <Plus className="h-4 w-4" /> Cadastrar Filamento
          </Button>
        </div>
      </div>

      {/* Barra de abas estilo planilha */}
      <div
        role="tablist"
        aria-label="Seções do estoque"
        className="flex flex-wrap items-end gap-1 border-b border-border"
      >
        {STOCK_TABS.map((tab) => (
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
        id="painel-filamentos"
        aria-labelledby="aba-filamentos"
        hidden={activeTab !== "filamentos"}
        className="space-y-8"
      >
        <FilamentsTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-historico"
        aria-labelledby="aba-historico"
        hidden={activeTab !== "historico"}
        className="space-y-8"
      >
        <HistoryTab ctx={ctx} />
      </div>
      <div
        role="tabpanel"
        id="painel-insumos"
        aria-labelledby="aba-insumos"
        hidden={activeTab !== "insumos"}
        className="space-y-8"
      >
        <InsumosTab ctx={ctx} />
      </div>

      {/* Diálogos (portais — controlados pelo estado global) */}
      <FilamentArchiveDialog ctx={ctx} />
      <FilamentCreateDialog ctx={ctx} />
      <FilamentDetailDialog ctx={ctx} />
      <FilamentEditDialog ctx={ctx} mode={ctx.editMode} />
      <FilamentRestoreDialog ctx={ctx} />
      <InsumoFormDialog ctx={ctx} />
    </div>
  );
}
