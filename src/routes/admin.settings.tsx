import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { SiteContentCard } from "@/components/settings/SiteContentCard";
import { StorageCleanupCard } from "@/components/settings/StorageCleanupCard";
import { StudioSettingsForm } from "@/components/settings/StudioSettingsForm";
import { UserManagementCard } from "@/components/settings/UserManagementCard";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Configurações — Kurti 3D" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <StudioSettingsForm />

      {/* ── Section: Senha ── */}
      <ChangePasswordCard />

      {/* ── Section: Usuários Admin ── */}
      <UserManagementCard />

      {/* ── Section: Conteúdo do Site ── */}
      <SiteContentCard />

      {/* ── Section: Storage Cleanup ── */}
      <StorageCleanupCard />
    </div>
  );
}
