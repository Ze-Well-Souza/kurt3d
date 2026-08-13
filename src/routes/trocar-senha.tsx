import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword, logout, requireAuth } from "@/lib/api/auth.functions";
import { getPasswordPolicyMessage } from "@/lib/domain/password-policy";

export const Route = createFileRoute("/trocar-senha")({
  beforeLoad: async () => {
    const auth = await requireAuth();
    if (auth.setupRequired || !auth.userId) throw redirect({ to: "/login" });
    // Só faz sentido estar aqui com senha provisória: quem já tem senha pessoal
    // vai direto para o painel (impede uso da rota fora do fluxo obrigatório).
    if (!auth.mustChangePassword) throw redirect({ to: "/admin" });
    return auth;
  },
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const passwordMessage = getPasswordPolicyMessage(newPass);
    if (passwordMessage) {
      toast.error(passwordMessage);
      return;
    }
    if (newPass !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ data: { newPassword: newPass } });
      toast.success("Senha alterada. Bem-vindo!");
      navigate({ to: "/admin" });
    } catch {
      toast.error("Erro ao alterar a senha. Tente novamente.");
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="filament-top w-full max-w-md border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Defina sua senha</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua senha atual é provisória. Para acessar o painel, defina uma senha pessoal.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="8+ caracteres, maiuscula, minuscula e numero"
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="repita a senha"
            />
          </div>
          <Button type="submit" className="btn-filament w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar e entrar"}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Sair
        </button>
      </Card>
    </div>
  );
}
