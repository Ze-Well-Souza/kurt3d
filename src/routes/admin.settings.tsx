import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw, Printer, Zap, DollarSign, Settings2, Info, MessageCircle, Lock, Users, Plus, Trash2, Globe, HardDrive } from "lucide-react";
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
import { changePassword, listUsers, createUser, deleteUser, getSiteContent, saveSiteContent } from "@/lib/api/auth.functions";
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

function UserManagementCard() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["adminUsers"], queryFn: () => listUsers() });
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", phone: "", username: "", password: "" });
  const handleCreateUserError = useToastErrorHandler({ fallbackMessage: "Erro ao criar usuário." });
  const handleDeleteUserError = useToastErrorHandler({ fallbackMessage: "Erro ao remover usuário." });

  const mutateCreate = useMutation({
    mutationFn: () => createUser({ data: { nome: form.nome, phone: form.phone, username: form.username, password: form.password } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Usuário criado.");
      setForm({ nome: "", phone: "", username: "", password: "" });
      setShowDialog(false);
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
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" /> Novo Usuário
            </Button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Gerencie os administradores com acesso ao painel.</p>
        </div>
        <div className="p-6">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="font-medium">{u.nome ?? u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.phone ?? u.username} · {u.role}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create user dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => !o && setShowDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Usuário Admin</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const passwordMessage = getPasswordPolicyMessage(form.password); if (passwordMessage) { toast.error(passwordMessage); return; } mutateCreate.mutate(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11967428594" />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário (login alternativo)</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="nome_usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ caracteres, maiuscula, minuscula e numero" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={mutateCreate.isPending}>{mutateCreate.isPending ? "Criando..." : "Criar"}</Button>
            </DialogFooter>
          </form>
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
