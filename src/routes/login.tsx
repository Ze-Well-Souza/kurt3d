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
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

function LoginPage() {
  const navigate = useNavigate();
  const ctx = Route.useRouteContext();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (ctx.setupRequired) setUsername("admin");
  }, [ctx.setupRequired]);

  const isSetup = ctx.setupRequired;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = (isSetup ? setupSchema : loginSchema).safeParse({ username, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (isSetup) {
      await setupAdmin(parsed.data);
      toast.success("Admin configurado.");
      navigate({ to: "/admin" });
      return;
    }
    const res = await login(parsed.data);
    if (!res.ok) {
      toast.error("Usuário ou senha inválidos.");
      return;
    }
    toast.success("Bem-vindo.");
    navigate({ to: "/admin" });
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
            ? "Defina o usuário e uma senha forte para acessar o painel."
            : "Acesse o painel de gestão da Kurti 3D."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSetup ? "mínimo 8 caracteres" : ""}
            />
          </div>
          <Button type="submit" className="btn-filament w-full">
            {isSetup ? "Criar Admin" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

