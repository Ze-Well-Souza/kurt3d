import {
  Calculator,
  Globe,
  Layers,
  Loader2,
  Lock,
  Package,
  Pencil,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  Wand as Wand2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, brl } from "@/lib/utils";
import { SearchInput } from "@/components/SearchInput";
import {
  BAMBU_PRESETS,
  type BambuPresetId,
  calcAdvancedPortfolioPricing,
  type PortfolioCalculatorEntryMode,
} from "@/lib/domain/portfolio-pricing";
import { TimeInput } from "./TimeInput";
import { VisibilityBadge } from "./VisibilityBadge";
import { ProjectImagesPicker } from "./ProjectImagesPicker";
import {
  InfoTip,
  Field,
  NumberField,
  ACCENT_COLORS,
  ResultCard,
  CalculatorDonutChart,
} from "./calculator-ui";
import {
  CATEGORIES,
  type Category,
  buildEmptyFilamentoItem,
  buildEmptyExtraCost,
} from "./calc-pedidos-shared";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function CalculatorTab({ ctx }: { ctx: CalcPedidosCtx }) {
  const {
    projects,
    settings,
    form,
    setForm,
    mutateAddProject,
    mutateRemoveProject,
    mutateUpdateProject,
    numeric,
    results,
    setField,
    isSlicerMode,
    effectiveLotProfit,
    setOrderDialog,
    projectImages,
    setProjectImages,
    projectSearch,
    setProjectSearch,
    openEditProject,
    filteredProjects,
    handlePrintQuote,
    handleProjectAction,
    submitProject,
  } = ctx;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-8">
        {/* Form + Results */}
        <form
          onSubmit={submitProject}
          className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
        >
          {/* ── Bloco 1: Identificação do projeto ── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Nome do Projeto"
              tip="Como esse modelo será identificado nos pedidos e relatórios. Ex.: 'Chaveiro logo Bambu'."
              className="md:col-span-2"
            >
              <Input
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                placeholder="Chaveiro logo Bambu"
                maxLength={100}
              />
            </Field>
            <Field
              label="Categoria"
              tip="Tipo da peça — usado para agrupar nos relatórios. Ex.: Chaveiro, Miniatura, Decoração."
              className="md:col-span-2"
            >
              <Select
                value={form.categoria}
                onValueChange={(v) => setField("categoria", v as Category)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Link do Modelo (MakerWorld/STL)"
              tip="URL do modelo 3D (MakerWorld, Printables, Thingiverse). Opcional — facilita reimprimir depois."
              className="md:col-span-2"
            >
              <Input
                value={form.linkModelo}
                onChange={(e) => setField("linkModelo", e.target.value)}
                placeholder="https://makerworld.com/en/models/..."
                type="url"
              />
            </Field>
            <Field
              label="Fotos do Projeto (site)"
              tip='Até 10 fotos exibidas na galeria "Nossos trabalhos" do site. A primeira é a capa do card.'
              className="md:col-span-2 lg:col-span-4"
            >
              <ProjectImagesPicker images={projectImages} onChange={setProjectImages} />
            </Field>
          </div>

          {/* ── Bloco 2: Impressora (preset Bambu Lab) ── */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Impressora e Amortização
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Modelo Bambu Lab"
                tip="Preset oficial Bambu Lab. Define a wattagem usada no cálculo de energia. Ex.: A1 + AMS = 150W, A1 Mini = 100W."
              >
                <Select
                  value={form.modeloPreset}
                  onValueChange={(v) => {
                    const presetId = v as BambuPresetId;
                    const preset = BAMBU_PRESETS.find((m) => m.id === presetId);
                    setForm((f) => ({
                      ...f,
                      modeloPreset: presetId,
                      precoImpressora: String(
                        settings.printerPrices?.[presetId] ?? preset?.defaultPreco ?? 0,
                      ),
                      vidaUtilHoras: String(
                        settings.printerVidaUtil?.[presetId] ?? preset?.defaultVidaUtilHoras ?? 0,
                      ),
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAMBU_PRESETS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} — {m.watts}W
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <NumberField
                label="Preço da Impressora (R$)"
                value={form.precoImpressora}
                onChange={(v) => setField("precoImpressora", v)}
                placeholder="2999,00"
                tip="Quanto você pagou pela impressora. Usado para calcular a amortização (desgaste) por hora. Ex.: A1 ≈ R$ 2.999."
              />
              <NumberField
                label="Vida Útil (horas)"
                value={form.vidaUtilHoras}
                onChange={(v) => setField("vidaUtilHoras", v)}
                placeholder="2000"
                step="100"
                tip="Quantas horas você espera que a impressora dure antes de precisar trocar partes principais. Padrão: 2000h (~2-3 anos de uso intenso)."
              />
              <NumberField
                label="% Margem de Lucro"
                value={form.margemPercent}
                onChange={(v) => setField("margemPercent", v)}
                placeholder="30"
                step="1"
                tip="Percentual de lucro sobre o custo. Ex.: custo R$ 2, margem 30% → preço sugerido R$ 2,60. O bambucostpro.com usa 30% como padrão."
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Amortização calculada:{" "}
              <strong className="filament-text">{brl(results.amortHora)}/h</strong> (Preço ÷ Vida
              útil) · Consumo: <strong>{(results.consumoKw * 1000).toFixed(0)}W</strong>
            </p>
          </div>

          {/* ── Bloco 3: Peça, tempo e lote ── */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Modo de Entrada"
              tip="Use 'Dados do Fatiador' quando for copiar peso e tempo direto do Bambu Studio/OrcaSlicer. Use 'Ja tenho media por unidade' se voce ja sabe os valores medios por nome."
              className="md:col-span-2"
            >
              <Select
                value={form.entryMode}
                onValueChange={(v) => setField("entryMode", v as PortfolioCalculatorEntryMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slicer">Dados do Fatiador</SelectItem>
                  <SelectItem value="unit">Ja tenho media por unidade</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumberField
              label={isSlicerMode ? "Peso do Fatiamento (g)" : "Peso Medio por Unidade (g)"}
              value={form.pesoPeca}
              onChange={(v) => setField("pesoPeca", v)}
              placeholder={isSlicerMode ? "64,05" : "6"}
              tip={
                isSlicerMode
                  ? "Copie o peso total mostrado pelo fatiador para esta placa/impressao. Ex.: no Bambu Studio, painel 'Filament/Modelo': 64,05g."
                  : "Informe o peso medio de UMA unidade pronta. Ex.: um nome medio pesa 6g."
              }
            />
            <TimeInput
              label={isSlicerMode ? "Tempo do Fatiamento" : "Tempo Medio por Unidade"}
              tip={
                isSlicerMode
                  ? "Copie o tempo total do fatiamento dessa placa. Ex.: 'Tempo total' de 1h45 = 105 minutos."
                  : "Informe o tempo medio para produzir UMA unidade. Se voce ja calculou manualmente, use este modo."
              }
              totalMinutes={Number(form.tempoMin) || 0}
              onChange={(minutes) => setField("tempoMin", String(minutes))}
            />
            <NumberField
              label={isSlicerMode ? "Unidades nesse Fatiamento" : "Unidades por Impressao"}
              value={form.unidadesPorImpressao}
              onChange={(v) => setField("unidadesPorImpressao", v)}
              placeholder="1"
              step="1"
              tip={
                isSlicerMode
                  ? "Quantos nomes/pecas estao representados nesse peso e nesse tempo do fatiador. Para o seu exemplo com 1 nome medio por vez, deixe 1."
                  : "Se voce costuma imprimir mais de uma unidade por vez, informe aqui para estimar quantas impressoes serao necessarias no lote."
              }
            />
            <NumberField
              label="Quantidade do Pedido/Lote"
              value={form.quantidade}
              onChange={(v) => setField("quantidade", v)}
              placeholder="25"
              step="1"
              tip="Total de unidades que o cliente pediu. No seu caso, para 25 nomes diferentes, informe 25."
            />
            <NumberField
              label="% Desperdício"
              value={form.perdaPercent}
              onChange={(v) => setField("perdaPercent", v)}
              placeholder="0"
              step="1"
              tip="Percentual estimado de impressões que falham, descolam ou saem com defeito. Comece com 0%. Depois de imprimir um tempo, se 1 em 20 falha = 5%. Cobre prejuízos no preço final."
            />
            <div className="lg:col-span-2">
              <NumberField
                label="Preço de Venda (R$)"
                value={form.precoVenda}
                onChange={(v) => setField("precoVenda", v)}
                placeholder="15,00"
                tip="Quanto você cobra por UMA peça. Use o 'Aplicar sugerido' ao lado para preencher automaticamente com base na sua margem."
              />
            </div>
          </div>

          {/* ═══════ LISTA DINAMICA DE FILAMENTOS ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3.5 w-3.5" /> Filamentos
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const novo = buildEmptyFilamentoItem();
                  setField("filamentos", [...form.filamentos, novo]);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Filamento
              </Button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Adicone quantos filamentos forem necessarios. O custo de material e a soma de (Peso
              Usado x Custo por grama) de todos os itens.
            </p>
            <div className="space-y-3">
              {form.filamentos.map((fil, idx) => {
                return (
                  <div key={fil.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Filamento {idx + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (form.filamentos.length <= 1) return;
                          setField(
                            "filamentos",
                            form.filamentos.filter((_, i) => i !== idx),
                          );
                        }}
                        disabled={form.filamentos.length <= 1}
                        aria-label="Remover filamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="sm:col-span-1">
                        <Field label="Marca" tip="Ex.: Voolt, Creality, eSun">
                          <Input
                            value={fil.marca ?? ""}
                            onChange={(e) => {
                              const updated = [...form.filamentos];
                              updated[idx] = { ...updated[idx], marca: e.target.value };
                              setField("filamentos", updated);
                            }}
                            placeholder="Voolt"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-1">
                        <Field label="Cor" tip="Ex.: Preto, Azul, Arco-Íris">
                          <Input
                            value={fil.cor ?? ""}
                            onChange={(e) => {
                              const updated = [...form.filamentos];
                              updated[idx] = { ...updated[idx], cor: e.target.value };
                              setField("filamentos", updated);
                            }}
                            placeholder="Preto"
                          />
                        </Field>
                      </div>
                      <NumberField
                        label="Preco do Rolo (R$)"
                        value={String(fil.precoRolo || "")}
                        onChange={(v) => {
                          const updated = [...form.filamentos];
                          updated[idx] = { ...updated[idx], precoRolo: Number(v) || 0 };
                          setField("filamentos", updated);
                        }}
                        placeholder="120,00"
                        tip="Quanto voce pagou pelo rolo inteiro."
                      />
                      <NumberField
                        label="Peso do Rolo (g)"
                        value={String(fil.pesoRolo || "")}
                        onChange={(v) => {
                          const updated = [...form.filamentos];
                          updated[idx] = { ...updated[idx], pesoRolo: Number(v) || 0 };
                          setField("filamentos", updated);
                        }}
                        placeholder="1000"
                        tip="Peso total do rolo (ex.: 1kg = 1000g)."
                      />
                      <NumberField
                        label="Peso Usado na Impressao (g)"
                        value={String(fil.pesoUsado || "")}
                        onChange={(v) => {
                          const updated = [...form.filamentos];
                          updated[idx] = { ...updated[idx], pesoUsado: Number(v) || 0 };
                          setField("filamentos", updated);
                        }}
                        placeholder="45"
                        tip="Quantos gramas deste filamento serao usados na impressao final."
                      />
                      {fil.pesoRolo > 0 && fil.pesoUsado > 0 && (
                        <div className="flex items-end pb-2">
                          <span className="text-xs text-muted-foreground">
                            Custo:{" "}
                            <strong className="filament-text">
                              {brl((fil.precoRolo / fil.pesoRolo) * fil.pesoUsado)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {results.custoFilamentosDetalhado !== undefined &&
              results.custoFilamentosDetalhado > 0 && (
                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  <span className="text-xs font-semibold">
                    Custo total dos filamentos:{" "}
                    <strong className="filament-text">
                      {brl(results.custoFilamentosDetalhado)}
                    </strong>
                  </span>
                </div>
              )}
          </div>

          {/* ═══════ CUSTOS EXTRAS ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Custos Adicionais
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setField("custosExtras", [...form.custosExtras, buildEmptyExtraCost()]);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Custo
              </Button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Custos extras como embalagem, cola, post-processamento, etc.
            </p>
            {form.custosExtras.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Nenhum custo adicional cadastrado. Clique em "Adicionar Custo" para incluir.
              </p>
            ) : (
              <div className="space-y-3">
                {form.custosExtras.map((ec, idx) => (
                  <div
                    key={ec.id}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex-1 min-w-[120px]">
                      <Field label="Nome">
                        <Input
                          value={ec.nome}
                          onChange={(e) => {
                            const updated = [...form.custosExtras];
                            updated[idx] = { ...updated[idx], nome: e.target.value };
                            setField("custosExtras", updated);
                          }}
                          placeholder="Ex.: Embalagem"
                        />
                      </Field>
                    </div>
                    <NumberField
                      label="Custo Unit. (R$)"
                      value={String(ec.custo || "")}
                      onChange={(v) => {
                        const updated = [...form.custosExtras];
                        updated[idx] = { ...updated[idx], custo: Number(v) || 0 };
                        setField("custosExtras", updated);
                      }}
                      placeholder="2,50"
                    />
                    <NumberField
                      label="Quantidade"
                      value={String(ec.quantidade || "")}
                      onChange={(v) => {
                        const updated = [...form.custosExtras];
                        updated[idx] = { ...updated[idx], quantidade: Number(v) || 0 };
                        setField("custosExtras", updated);
                      }}
                      placeholder="1"
                      step="1"
                    />
                    {ec.custo > 0 && ec.quantidade > 0 && (
                      <div className="flex items-end pb-2">
                        <span className="text-xs text-muted-foreground">
                          Total: <strong>{brl(ec.custo * ec.quantidade)}</strong>
                        </span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setField(
                          "custosExtras",
                          form.custosExtras.filter((_, i) => i !== idx),
                        )
                      }
                      aria-label="Remover custo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {results.custoExtraTotal !== undefined && results.custoExtraTotal > 0 && (
              <div className="mt-3 flex justify-end border-t border-border pt-3">
                <span className="text-xs font-semibold">
                  Total custos adicionais:{" "}
                  <strong className="filament-text">{brl(results.custoExtraTotal)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* ═══════ ENERGIA + MAO DE OBRA + TAXA ═══════ */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Energia, Mao de Obra e Taxas
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Custo do kWh (R$)"
                value={form.custoKwh}
                onChange={(v) => setField("custoKwh", v)}
                placeholder={String(settings.tarifaEnergiaKwh)}
                tip="Deixe em branco para usar o valor das Configuracoes (R$ {settings.tarifaEnergiaKwh})."
              />
              <NumberField
                label="Horas de Mao de Obra"
                value={form.custoTrabalhoHoras}
                onChange={(v) => setField("custoTrabalhoHoras", v)}
                placeholder="0"
                step="0.5"
                tip="Horas trabalhadas no processo (preparacao, pos-processamento, embalagem)."
              />
              <NumberField
                label="Valor da Hora (R$)"
                value={form.custoTrabalhoValorHora}
                onChange={(v) => setField("custoTrabalhoValorHora", v)}
                placeholder="25,00"
                tip="Quanto voce cobra por hora de trabalho. Ex.: R$ 25/h."
              />
              <NumberField
                label="Taxa do Gateway/Marketplace (%)"
                value={form.taxaGateway}
                onChange={(v) => setField("taxaGateway", v)}
                placeholder="0"
                step="0.5"
                tip="Percentual de taxa da plataforma de venda (Shopee, Mercado Livre, etc.). Ex.: 10%."
              />
            </div>
            {results.custoTrabalho !== undefined && results.custoTrabalho > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Custo de mao de obra: <strong>{brl(results.custoTrabalho)}</strong>
                {Number(form.custoKwh) > 0 && (
                  <>
                    {" "}
                    · Custo de energia (com kWh informado):{" "}
                    <strong>{brl(results.custoEnergia * numeric.quantidade)}</strong>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Leitura do Fatiador
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isSlicerMode
                    ? "A calculadora esta convertendo o peso/tempo total do fatiador para uma media por unidade e para o lote inteiro."
                    : "A calculadora esta usando os valores medios por unidade que voce informou manualmente."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Media: {results.pesoUnitario.toFixed(2)}g/un.</Badge>
                <Badge variant="secondary">Media: {results.tempoUnitario.toFixed(1)} min/un.</Badge>
                <Badge variant="secondary">Impressoes no lote: {results.impressoesLote}</Badge>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Exemplo para o seu caso: se a peca pesa <strong>{form.pesoPeca || "64,05"}g</strong> e
              leva <strong>{form.tempoMin || "105"} min</strong> no fatiador, com{" "}
              <strong>{form.unidadesPorImpressao || "1"}</strong> unidade por impressao e pedido de{" "}
              <strong>{form.quantidade || "25"}</strong> pecas, o sistema usa essa media para
              sugerir um preco unitario e calcula o lote completo.
            </p>
          </div>

          {/* Results Panel — Donut + KPIs */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calculator className="h-3.5 w-3.5" /> Resumo do Orçamento
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              {/* Left: Donut Chart */}
              <div className="flex items-center justify-center">
                <CalculatorDonutChart results={results} numeric={numeric} />
              </div>

              {/* Right: BIG highlight cards */}
              <div className="flex flex-col gap-3 min-w-[220px]">
                <div className="relative overflow-hidden rounded-xl border-2 border-green-500/30 bg-green-50/30 p-4">
                  <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Preco Sugerido /un.{" "}
                    <InfoTip
                      text={`Custo medio por unidade + ${form.margemPercent || 0}% de margem${Number(form.taxaGateway) > 0 ? ` + ${form.taxaGateway}% de taxa do gateway` : ""}.`}
                    />
                  </div>
                  <div
                    className="mt-1 font-display text-3xl font-bold tabular-nums"
                    style={{ color: ACCENT_COLORS.green }}
                  >
                    {brl(results.precoSugerido)}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1 text-xs"
                    onClick={() => setField("precoVenda", results.precoSugerido.toFixed(2))}
                  >
                    <Wand2 className="h-3 w-3" /> Aplicar
                  </Button>
                </div>

                <div
                  className={`relative overflow-hidden rounded-xl border-2 p-4 ${effectiveLotProfit >= 0 ? "border-green-500/30 bg-green-50/30" : "border-red-500/30 bg-red-50/30"}`}
                >
                  <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Lucro Liquido do Lote{" "}
                    <InfoTip
                      text={
                        numeric.precoVenda > 0
                          ? "Lucro do lote usando o Preco de Venda informado."
                          : "Lucro estimado do lote usando o Preco Sugerido, ja que ainda nao ha um Preco de Venda informado."
                      }
                    />
                  </div>
                  <div
                    className="mt-1 font-display text-3xl font-bold tabular-nums"
                    style={{
                      color: effectiveLotProfit >= 0 ? ACCENT_COLORS.green : ACCENT_COLORS.magenta,
                    }}
                  >
                    {brl(effectiveLotProfit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Mini cards grid */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultCard
                label="Filamentos"
                value={brl(
                  results.custoFilamentosDetalhado ?? results.custoFilamento * numeric.quantidade,
                )}
                accent="cyan"
                tip="Custo total de todos os filamentos usados no lote."
              />
              <ResultCard
                label="Energia"
                value={brl(results.custoEnergia * numeric.quantidade)}
                accent="yellow"
                tip="Custo total de energia eletrica para o lote inteiro."
              />
              <ResultCard
                label="Depreciacao"
                value={brl(results.custoDepreciacao * numeric.quantidade)}
                accent="orange"
                tip="Custo de desgaste da maquina (amortizacao) para o lote inteiro."
              />
              <ResultCard
                label="Custos Extras"
                value={brl(results.custoExtraTotal ?? 0)}
                accent="pink"
                tip="Soma de todos os custos adicionais (embalagem, cola, etc.)"
              />
              <ResultCard
                label="Mao de Obra"
                value={brl(results.custoTrabalho ?? 0)}
                accent="magenta"
                tip="Custo de mao de obra (horas x valor hora)."
              />
              <ResultCard
                label="Desperdicio"
                value={brl(results.custoPerda * numeric.quantidade)}
                accent="pink"
                tip="Acrescimo para cobrir perdas, falhas ou retrabalho."
              />
              <ResultCard
                label="Custo Total do Lote"
                value={brl(results.custoLote)}
                accent="magenta"
                tip="Custo total estimado para entregar todo o pedido/lote informado."
              />
              {results.taxaGatewayAplicada ? (
                <ResultCard
                  label="Taxa Gateway"
                  value={brl(results.taxaGatewayAplicada * numeric.quantidade)}
                  accent="orange"
                  tip="Valor da taxa de marketplace/gateway repassada ao preco."
                />
              ) : null}
            </div>
          </div>

          {/* Sticky CTA bar */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 rounded-b-2xl border-t border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleProjectAction("save-private")}
                    disabled={mutateAddProject.isPending}
                  >
                    {mutateAddProject.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Salvar Privado
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Salvar projeto sem publicar no site</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => handleProjectAction("save-publish")}
                    disabled={mutateAddProject.isPending}
                  >
                    {mutateAddProject.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    Salvar e Publicar no Site
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Salvar e exibir no portfólio público</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="lg"
                    className="btn-filament gap-2 px-6"
                    onClick={() => handleProjectAction("create-order")}
                    disabled={mutateAddProject.isPending}
                  >
                    {mutateAddProject.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    Criar Pedido
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Salvar projeto e criar pedido imediatamente</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="gap-2 px-6"
                    onClick={() => handlePrintQuote()}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir Orçamento
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gerar orçamento em PDF para enviar ao cliente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </form>

        {/* Saved Projects */}
        <div className="filament-top rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Projetos salvos</h2>
            <div className="flex items-center gap-3">
              <SearchInput
                value={projectSearch}
                onChange={setProjectSearch}
                placeholder="Buscar projeto..."
              />
              <span className="text-xs text-muted-foreground">
                {filteredProjects.length} de {projects.length}
              </span>
            </div>
          </div>
          {projects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Nenhum projeto ainda. Calcule e salve seu primeiro lote acima.
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Nenhum projeto encontrado para “{projectSearch}”.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Custo/un.</TableHead>
                  <TableHead className="text-right">Perda</TableHead>
                  <TableHead className="text-right">Custo lote</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((p) => {
                  // P2-2: esta tabela usava calcPortfolioPricing (versão sem
                  // multi-filamento/custos extras/taxa de gateway/mão de
                  // obra), enquanto o resumo de totais logo abaixo já usava
                  // calcAdvancedPortfolioPricing com os mesmos dados — as
                  // duas podiam mostrar lucro diferente para o mesmo
                  // projeto sempre que ele usasse algum desses campos.
                  const r = calcAdvancedPortfolioPricing({
                    custoRolo: p.custoRolo,
                    pesoRolo: p.pesoRolo,
                    pesoEntrada: p.pesoPeca,
                    tempoEntradaMin: p.tempoMin,
                    quantidade: p.quantidade,
                    precoVenda: p.precoVenda,
                    perdaPercent: p.perdaPercent ?? 0,
                    entryMode: "unit",
                    unidadesPorImpressao: 1,
                    settings,
                    filamentos: p.filamentos,
                    custosExtras: p.custosExtras,
                    taxaGateway: p.taxaGateway ?? 0,
                    custoTrabalhoHoras: p.custoTrabalhoHoras ?? 0,
                    custoTrabalhoValorHora: p.custoTrabalhoValorHora ?? 0,
                    custoKwhOverride: p.custoKwh ?? 0,
                  });
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.nome}
                          <VisibilityBadge isPublic={p.isPublic ?? true} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            mutateUpdateProject.mutate({
                              id: p.id,
                              nome: p.nome,
                              categoria: p.categoria,
                              linkModelo: p.linkModelo ?? null,
                              filamentoId: p.filamentoId ?? null,
                              custoRolo: p.custoRolo,
                              pesoRolo: p.pesoRolo,
                              pesoPeca: p.pesoPeca,
                              tempoMin: p.tempoMin,
                              quantidade: p.quantidade,
                              precoVenda: p.precoVenda,
                              perdaPercent: p.perdaPercent ?? null,
                              isPublic: !(p.isPublic ?? true),
                              filamentos: p.filamentos,
                              custosExtras: p.custosExtras,
                              custoKwh: p.custoKwh ?? null,
                              custoTrabalhoHoras: p.custoTrabalhoHoras ?? null,
                              custoTrabalhoValorHora: p.custoTrabalhoValorHora ?? null,
                              taxaGateway: p.taxaGateway ?? null,
                            });
                          }}
                          aria-label={p.isPublic ? "Tornar privado" : "Tornar público"}
                          title={p.isPublic ? "Tornar privado" : "Tornar público"}
                        >
                          {p.isPublic ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {p.linkModelo ? (
                          <a
                            href={p.linkModelo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ver modelo</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {brl(r.custoUnidade)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.perdaPercent ? `${p.perdaPercent}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {brl(r.custoLote)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(r.receitaTotal)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-semibold",
                          r.lucroLiquido >= 0 ? "filament-text" : "text-destructive",
                        )}
                      >
                        {brl(r.lucroLiquido)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setOrderDialog({
                                open: true,
                                projectId: p.id,
                                client: "",
                                clientId: "",
                                quantity: String(p.quantidade ?? 1),
                              })
                            }
                          >
                            Criar pedido
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditProject(p)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => mutateRemoveProject.mutate(p.id)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
