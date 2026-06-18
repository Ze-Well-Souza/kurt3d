import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw, Printer, Zap, DollarSign, Settings2, Info, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listSnapshot, saveSettings } from "@/lib/api/data.functions";
import type { AppSettings } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";

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
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const currentSettings = snap.data?.settings ?? DEFAULT_APP_SETTINGS;
  const [form, setForm] = useState<SettingsForm>(toForm(currentSettings));
  const [hasChanges, setHasChanges] = useState(false);

  const mutate = useMutation({
    mutationFn: (input: AppSettings) => saveSettings({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      setHasChanges(false);
      toast.success("Configurações salvas com sucesso.");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Erro ao salvar.");
    },
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

        {/* ── Preview Section ── */}
        <Card className="filament-top overflow-hidden border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight">Pré-visualização de Custo</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Estimativa baseada em: 1h de impressão, peça de 10g, rolo de R$120/kg.</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
            <PreviewCard label="Filamento /un." value={`R$ ${previewCost.custoFilamento.toFixed(4)}`} color="var(--filament-cyan)" />
            <PreviewCard label="Energia /un." value={`R$ ${previewCost.custoEnergia.toFixed(4)}`} color="var(--filament-yellow)" />
            <PreviewCard label="Depreciação /un." value={`R$ ${previewCost.custoDepreciacao.toFixed(4)}`} color="var(--filament-pink)" />
            <PreviewCard label="Custo Fixo /un." value={`R$ ${previewCost.custoFixo.toFixed(4)}`} color="var(--filament-green)" />
            <PreviewCard label="Custo Total /un." value={`R$ ${previewCost.custoUnidade.toFixed(4)}`} color="var(--filament-magenta)" bold />
          </div>
        </Card>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <Button type="button" variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4" /> Restaurar padrões
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetToCurrent} disabled={!hasChanges}>Cancelar</Button>
            <Button type="submit" size="sm" className="btn-filament gap-2 px-6" disabled={mutate.isPending || !hasChanges}>
              <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </form>
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
