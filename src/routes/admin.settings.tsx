import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil do estúdio e preferências.</p>
      </div>
      <div className="filament-top rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Interface de configurações em breve.
      </div>
    </div>
  );
}
