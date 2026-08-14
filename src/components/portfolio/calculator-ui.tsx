import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { PortfolioCalculatorResult } from "@/lib/domain/portfolio-pricing";

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center text-muted-foreground/70 hover:text-foreground"
          aria-label="Mais informações"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Field({
  label,
  children,
  className = "",
  tip,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  tip?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Label>{label}</Label>
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step = "0.01",
  tip,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  tip?: string;
}) {
  return (
    <Field label={label} tip={tip}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

export const ACCENT_COLORS: Record<string, string> = {
  cyan: "#5fa8a3",
  green: "#8aab6e",
  yellow: "#e0a93b",
  pink: "#d98ca0",
  magenta: "#8a3a52",
  orange: "#e8914a",
};

export function ResultCard({
  label,
  value,
  accent,
  emphasize = false,
  tip,
}: {
  label: string;
  value: string;
  accent: keyof typeof ACCENT_COLORS;
  emphasize?: boolean;
  tip?: string;
}) {
  const color = ACCENT_COLORS[accent];
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
      style={{ boxShadow: `0 8px 24px -16px ${color}` }}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div
        className={`mt-2 font-display font-bold tabular-nums ${emphasize ? "text-3xl" : "text-2xl"}`}
        style={emphasize ? undefined : { color }}
      >
        {emphasize ? <span className="filament-text">{value}</span> : value}
      </div>
    </div>
  );
}

export function CalculatorDonutChart({
  results,
  numeric,
}: {
  results: PortfolioCalculatorResult;
  numeric: { quantidade: number };
}) {
  const total = results.custoLote || 1;
  const segments = [
    {
      label: "Filamentos",
      value: results.custoFilamentosDetalhado ?? 0,
      color: ACCENT_COLORS.cyan,
    },
    {
      label: "Energia",
      value: results.custoEnergia * numeric.quantidade || 0,
      color: ACCENT_COLORS.yellow,
    },
    {
      label: "Depreciacao",
      value: results.custoDepreciacao * numeric.quantidade || 0,
      color: ACCENT_COLORS.orange,
    },
    { label: "Extras", value: results.custoExtraTotal ?? 0, color: ACCENT_COLORS.pink },
    { label: "Mao de Obra", value: results.custoTrabalho ?? 0, color: ACCENT_COLORS.magenta },
    { label: "Desperdicio", value: results.custoPerda * numeric.quantidade || 0, color: "#c084fc" },
  ].filter((s) => s.value > 0);

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {segments.length === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
        ) : (
          segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLength = Math.max(pct * circumference, 0.5);
            const dashOffset = -offset;
            offset += dashLength;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-500"
              />
            );
          })
        )}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          className="fill-foreground text-[15px] font-bold"
          fontFamily="inherit"
        >
          Custos
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
          fontFamily="inherit"
        >
          do Lote
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium">{((seg.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
