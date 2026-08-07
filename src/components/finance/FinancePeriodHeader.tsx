import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthYearLabel, type FinancePeriodPreset } from "./finance-shared";
import type { FinanceCtx } from "./use-finance-page-state";

/**
 * Periodo global da tela: unico controle de mes/preset, compartilhado por
 * todas as abas ("abas conversando"). Substitui os dois controles separados
 * que existiam (filtro global + mes de referencia das parcelas).
 */
export function FinancePeriodHeader({ ctx }: { ctx: FinanceCtx }) {
  const {
    periodPreset,
    setPeriodPreset,
    installmentKpiMonthAnchor,
    setInstallmentKpiMonthAnchor,
    previousInstallmentKpiMonth,
    nextInstallmentKpiMonth,
  } = ctx;

  return (
    <div className="filament-top flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-4">
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
        <div className="grid gap-2">
          <Label>Mês de referência</Label>
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
      </div>
    </div>
  );
}
