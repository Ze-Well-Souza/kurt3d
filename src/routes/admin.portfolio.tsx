import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/portfolio")({
  component: Portfolio,
});

function Portfolio() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio Manager</h1>
        <p className="text-sm text-muted-foreground">Curate the public gallery.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Upload and reorder portfolio pieces here.
      </div>
    </div>
  );
}
