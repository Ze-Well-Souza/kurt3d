import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw, Printer, Zap, DollarSign, Settings2, Info, MessageCircle, Lock, Users, Plus, Trash2, Globe, HardDrive, Eye, EyeOff, Copy, Check, RefreshCw, Pencil, UserCheck, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { saveSettings, runStorageCleanup } from "@/lib/api/data.functions";
import { changePassword, listUsers, createUser, deleteUser, resetPassword, deactivateUser, activateUser, editUser, getSiteContent, saveSiteContent, requireAuth } from "@/lib/api/auth.functions";
import { getPasswordPolicyMessage } from "@/lib/domain/password-policy";
import type { AppSettings, SiteContent } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS, DEFAULT_SITE_CONTENT } from "@/lib/domain/types";
import { useSettings } from "@/lib/hooks/use-settings";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Configurações — Kurti 3D" }] }),
  component: SettingsPage,
});

type SettingsForm = {
  studioNome: string;
  impressoraModelo: string;
  consumoKw: string;
  tarifaEnergiaKwh: string;
  depreciacaoHora: string;
  custoFixoUnidade: string;
  defaultPesoRolo: string;
  defaultQuantidade: string;
  whatsappNumero: string;
};

function toForm(s: AppSettings): SettingsForm {
  return {
    studioNome: s.studioNome,
    impressoraModelo: s.impressoraModelo,
    consumoKw: String(s.consumoKw),
    tarifaEnergiaKwh: String(s.tarifaEnergiaKwh),
    depreciacaoHora: String(s.depreciacaoHora),
    custoFixoUnidade: String(s.custoFixoUnidade),
    defaultPesoRolo: String(s.defaultPesoRolo),
    defaultQuantidade: String(s.defaultQuantidade),
    whatsappNumero: s.whatsappNumero,
  };
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data: currentSettingsData } = useSettings();
  const currentSettings = currentSettingsData ?? DEFAULT_APP_SETTINGS;
  const [form, setForm] = useState<SettingsForm>(toForm(currentSettings));
  const [hasChanges, setHasChanges] = useState(false);
  const handleSaveError = useToastErrorHandler({ fallbackMessage: "Erro ao salvar." });
  const handleChangePasswordError = useToastErrorHandler({ fallbackMessage: "Erro ao alterar senha." });
  const handleCreateUserError = useToastErrorHandler({
    fallbackMessage: "Erro ao criar.",
    mapMessage: (error) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "phone_exists") return "Telefone já cadastrado.";
      if (message === "username_exists") return "Usuário já existe.";
      return null;
    },
  });
  const handleDeleteUserError = useToastErrorHandler({
    fallbackMessage: "Erro.",
    mapMessage: (error) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "cannot_delete_self") return "Não é possível remover a si mesmo.";
      if (message === "cannot_delete_last_user") return "Não é possível remover o último usuário.";
      return null;
    },
  });

  const mutate = useMutation({
    mutationFn: (input: AppSettings) => saveSettings({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setHasChanges(false);
      toast.success("Configurações salvas com sucesso.");
    },
    onError: handleSaveError,
  });

  function setField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setHasChanges(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed: AppSettings = {
      studioNome: form.studioNome.trim() || DEFAULT_APP_SETTINGS.studioNome,
      impressoraModelo: form.impressoraModelo.trim() || DEFAULT_APP_SETTINGS.impressoraModelo,
      consumoKw: Number(form.consumoKw) || DEFAULT_APP_SETTINGS.consumoKw,
      tarifaEnergiaKwh: Number(form.tarifaEnergiaKwh) || DEFAULT_APP_SETTINGS.tarifaEnergiaKwh,
      depreciacaoHora: Number(form.depreciacaoHora) || 0,
      custoFixoUnidade: Number(form.custoFixoUnidade) || 0,
      defaultPesoRolo: Number(form.defaultPesoRolo) || DEFAULT_APP_SETTINGS.defaultPesoRolo,
      defaultQuantidade: Number(form.defaultQuantidade) || DEFAULT_APP_SETTINGS.defaultQuantidade,
      whatsappNumero: form.whatsappNumero.trim() || DEFAULT_APP_SETTINGS.whatsappNumero,
      // Preserve per-printer settings from current settings
      selectedPrinterPreset: currentSettings.selectedPrinterPreset,
      printerPrices: currentSettings.printerPrices,
      printerVidaUtil: currentSettings.printerVidaUtil,
    };
    mutate.mutate(parsed);
  }

  function resetToDefaults() {
    setForm(toForm(DEFAULT_APP_SETTINGS));
    setHasChanges(true);
    toast.info("Valores padrão restaurados. Salve para aplicar.");
  }

  function resetToCurrent() {
    setForm(toForm(currentSettings));
    setHasChanges(false);
  }

  // Preview of cost calculation with current form values
  const previewCost = (() => {
    const consumoKw = Number(form.consumoKw) || 0;
    const tarifaKwh = Number(form.tarifaEnergiaKwh) || 0;
    const depHora = Number(form.depreciacaoHora) || 0;
    const fixo = Number(form.custoFixoUnidade) || 0;
    // Cost for 1h print, 10g piece, R$120/kg roll
    const tempoMin = 60;
    const pesoPeca = 10;
    const custoRolo = 120;
    const pesoRolo = 1000;
    const custoFilamento = (custoRolo / pesoRolo) * pesoPeca;
    const custoEnergia = (tempoMin / 60) * consumoKw * tarifaKwh;
    const custoDepreciacao = (tempoMin / 60) * depHora;
    const custoUnidade = custoFilamento + custoEnergia + custoDepreciacao + fixo;
    return { custoFilamento, custoEnergia, custoDepreciacao, custoFixo: fixo, custoUnidade };
  })();

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Perfil do estúdio e parâmetros de custo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={resetToCurrent} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4" /> Descartar
          </Button>
          <Button size="sm" className="btn-filament gap-2" onClick={handleSubmit} disabled={mutate.isPending || !hasChanges}>
            <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-700">
          <Info className="h-4 w-4 shrink-0" />
          <span>Existem alterações não salvas.</span>
        </div>
      )}

      {/* Barra flutuante: permite salvar de qualquer ponto da página */}
      {hasChanges && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg">
            <span className="hidden text-sm text-muted-foreground sm:inline">Alterações não salvas</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={resetToCurrent}>
              <RotateCcw className="h-4 w-4" /> Descartar
            </Button>
            <Button size="sm" className="btn-filament gap-2" onClick={handleSubmit} disabled={mutate.isPending}>
              <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section: Perfil do Estúdio ── */}
        <SectionCard icon={Settings2} title="Perfil do Estúdio" description="Nome do estúdio exibido no sistema.">
          <SettingsField label="Nome do Estúdio" hint="Exibido no cabeçalho e relatórios." className="sm:col-span-2">
            <Input value={form.studioNome} onChange={(e) => setField("studioNome", e.target.value)} placeholder="Kurti 3D" maxLength={100} />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Impressora ── */}
        <SectionCard icon={Printer} title="Impressora" description="Configurações da impressora 3D utilizada para cálculos.">
          <SettingsField label="Modelo da Impressora" hint="Nome do modelo usado como referência.">
            <Input value={form.impressoraModelo} onChange={(e) => setField("impressoraModelo", e.target.value)} placeholder="Bambu Lab A1" maxLength={100} />
          </SettingsField>
          <SettingsField label="Consumo da Impressora (kW)" hint="Potência média consumida durante a impressão. Bambu Lab A1 ≈ 0.095 kW.">
            <Input type="number" inputMode="decimal" min={0} step={0.001} value={form.consumoKw} onChange={(e) => setField("consumoKw", e.target.value)} placeholder="0.095" />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Parâmetros de Custo ── */}
        <SectionCard icon={Zap} title="Parâmetros de Custo" description="Valores usados no cálculo de custo de cada impressão. Afetam a Calculadora e os Pedidos.">
          <SettingsField label="Tarifa de Energia (R$/kWh)" hint="Valor pago por kWh de energia elétrica. Consulte sua conta de luz.">
            <Input type="number" inputMode="decimal" min={0} step={0.01} value={form.tarifaEnergiaKwh} onChange={(e) => setField("tarifaEnergiaKwh", e.target.value)} placeholder="0.75" />
          </SettingsField>
          <SettingsField label="Depreciação da Máquina (R$/hora)" hint="Custo de desgaste da impressora por hora de uso.">
            <Input type="number" inputMode="decimal" min={0} step={0.01} value={form.depreciacaoHora} onChange={(e) => setField("depreciacaoHora", e.target.value)} placeholder="0.70" />
          </SettingsField>
          <SettingsField label="Custo Fixo por Unidade (R$)" hint="Custos adicionais fixos por peça (embalagem, etiqueta, etc).">
            <Input type="number" inputMode="decimal" min={0} step={0.01} value={form.custoFixoUnidade} onChange={(e) => setField("custoFixoUnidade", e.target.value)} placeholder="0.20" />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Valores Padrão ── */}
        <SectionCard icon={DollarSign} title="Valores Padrão" description="Valores preenchidos automaticamente ao criar novos projetos na Calculadora.">
          <SettingsField label="Peso do Rolo Padrão (g)" hint="Peso padrão do rolo de filamento ao criar novo projeto.">
            <Input type="number" inputMode="decimal" min={1} step={100} value={form.defaultPesoRolo} onChange={(e) => setField("defaultPesoRolo", e.target.value)} placeholder="1000" />
          </SettingsField>
          <SettingsField label="Quantidade Padrão do Lote" hint="Quantidade de peças sugerida ao criar novo projeto.">
            <Input type="number" inputMode="decimal" min={1} step={1} value={form.defaultQuantidade} onChange={(e) => setField("defaultQuantidade", e.target.value)} placeholder="10" />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Contato ── */}
        <SectionCard icon={MessageCircle} title="Contato" description="Configurações de contato da landing page.">
          <SettingsField label="Número do WhatsApp" hint="Número com código do país e DDD. Ex: 5511999999999. Usado pelo formulário de contato da landing page." className="sm:col-span-2">
            <Input value={form.whatsappNumero} onChange={(e) => setField("whatsappNumero", e.target.value)} placeholder="5511999999999" maxLength={30} />
          </SettingsField>
        </SectionCard>
      </form>

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

