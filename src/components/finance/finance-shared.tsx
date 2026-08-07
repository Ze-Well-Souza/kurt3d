import type { ReactNode } from "react";
import { CalendarRange, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Internet",
  "Manutenção",
  "Energia",
  "Perda de Material",
  "Transporte",
  "Marketing",
  "Outros",
] as const;

export const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  insumo: { label: "Insumo", color: "var(--filament-yellow)" },
  manual: { label: "Manual", color: "var(--filament-cyan)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

export type FinancePeriodPreset = "all" | "month" | "quarter";
export type PaymentHistorySourceFilter = "all" | "filamento" | "insumo";
export type PaymentHistoryTypeFilter = "all" | "pagamento" | "estorno";

export const getEventSignedAmount = (event: { tipo: "pagamento" | "estorno"; valor: number }) =>
  event.tipo === "estorno" ? -event.valor : event.valor;

export const formatMonthYearLabel = (monthIso: string) => {
  const [year, month] = monthIso.split("-").map(Number);
  if (!year || !month) return monthIso;
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Chip com o periodo ativo, exibido dentro de cada aba para reforcar
 * que todas respondem ao mesmo controle global.
 */
export function PeriodChip({ label }: { label: string }) {
  return (
    <div className="flex justify-end">
      <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs capitalize">
        <CalendarRange className="h-3 w-3" /> Período ativo: {label}
      </Badge>
    </div>
  );
}

/**
 * Icone de informacao com tooltip explicando a metrica, em linguagem simples.
 */
export function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          tabIndex={-1}
          className="cursor-help text-muted-foreground/70 hover:text-muted-foreground"
          aria-label={text}
        >
          <Info className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] whitespace-normal text-center">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  color,
  tooltip,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  tooltip?: string;
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
        <span>{label}</span>
        {tooltip && <InfoTip text={tooltip} />}
      </div>
      <div className="mt-2 font-display text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  );
}
