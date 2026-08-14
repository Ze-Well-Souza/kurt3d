import { cn } from "@/lib/utils";

export function DetailItem({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm font-medium",
          mono && "font-mono",
          accent === true && "filament-text",
          accent === false && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
