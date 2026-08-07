import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  Coins,
  DollarSign,
  Download,
  FileText,
  Package,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { getInstallmentRemainingAmount } from "@/lib/domain/finance-schedule";
import { brl, cn } from "@/lib/utils";
import { formatMonthYearLabel, KpiCard } from "./finance-shared";
import type { FinanceCtx } from "./use-finance-page-state";

type FinanceTabId = "visao-geral" | "parcelas" | "caixa" | "compras" | "despesas" | "vendas";

export function DashboardTab({
  ctx,
  onNavigate,
}: {
  ctx: FinanceCtx;
  onNavigate: (tab: FinanceTabId) => void;
}) {
  const {
    heroCardState,
    totalApagarNoMes,
    installmentKpiMonthAnchor,
    installmentKpis,
    pagoNoMesDeOutrosMeses,
    pendingScheduleEntries,
    exportCsv,
    exportPdf,
    totals,
    monthlySalesSeries,
    despesasFalha,
  } = ctx;

  const monthLabel = formatMonthYearLabel(installmentKpiMonthAnchor);
  const monthSales = monthlySalesSeries.find((m) => m.key === installmentKpiMonthAnchor);
  const salesKind: "profit" | "loss" | "empty" =
    !monthSales || (monthSales.receita === 0 && monthSales.liquido === 0)
      ? "empty"
      : monthSales.liquido >= 0
        ? "profit"
        : "loss";
  const overdueEntries = pendingScheduleEntries.filter((entry) => entry.overdue);
  const upcomingEntries = pendingScheduleEntries.filter((entry) => !entry.overdue).slice(0, 5);

  return (
    <>
      {/* ═══ Conta do mês (vencimentos) + Caixa do mês + Venda do mês ═══ */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Conta do mês: o que venceu/vence neste mês, independente de quando foi pago */}
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
          <div className="p-6">
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
                  ? `Conta de ${monthLabel} quitada`
                  : heroCardState.kind === "pending"
                    ? `Conta de ${monthLabel} (vencimentos do mês)`
                    : `Sem vencimentos em ${monthLabel}`}
              </span>
              {heroCardState.kind === "paid" && (
                <Badge className="gap-1 bg-green-600 text-[10px]">
                  <Check className="h-3 w-3" /> Quitada
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
            <p className="mt-1 text-xs text-muted-foreground">
              Soma das parcelas com vencimento neste mês (filamentos, insumos e impressora).
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Filamentos
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(
                    heroCardState.kind === "paid"
                      ? totalApagarNoMes.filamentosDue
                      : totalApagarNoMes.filamentos,
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Insumos
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(
                    heroCardState.kind === "paid"
                      ? totalApagarNoMes.insumosDue
                      : totalApagarNoMes.insumos,
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Impressora
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(
                    heroCardState.kind === "paid"
                      ? totalApagarNoMes.impressoraDue
                      : totalApagarNoMes.impressora,
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-1 px-0 text-xs"
              onClick={() => onNavigate("parcelas")}
            >
              Ver detalhes na aba Parcelas <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Caixa do mês: o que efetivamente saiu da conta neste mês */}
        <Card className="overflow-hidden border-2 border-sky-500/40 bg-gradient-to-br from-sky-50/50 to-card">
          <div className="p-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-sky-600" />
              <span className="text-sm font-semibold uppercase tracking-wider text-sky-700">
                Caixa pago em {monthLabel} (o que saiu da conta)
              </span>
            </div>
            <div className="mt-2 font-display text-4xl font-bold tabular-nums text-sky-600">
              {brl(installmentKpis.pagoNoMes)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tudo o que foi pago neste mês, incluindo quitações e pagamentos parciais.
            </p>
            {pagoNoMesDeOutrosMeses > 0 && (
              <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Inclui {brl(pagoNoMesDeOutrosMeses)} de parcelas com vencimento em outros meses
                (pagas atrasadas ou adiantadas).
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-1 px-0 text-xs"
              onClick={() => onNavigate("caixa")}
            >
              Ver lançamentos na aba Caixa <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>

        {/* Venda do mês: resultado das vendas finalizadas no mês de referência */}
        <Card
          className={cn(
            "overflow-hidden border-2 bg-gradient-to-br",
            salesKind === "profit"
              ? "border-green-500/40 from-green-50/50 to-card"
              : salesKind === "loss"
                ? "border-red-500/40 from-red-50/50 to-card"
                : "border-muted/40 from-muted/30 to-card",
          )}
        >
          <div className="p-6">
            <div className="flex items-center gap-2">
              {salesKind === "profit" ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : salesKind === "loss" ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <Coins className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider",
                  salesKind === "profit"
                    ? "text-green-700"
                    : salesKind === "loss"
                      ? "text-red-700"
                      : "text-muted-foreground",
                )}
              >
                Venda de {monthLabel}
              </span>
              {salesKind !== "empty" && (
                <Badge
                  className={cn(
                    "gap-1 text-[10px]",
                    salesKind === "profit" ? "bg-green-600" : "bg-red-600",
                  )}
                >
                  {salesKind === "profit" ? "Lucro" : "Prejuízo"}
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "mt-2 font-display text-4xl font-bold tabular-nums",
                salesKind === "profit"
                  ? "text-green-600"
                  : salesKind === "loss"
                    ? "text-red-600"
                    : "text-muted-foreground",
              )}
            >
              {brl(monthSales?.liquido ?? 0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {salesKind === "empty"
                ? `Nenhuma venda finalizada em ${monthLabel}.`
                : "Bruto do mês menos custos de produção e despesas operacionais."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Bruto
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(monthSales?.receita ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Custos
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(monthSales?.custo ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Despesas
                </div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(monthSales?.despesas ?? 0)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-1 px-0 text-xs"
              onClick={() => onNavigate("vendas")}
            >
              Ver detalhes na aba Vendas <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="filament-top flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-card p-4">
        <Button variant="outline" className="gap-2" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={exportPdf}>
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Total"
          value={brl(totals.receita)}
          color="var(--filament-cyan)"
          tooltip="Soma do valor das vendas do período selecionado no topo da tela."
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro Líquido"
          value={brl(totals.lucro)}
          color={totals.lucro >= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
          tooltip="Receita menos custo de produção menos despesas operacionais do período."
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Custo de Produção"
          value={brl(totals.custo)}
          color="var(--filament-yellow)"
          tooltip="Soma dos custos registrados nas vendas do período (material e tempo de impressão)."
        />
        <KpiCard
          icon={<Wrench className="h-4 w-4" />}
          label="Despesas Operacionais"
          value={brl(totals.despesasOperacionais)}
          color="var(--filament-magenta)"
          tooltip="Gastos do dia a dia no período (aluguel, energia, etc.), sem contar insumos que têm parcelamento próprio."
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Investimentos"
          value={brl(totals.investimentos)}
          color="var(--filament-yellow)"
          tooltip="Compras classificadas como investimento/imobilizado no período (ex.: impressora)."
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Perdas por Falha"
          value={brl(despesasFalha)}
          color="var(--filament-magenta)"
          tooltip="Valor do material perdido em impressões com falha no período."
        />
      </div>

      {/* ═══ Atrasadas + Próximos vencimentos ═══ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-semibold">Parcelas atrasadas</h3>
              {installmentKpis.atrasadas > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {installmentKpis.atrasadas} · {brl(installmentKpis.atrasadasValor)}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => onNavigate("parcelas")}
            >
              Ver na aba Parcelas <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {overdueEntries.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Nenhuma parcela atrasada. Tudo em dia.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overdueEntries.slice(0, 5).map((entry) => (
                <li
                  key={entry.inst.id}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{entry.label}</div>
                    <div className="text-xs text-red-500">
                      Venceu em {formatIsoDatePtBr(entry.inst.vencimento)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-red-500">
                    {brl(getInstallmentRemainingAmount(entry.inst))}
                  </div>
                </li>
              ))}
              {overdueEntries.length > 5 && (
                <li className="px-6 py-2 text-xs text-muted-foreground">
                  + {overdueEntries.length - 5} outra(s) atrasada(s)
                </li>
              )}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Próximos vencimentos</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => onNavigate("parcelas")}
            >
              Ver cronograma completo <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {upcomingEntries.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Nenhum vencimento futuro pendente.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingEntries.map((entry) => (
                <li
                  key={entry.inst.id}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{entry.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Vence em {formatIsoDatePtBr(entry.inst.vencimento)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">
                    {brl(getInstallmentRemainingAmount(entry.inst))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ═══ Atalhos para as demais abas ═══ */}
      <div className="filament-top rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Explorar por frente</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "parcelas", label: "Parcelas e cronograma" },
              { id: "caixa", label: "Caixa (pagamentos)" },
              { id: "compras", label: "Compras de filamento" },
              { id: "despesas", label: "Despesas e saídas" },
              { id: "vendas", label: "Vendas" },
            ] as { id: FinanceTabId; label: string }[]
          ).map((tab) => (
            <Button
              key={tab.id}
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onNavigate(tab.id)}
            >
              {tab.label} <ArrowRight className="h-3 w-3" />
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