/* ── Helper Components ── */

function SectionCard({ icon: Icon, title, description, children }: {
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

function SettingsField({ label, hint, children, className = "" }: {
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

function PreviewCard({ label, value, color, bold = false }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-3">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display tabular-nums", bold ? "text-xl font-bold" : "text-lg font-semibold")} style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const qc = useQueryClient();
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const handleChangePasswordError = useToastErrorHandler({ fallbackMessage: "Erro ao alterar senha." });

  const mutate = useMutation({
    mutationFn: () => changePassword({ data: { newPassword: newPass } }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setNewPass("");
      setConfirm("");
    },
    onError: handleChangePasswordError,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const passwordMessage = getPasswordPolicyMessage(newPass);
    if (passwordMessage) { toast.error(passwordMessage); return; }
    if (newPass !== confirm) { toast.error("As senhas não conferem."); return; }
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
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Nova senha</Label>
          <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="8+ caracteres, maiuscula, minuscula e numero" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Confirmar nova senha</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="repita a senha" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" className="btn-filament gap-2" disabled={mutate.isPending}>
            <Lock className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Alterar Senha"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// Monta a URL do WhatsApp com a mensagem ja preenchida (numero brasileiro: +55).
function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

// Mensagem pronta para enviar ao novo admin com os dados de acesso.
function buildCredentialsMessage(
  creds: { nome: string; phone: string; username: string; password: string },
  loginUrl: string,
) {
  const login = creds.phone || creds.username;
  return (
    `Ola ${creds.nome || "admin"}! Seu acesso ao painel da Kurti 3D foi criado.\n\n` +
    `Acesse: ${loginUrl}\n` +
    `Login: ${login}\n` +
    `Senha provisoria: ${creds.password}\n\n` +
    `No primeiro acesso o sistema vai pedir para voce criar uma senha pessoal.`
  );
}

// Gera uma senha provisoria forte que atende a politica (maiuscula, minuscula, numero).
function generateProvisionalPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  const pick = (set: string, n: number) => set[n % set.length];
  const chars = [pick(upper, bytes[0]), pick(lower, bytes[1]), pick(digits, bytes[2])];
  for (let i = 3; i < 10; i++) chars.push(pick(all, bytes[i]));
  // Embaralha para nao deixar as classes sempre nas mesmas posicoes.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Tela mostrada apos criar o usuario: exibe as credenciais uma unica vez e permite
// copiar a mensagem pronta ou enviar direto pelo WhatsApp.
function CreatedUserShare({
  creds,
  onClose,
}: {
  creds: { nome: string; phone: string; username: string; password: string };
  onClose: () => void;
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
      <DialogHeader><DialogTitle>Usuario criado — envie o acesso</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          Esta e a unica vez que a senha provisoria aparece. Copie ou envie agora — depois nao e possivel ve-la novamente.
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Nome</span><span className="font-medium">{creds.nome}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Login</span><span className="font-medium">{login}</span></div>
          <div className="flex justify-between gap-2"><span className="text-muted-foreground">Senha provisoria</span><span className="font-mono font-semibold">{creds.password}</span></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyMessage}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar mensagem"}
          </Button>
          {creds.phone ? (
            <a href={buildWhatsAppUrl(creds.phone, message)} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button type="button" className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
              </Button>
            </a>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Concluir</Button>
        </DialogFooter>
      </div>
    </>
  );
}

function UserManagementCard() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["adminUsers"], queryFn: () => listUsers() });
  const authQ = useQuery({ queryKey: ["authRole"], queryFn: () => requireAuth() });
  const isSuperAdmin = authQ.data?.role === "super_admin";
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", phone: "", username: "", password: "Kurti-3D" });
  const [showPassword, setShowPassword] = useState(false);
  // Estado do dialog de edicao
  const [editTarget, setEditTarget] = useState<{ id: string; nome: string; username: string } | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", username: "" });
  // Credenciais recem-criadas para compartilhar (so vivem em memoria, uma vez):
  // a senha provisoria nao fica salva em texto puro no banco.
  const [createdCreds, setCreatedCreds] = useState<{ nome: string; phone: string; username: string; password: string } | null>(null);
  const handleCreateUserError = useToastErrorHandler({ fallbackMessage: "Erro ao criar usuário." });
  const handleDeleteUserError = useToastErrorHandler({ fallbackMessage: "Erro ao remover usuário." });

  const mutateCreate = useMutation({
    mutationFn: () => createUser({ data: { nome: form.nome, phone: form.phone, username: form.username, password: form.password } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuário criado.");
      // Guarda as credenciais para a tela de compartilhamento antes de limpar o form.
      setCreatedCreds({ ...form });
      setForm({ nome: "", phone: "", username: "", password: "Kurti-3D" });
      setShowPassword(false);
    },
    onError: handleCreateUserError,
  });

  const mutateDelete = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuário removido.");
      setDeleteId(null);
    },
    onError: handleDeleteUserError,
  });

  const mutateReset = useMutation({
    mutationFn: (userId: string) => resetPassword({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Senha resetada para Kurti-3D. O usuário deverá trocá-la no próximo acesso.");
    },
    onError: () => toast.error("Erro ao resetar senha."),
  });

  const mutateDeactivate = useMutation({
    mutationFn: (userId: string) => deactivateUser({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuario inativado.");
    },
    onError: () => toast.error("Erro ao inativar."),
  });

  const mutateActivate = useMutation({
    mutationFn: (userId: string) => activateUser({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuario ativado.");
    },
    onError: () => toast.error("Erro ao ativar."),
  });

  const mutateEdit = useMutation({
    mutationFn: () => editUser({ data: { userId: editTarget!.id, nome: editForm.nome, username: editForm.username } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuario atualizado.");
      setEditTarget(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "";
      if (message === "username_exists") toast.error("Usuario ja existe.");
      else if (message === "username_empty") toast.error("O login alternativo nao pode ficar vazio.");
      else toast.error("Erro ao editar.");
    },
  });

  const users = usersQ.data ?? [];

  return (
    <>
      <Card className="filament-top overflow-hidden border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-base font-semibold tracking-tight">Usuários Admin</h2>
            </div>
            {isSuperAdmin && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4" /> Novo Usuário
              </Button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isSuperAdmin
              ? "Gerencie os administradores com acesso ao painel."
              : "Somente o super admin pode criar ou remover usuários."}
          </p>
        </div>
        <div className="p-6">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className={cn(
                  "flex items-center justify-between rounded-lg border border-border px-4 py-3",
                  u.active === false ? "bg-muted/20 opacity-60" : "bg-muted/30",
                )}>
                  <div>
                    <p className="font-medium">
                      {u.nome ?? u.username}
                      {u.mustChangePassword ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          Senha provisoria
                        </span>
                      ) : null}
                      {u.active === false ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Inativo
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.phone ?? u.username} · {u.role === "super_admin" ? "Super Admin" : "Admin"}</p>
                  </div>
                  {isSuperAdmin && u.role !== "super_admin" && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { setEditTarget({ id: u.id, nome: u.nome ?? "", username: u.username }); setEditForm({ nome: u.nome ?? "", username: u.username }); }} title="Editar nome e login">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => mutateReset.mutate(u.id)} disabled={mutateReset.isPending} title="Resetar senha para Kurti-3D">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {u.active !== false ? (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-amber-600" onClick={() => mutateDeactivate.mutate(u.id)} disabled={mutateDeactivate.isPending} title="Inativar usuario">
                          <UserX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-green-600" onClick={() => mutateActivate.mutate(u.id)} disabled={mutateActivate.isPending} title="Reativar usuario">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create user dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowDialog(false);
            setCreatedCreds(null);
            setShowPassword(false);
            setForm({ nome: "", phone: "", username: "", password: "Kurti-3D" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {createdCreds ? (
            <CreatedUserShare
              creds={createdCreds}
              onClose={() => {
                setShowDialog(false);
                setCreatedCreds(null);
              }}
            />
          ) : (
            <>
              <DialogHeader><DialogTitle>Novo Usuário Admin</DialogTitle></DialogHeader>
              <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); const passwordMessage = getPasswordPolicyMessage(form.password); if (passwordMessage) { toast.error(passwordMessage); return; } mutateCreate.mutate(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do usuário" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11967428594" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Usuário (login alternativo)</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="nome_usuario" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha provisória</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="8+ caracteres, maiuscula, minuscula e numero"
                        autoComplete="new-password"
                        className="pr-10"
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
                    <Button type="button" variant="outline" size="sm" onClick={() => { setForm((f) => ({ ...f, password: "Kurti-3D" })); setShowPassword(true); }}>
                      Padrão
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">No primeiro acesso, o usuário será obrigado a trocar esta senha por uma pessoal.</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                  <Button type="submit" className="btn-filament" disabled={mutateCreate.isPending}>{mutateCreate.isPending ? "Criando..." : "Criar"}</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover Usuário</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (deleteId) mutateDelete.mutate(deleteId); }} disabled={mutateDelete.isPending}>{mutateDelete.isPending ? "Removendo..." : "Remover"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); mutateEdit.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Nome do usuário" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário (login alternativo)</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="nome_usuario" autoComplete="off" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={mutateEdit.isPending}>{mutateEdit.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SiteContentCard() {
  const qc = useQueryClient();
  const contentQ = useQuery({ queryKey: ["siteContent"], queryFn: () => getSiteContent() });
  const [form, setForm] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [dirty, setDirty] = useState(false);

  // Sync form when data loads
  useEffect(() => {
    if (contentQ.data && !dirty) {
      setForm(contentQ.data);
    }
  }, [contentQ.data, dirty]);

  const handleSaveError = useToastErrorHandler({ fallbackMessage: "Erro ao salvar conteúdo do site." });

  const mutate = useMutation({
    mutationFn: () => saveSiteContent({ data: form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["siteContent"] });
      setDirty(false);
      toast.success("Conteúdo do site salvo.");
    },
    onError: handleSaveError,
  });

  function set<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-semibold tracking-tight">Conteúdo do Site</h2>
          </div>
          <Button size="sm" className="btn-filament gap-2" disabled={mutate.isPending || !dirty} onClick={() => mutate.mutate()}>
            <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Edite os textos e links exibidos na landing page.</p>
      </div>
      <div className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium">Título do Hero</Label>
          <Input value={form.heroTitulo} onChange={(e) => set("heroTitulo", e.target.value)} placeholder="Rápido. Colorido.\nPerfeito." />
          <p className="text-[11px] text-muted-foreground">Use \n para quebra de linha. Linha 2 recebe gradiente colorido.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium">Subtítulo do Hero</Label>
          <Input value={form.heroSubtitulo} onChange={(e) => set("heroSubtitulo", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Instagram URL</Label>
          <Input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">YouTube URL</Label>
          <Input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} />
        </div>
        {form.heroStats.map((s, i) => (
          <div key={i} className="space-y-1.5">
            <Label className="text-sm font-medium">Stat {i + 1}: Valor</Label>
            <Input value={s.valor} onChange={(e) => {
              const next = [...form.heroStats];
              next[i] = { ...next[i], valor: e.target.value };
              set("heroStats", next);
            }} />
            <Label className="text-[11px] text-muted-foreground">Label</Label>
            <Input value={s.label} onChange={(e) => {
              const next = [...form.heroStats];
              next[i] = { ...next[i], label: e.target.value };
              set("heroStats", next);
            }} />
          </div>
        ))}
        {form.features.map((f, i) => (
          <div key={i} className="space-y-1.5 sm:col-span-2">
            <Label className="text-sm font-medium">Feature {i + 1}: Título</Label>
            <Input value={f.titulo} onChange={(e) => {
              const next = [...form.features];
              next[i] = { ...next[i], titulo: e.target.value };
              set("features", next);
            }} />
            <Label className="text-[11px] text-muted-foreground">Descrição</Label>
            <Input value={f.descricao} onChange={(e) => {
              const next = [...form.features];
              next[i] = { ...next[i], descricao: e.target.value };
              set("features", next);
            }} />
          </div>
        ))}
        {form.testimonials.map((testimonial, i) => (
          <div key={i} className="space-y-1.5 sm:col-span-2 rounded-xl border border-border/70 p-4">
            <Label className="text-sm font-medium">Depoimento {i + 1}: Nome</Label>
            <Input
              value={testimonial.nome}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], nome: e.target.value };
                set("testimonials", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Cargo / contexto</Label>
            <Input
              value={testimonial.cargo}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], cargo: e.target.value };
                set("testimonials", next);
              }}
            />
            <Label className="text-[11px] text-muted-foreground">Texto</Label>
            <Textarea
              rows={3}
              value={testimonial.texto}
              onChange={(e) => {
                const next = [...form.testimonials];
                next[i] = { ...next[i], texto: e.target.value };
                set("testimonials", next);
              }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function StorageCleanupCard() {
  const qc = useQueryClient();
  const mutateCleanup = useMutation({
    mutationFn: (olderThanDays: number) =>
      runStorageCleanup({ data: { olderThanDays } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${result.deletedCount} arquivos removidos do storage.`);
    },
    onError: () => toast.error("Erro ao executar limpeza."),
  });

  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold tracking-tight">Limpeza de Storage</h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Remove imagens de leads antigos para liberar espaço no plano gratuito do Supabase.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 p-6">
        <div className="text-sm text-muted-foreground">
          <p>Remove imagens de leads com mais de 90 dias.</p>
          <p className="text-xs mt-1">Esta ação é irreversível — as imagens serão permanentemente excluídas do storage.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          disabled={mutateCleanup.isPending}
          onClick={() => mutateCleanup.mutate(90)}
        >
          <Trash2 className="h-4 w-4" />
          {mutateCleanup.isPending ? "Limpando..." : "Limpar Storage"}
        </Button>
      </div>
    </Card>
  );
}
