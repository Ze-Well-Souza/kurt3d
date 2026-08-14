import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  RotateCcw,
  Printer,
  Zap,
  DollarSign,
  Settings2,
  Info,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveSettings } from "@/lib/api/data.functions";
import type { AppSettings } from "@/lib/domain/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/domain/types";
import { useSettings } from "@/lib/hooks/use-settings";
import { useToastErrorHandler } from "@/lib/hooks/use-toast-error-handler";
import { invalidarPor } from "@/lib/query-keys";
import { SectionCard, SettingsField } from "./settings-shared";

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

export function StudioSettingsForm() {
  const qc = useQueryClient();
  const { data: currentSettingsData } = useSettings();
  const currentSettings = currentSettingsData ?? DEFAULT_APP_SETTINGS;
  const [form, setForm] = useState<SettingsForm>(toForm(currentSettings));
  const [hasChanges, setHasChanges] = useState(false);
  const handleSaveError = useToastErrorHandler({ fallbackMessage: "Erro ao salvar." });

  const mutate = useMutation({
    mutationFn: (input: AppSettings) => saveSettings({ data: input }),
    onSuccess: () => {
      invalidarPor(qc, "salvarSettings");
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

  function resetToCurrent() {
    setForm(toForm(currentSettings));
    setHasChanges(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Perfil do estúdio e parâmetros de custo.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={resetToCurrent}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4" /> Descartar
          </Button>
          <Button
            size="sm"
            className="btn-filament gap-2"
            onClick={handleSubmit}
            disabled={mutate.isPending || !hasChanges}
          >
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
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Alterações não salvas
            </span>
            <Button variant="outline" size="sm" className="gap-2" onClick={resetToCurrent}>
              <RotateCcw className="h-4 w-4" /> Descartar
            </Button>
            <Button
              size="sm"
              className="btn-filament gap-2"
              onClick={handleSubmit}
              disabled={mutate.isPending}
            >
              <Save className="h-4 w-4" /> {mutate.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section: Perfil do Estúdio ── */}
        <SectionCard
          icon={Settings2}
          title="Perfil do Estúdio"
          description="Nome do estúdio exibido no sistema."
        >
          <SettingsField
            label="Nome do Estúdio"
            hint="Exibido no cabeçalho e relatórios."
            className="sm:col-span-2"
          >
            <Input
              value={form.studioNome}
              onChange={(e) => setField("studioNome", e.target.value)}
              placeholder="Kurti 3D"
              maxLength={100}
            />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Impressora ── */}
        <SectionCard
          icon={Printer}
          title="Impressora"
          description="Configurações da impressora 3D utilizada para cálculos."
        >
          <SettingsField label="Modelo da Impressora" hint="Nome do modelo usado como referência.">
            <Input
              value={form.impressoraModelo}
              onChange={(e) => setField("impressoraModelo", e.target.value)}
              placeholder="Bambu Lab A1"
              maxLength={100}
            />
          </SettingsField>
          <SettingsField
            label="Consumo da Impressora (kW)"
            hint="Potência média consumida durante a impressão. Bambu Lab A1 ≈ 0.095 kW."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.001}
              value={form.consumoKw}
              onChange={(e) => setField("consumoKw", e.target.value)}
              placeholder="0.095"
            />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Parâmetros de Custo ── */}
        <SectionCard
          icon={Zap}
          title="Parâmetros de Custo"
          description="Valores usados no cálculo de custo de cada impressão. Afetam a Calculadora e os Pedidos."
        >
          <SettingsField
            label="Tarifa de Energia (R$/kWh)"
            hint="Valor pago por kWh de energia elétrica. Consulte sua conta de luz."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={form.tarifaEnergiaKwh}
              onChange={(e) => setField("tarifaEnergiaKwh", e.target.value)}
              placeholder="0.75"
            />
          </SettingsField>
          <SettingsField
            label="Depreciação da Máquina (R$/hora)"
            hint="Custo de desgaste da impressora por hora de uso."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={form.depreciacaoHora}
              onChange={(e) => setField("depreciacaoHora", e.target.value)}
              placeholder="0.70"
            />
          </SettingsField>
          <SettingsField
            label="Custo Fixo por Unidade (R$)"
            hint="Custos adicionais fixos por peça (embalagem, etiqueta, etc)."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={form.custoFixoUnidade}
              onChange={(e) => setField("custoFixoUnidade", e.target.value)}
              placeholder="0.20"
            />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Valores Padrão ── */}
        <SectionCard
          icon={DollarSign}
          title="Valores Padrão"
          description="Valores preenchidos automaticamente ao criar novos projetos na Calculadora."
        >
          <SettingsField
            label="Peso do Rolo Padrão (g)"
            hint="Peso padrão do rolo de filamento ao criar novo projeto."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              step={100}
              value={form.defaultPesoRolo}
              onChange={(e) => setField("defaultPesoRolo", e.target.value)}
              placeholder="1000"
            />
          </SettingsField>
          <SettingsField
            label="Quantidade Padrão do Lote"
            hint="Quantidade de peças sugerida ao criar novo projeto."
          >
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              value={form.defaultQuantidade}
              onChange={(e) => setField("defaultQuantidade", e.target.value)}
              placeholder="10"
            />
          </SettingsField>
        </SectionCard>

        {/* ── Section: Contato ── */}
        <SectionCard
          icon={MessageCircle}
          title="Contato"
          description="Configurações de contato da landing page."
        >
          <SettingsField
            label="Número do WhatsApp"
            hint="Número com código do país e DDD. Ex: 5511999999999. Usado pelo formulário de contato da landing page."
            className="sm:col-span-2"
          >
            <Input
              value={form.whatsappNumero}
              onChange={(e) => setField("whatsappNumero", e.target.value)}
              placeholder="5511999999999"
              maxLength={30}
            />
          </SettingsField>
        </SectionCard>
      </form>
    </>
  );
}
