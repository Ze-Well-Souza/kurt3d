import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { authStatus, login, setupAdmin } from "@/lib/api/auth.functions";
import { getPasswordPolicyMessage } from "@/lib/domain/password-policy";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const s = await authStatus();
    if (s.loggedIn && !s.setupRequired) throw redirect({ to: "/admin" });
    return s;
  },
  component: LoginPage,
});

const setupSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(8).max(200).refine((value) => !getPasswordPolicyMessage(value), {
    message: "A senha deve ter 8+ caracteres, letra maiuscula, minuscula e numero.",
  }),
  phone: z.string().min(1).max(20),
  nome: z.string().min(1).max(100),
});

const loginSchema = z.object({
  phone: z.string().min(1).max(20),
  password: z.string().min(1).max(200),
});

function LoginPage() {
  const navigate = useNavigate();
  const ctx = Route.useRouteContext();

  const [phone, setPhone] = useState("11967428594");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("admin");

  const isSetup = ctx.setupRequired;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSetup) {
      const parsed = setupSchema.safeParse({ username, password, phone, nome });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      await setupAdmin({ data: parsed.data });
      toast.success("Admin configurado.");
      navigate({ to: "/admin" });
    } else {
      const parsed = loginSchema.safeParse({ phone, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
        return;
      }
      const res = await login({ data: parsed.data });
      if (!res.ok) {
        toast.error(res.reason === "rate_limited" ? "Muitas tentativas. Aguarde alguns minutos e tente novamente." : "Telefone ou senha inválidos.");
        return;
      }
      toast.success("Bem-vindo.");
      navigate({ to: "/admin" });
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Toaster />
      <Card className="w-full max-w-md border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isSetup ? "Configurar Admin" : "Entrar"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSetup
            ? "Configure o primeiro administrador do sistema."
            : "Acesse o painel de gestão da Kurti 3D."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {isSetup ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-setup">Telefone</Label>
                <Input id="phone-setup" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11967428594" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário (login alternativo)</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ caracteres, maiuscula, minuscula e numero"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11967428594" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}
          <Button type="submit" className="btn-filament w-full">
            {isSetup ? "Criar Admin" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

