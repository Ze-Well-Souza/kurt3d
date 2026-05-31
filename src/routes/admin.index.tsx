import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    { label: "Active jobs", value: "12", delta: "+3" },
    { label: "Revenue (mo)", value: "$8,420", delta: "+12%" },
    { label: "Printers online", value: "6/6", delta: "100%" },
    { label: "Queue time", value: "4.2h", delta: "−18%" },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your print farm.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-medium text-primary">{s.delta}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <p className="mt-2 text-sm text-muted-foreground">Wire this up to your data later.</p>
      </div>
    </div>
  );
}
