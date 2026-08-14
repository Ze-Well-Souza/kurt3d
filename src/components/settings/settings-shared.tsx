import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  buildWhatsAppUrl,
  buildCredentialsMessage,
  type CredentialsPayload,
} from "@/lib/domain/auth-credentials";

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function SettingsField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Gera uma senha provisoria forte que atende a politica (maiuscula, minuscula, numero).
export function generateProvisionalPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const pick = (set: string, n: number) => set[n % set.length];
  const chars = [pick(upper, bytes[0]), pick(lower, bytes[1]), pick(digits, bytes[2])];
  for (let i = 3; i < 10; i++) chars.push(pick(all, bytes[i]));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Dialog generico para compartilhar credenciais (usado apos criacao, reset manual
// ou acao de "Enviar Credenciais" na listagem).
export function CredentialsShareDialog({
  creds,
  onClose,
  title = "Credenciais de Acesso",
  warnSingleView = false,
}: {
  creds: CredentialsPayload;
  onClose: () => void;
  title?: string;
  warnSingleView?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
  const message = buildCredentialsMessage(creds, loginUrl);
  const login = creds.phone || creds.username;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nao foi possivel copiar. Copie manualmente os dados acima.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {warnSingleView && (
          <DialogDescription className="hidden">Credenciais para envio.</DialogDescription>
        )}
      </DialogHeader>
      <div className="space-y-4">
        {warnSingleView && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            Esta e a unica vez que a senha provisoria aparece. Copie ou envie agora — depois nao e
            possivel ve-la novamente.
          </div>
        )}
        {!warnSingleView && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-400">
            No primeiro acesso o usuario devera trocar esta senha provisoria por uma senha pessoal.
          </div>
        )}
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Nome</span>
            <span className="font-medium">{creds.nome}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Login</span>
            <span className="font-medium">{login}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Senha provisoria</span>
            <span className="font-mono font-semibold">{creds.password}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyMessage}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{" "}
            {copied ? "Copiado" : "Copiar mensagem"}
          </Button>
          {creds.phone ? (
            <a
              href={buildWhatsAppUrl(creds.phone, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                type="button"
                className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5b]"
              >
                <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
              </Button>
            </a>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Concluir
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
