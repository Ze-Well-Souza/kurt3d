import type { ReactNode } from "react";
import { CalendarRange, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { escapeHtml } from "@/lib/domain/print-html";

/**
 * Gera e baixa um arquivo CSV (separador ";" + BOM para abrir corretamente no
 * Excel pt-BR). O anchor e anexado ao DOM e o revoke e tardio para garantir o
 * download em todos os navegadores.
 */
export function downloadCsvFile(filename: string, headers: string[], rows: string[][]) {
  const csvLines = [
    headers.join(";"),
    ...rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";")),
  ];
  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PRINT_REPORT_CSS = `
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
`;

/**
 * Abre a janela de impressao/salvamento em PDF com o HTML do relatorio.
 * IMPORTANTE: nao usar "noopener" nos window features — com ele o navegador
 * retorna null e o relatorio nunca abre (bug anterior do Exportar PDF).
 */
export function openPrintWindow(documentTitle: string, bodyHtml: string): boolean {
  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) return false;
  popup.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <title>${escapeHtml(documentTitle)}</title>
        <style>${PRINT_REPORT_CSS}</style>
      </head>
      <body>${bodyHtml}</body>
    </html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

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

/** Chips de resumo usados pelos relatorios impressos (PDF). */
export function buildPrintChips(pairs: [string, string][]) {
  return `<div class="grid">${pairs
    .map(
      ([label, value]) =>
        `<div class="chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join("")}</div>`;
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
