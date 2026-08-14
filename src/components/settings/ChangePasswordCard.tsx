import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/auth.functions";
import { getPasswordPolicyMessage } from "@/lib/domain/password-policy";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";

export function ChangePasswordCard() {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const handleChangePasswordError = useToastErrorHandler({
    fallbackMessage: "Erro ao alterar senha.",
    mapMessage: (error) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "current_password_invalid") return "Senha atual incorreta.";
      if (message === "current_password_required") return "Informe a senha atual.";
      return null;
    },
  });

  const mutate = useMutation({
    mutationFn: () =>
      changePassword({ data: { newPassword: newPass, currentPassword: currentPass } }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setCurrentPass("");
      setNewPass("");
      setConfirm("");
    },
    onError: handleChangePasswordError,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // A conta ja pode ter senha pessoal definida — nesse caso a senha atual e
    // obrigatoria (o servidor tambem valida isso, este e so o aviso rapido).
    // Sem essa checagem, um cookie de sessao roubado bastaria para tomar a
    // conta trocando a senha sem saber a original.
    if (!currentPass.trim()) {
      toast.error("Informe a senha atual.");
      return;
    }
    const passwordMessage = getPasswordPolicyMessage(newPass);
    if (passwordMessage) {
      toast.error(passwordMessage);
      return;
    }
    if (newPass !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    mutate.mutate();
  }

  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold tracking-tight">Alterar Senha</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Altere a senha de acesso ao painel.</p>
      </div>
      <form onSubmit={submit} className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium">Senha atual</Label>
          <Input
            type="password"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="sua senha atual"
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Nova senha</Label>
          <Input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="8+ caracteres, maiuscula, minuscula e numero"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Confirmar nova senha</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="repita a senha"
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            size="sm"
            className="btn-filament gap-2"
            disabled={mutate.isPending}
          >
            <Lock className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Alterar Senha"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
