import { readFileSync, writeFileSync } from 'fs';

const path = 'src/routes/admin.finances.tsx';
let content = readFileSync(path, 'utf8');

const oldHeroCard = `      {/* \u2550\u2550\u2550 Hero: TOTAL A PAGAR ESTE M\u00caS \u2550\u2550\u2550 */}
      <Card className="overflow-hidden border-2 border-amber-500/40 bg-gradient-to-br from-amber-50/50 to-card">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold uppercase tracking-wider text-amber-700">
                Total a pagar em {formatMonthYearLabel(installmentKpiMonthAnchor)}
              </span>
            </div>
            <div className="mt-2 font-display text-4xl font-bold tabular-nums text-amber-600">
              {brl(totalApagarNoMes.total)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Filamentos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.filamentos)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Insumos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.insumos)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressora</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.impressora)}</div>
            </div>
          </div>
        </div>
      </Card>`;

const newHeroCard = `      {/* \u2550\u2550\u2550 Hero: TOTAL A PAGAR ESTE M\u00caS \u2550\u2550\u2550 */}
      <Card
        className={cn(
          "overflow-hidden border-2 bg-gradient-to-br",
          heroCardState.color === "amber"
            ? "border-amber-500/40 from-amber-50/50 to-card"
            : heroCardState.color === "green"
              ? "border-emerald-500/40 from-emerald-50/50 to-card"
              : "border-border from-muted/30 to-card",
        )}
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {heroCardState.kind === "paid" ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : (
                <CalendarClock
                  className={cn(
                    "h-5 w-5",
                    heroCardState.color === "amber" ? "text-amber-600" : "text-muted-foreground",
                  )}
                />
              )}
              <span
                className={cn(
                  "text-sm font-semibold uppercase tracking-wider",
                  heroCardState.color === "amber"
                    ? "text-amber-700"
                    : heroCardState.color === "green"
                      ? "text-emerald-700"
                      : "text-muted-foreground",
                )}
              >
                {heroCardState.kind === "paid"
                  ? \`Total pago em \${formatMonthYearLabel(installmentKpiMonthAnchor)}\`
                  : heroCardState.kind === "pending"
                    ? \`Total a pagar em \${formatMonthYearLabel(installmentKpiMonthAnchor)}\`
                    : \`Vencimentos em \${formatMonthYearLabel(installmentKpiMonthAnchor)}\`}
              </span>
              {heroCardState.kind === "paid" && (
                <Badge variant="outline" className="ml-1 border-emerald-500/40 bg-emerald-50 text-emerald-700 text-[10px]">
                  Pago
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "mt-2 font-display text-4xl font-bold tabular-nums",
                heroCardState.color === "amber"
                  ? "text-amber-600"
                  : heroCardState.color === "green"
                    ? "text-emerald-600"
                    : "text-muted-foreground",
              )}
            >
              {heroCardState.kind === "empty" && heroCardState.displayValue === 0
                ? "\u2014"
                : brl(heroCardState.displayValue)}
            </div>
            {heroCardState.kind === "empty" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhum vencimento cadastrado para este m\u00eas.
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Filamentos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.filamentos)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Insumos</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.insumos)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impressora</div>
              <div className="mt-1 font-display text-lg font-bold tabular-nums">{brl(totalApagarNoMes.impressora)}</div>
            </div>
          </div>
        </div>
      </Card>`;

if (!content.includes(oldHeroCard)) {
  console.error('ERROR: old hero card not found in file');
  // Try to find similar content for debugging
  const idx = content.indexOf('Hero: TOTAL A PAGAR');
  if (idx >= 0) {
    console.log('Found at index', idx);
    console.log('Context:', JSON.stringify(content.slice(idx, idx + 100)));
  }
  process.exit(1);
}

content = content.replace(oldHeroCard, newHeroCard);
writeFileSync(path, content, 'utf8');
console.log('Hero card replaced successfully');
