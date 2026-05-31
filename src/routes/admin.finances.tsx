import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

function Finances() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Finances</h1>
        <p className="text-sm text-muted-foreground">Revenue, invoices, and material costs.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Financial reports will appear here.
      </div>
    </div>
  );
}
