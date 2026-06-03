import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    { label: "Trabalhos ativos", value: "12", delta: "+3" },
    { label: "Receita (mês)", value: "R$ 8.420", delta: "+12%" },
    { label: "Impressoras online", value: "6/6", delta: "100%" },
    { label: "Tempo de fila", value: "4,2h", delta: "−18%" },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua fábrica de impressão.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="filament-top rounded-xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-medium filament-text">{s.delta}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Atividade recente</h2>
        <p className="mt-2 text-sm text-muted-foreground">Conecte aos seus dados em breve.</p>
      </div>
    </div>
  );
}
