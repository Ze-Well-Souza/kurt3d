import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Studio profile and preferences.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Settings UI coming soon.
      </div>
    </div>
  );
}
