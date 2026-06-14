import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Package, Wrench, Archive, ThumbsUp, ThumbsDown, Minus, ExternalLink } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { archiveFilamento, addInsumo, listSnapshot, removeFilamento, removeInsumo, upsertFilamento } from "@/lib/api/data.functions";
import type { Filamento, FilamentoHistory, FilamentoQualidade, Insumo } from "@/lib/domain/types";

export const Route = createFileRoute("/admin/stock")({
  component: Stock,
});

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"] as const;
type Material = (typeof MATERIALS)[number];

const filamentoSchema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(50),
  marca: z.string().trim().min(1, "Informe a marca").max(100),
  cor: z.string().trim().min(1, "Informe a cor").max(100),
  material: z.enum(MATERIALS),
  pesoInicial: z.number().min(1, "Peso inicial inválido").max(100000),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(100000),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
});

type FilamentoForm = {
  sku: string;
  marca: string;
  cor: string;
  material: Material;
  pesoInicial: string;
  precoPago: string;
  dataCompra: string;
  linkProduto: string;
};

const initialFilamentoForm: FilamentoForm = {
  sku: "",
  marca: "",
  cor: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
  dataCompra: "",
  linkProduto: "",
};

const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item").max(200),
  dataCompra: z.string().min(1, "Data da compra obrigatória"),
  quantidade: z.string().trim().min(1, "Informe a quantidade").max(100),
  precoTotal: z.number().min(0.01, "Preço total inválido").max(1000000),
});

type InsumoForm = {
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoTotal: string;
  linkProduto: string;
};

const initialInsumoForm: InsumoForm = {
  nome: "",
  dataCompra: "",
  quantidade: "",
  precoTotal: "",
  linkProduto: "",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const QUALIDADE_CONFIG: Record<FilamentoQualidade, { label: string; color: string; icon: typeof ThumbsUp }> = {
  bom: { label: "Bom", color: "var(--filament-green)", icon: ThumbsUp },
  medio: { label: "Médio", color: "var(--filament-yellow)", icon: Minus },
  ruim: { label: "Ruim", color: "var(--filament-magenta)", icon: ThumbsDown },
};

function generateSku(filamentos: Filamento[]): string {
  let max = 0;
  for (const f of filamentos) {
    const match = f.sku.match(/^FIL-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FIL-${String(max + 1).padStart(3, "0")}`;
}

type FilamentoView = Filamento & { reservedGrams?: number; disponivelGrams?: number; label?: string };

function Stock() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const filamentos = (snap.data?.filamentos ?? []) as FilamentoView[];
  const filamentosHistory = (snap.data?.filamentosHistory ?? []) as FilamentoHistory[];
  const insumos = (snap.data?.insumos ?? []) as Insumo[];

  const mutateFilamento = useMutation({
    mutationFn: (input: z.infer<typeof filamentoSchema>) => upsertFilamento({ data: input as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }),
  });

  const mutateRemoveFilamento = useMutation({
    mutationFn: (id: string) => removeFilamento({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }),
  });

  const mutateArchive = useMutation({
    mutationFn: (input: { id: string; qualidade?: FilamentoQualidade; comentario?: string }) =>
      archiveFilamento({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["snapshot"] });
      toast.success("Filamento arquivado no histórico.");
    },
  });

  const mutateInsumo = useMutation({
    mutationFn: (input: z.infer<typeof insumoSchema>) => addInsumo({ data: input as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }),
  });

  const mutateRemoveInsumo = useMutation({
    mutationFn: (id: string) => removeInsumo({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["snapshot"] }),
  });

  const [fForm, setFForm] = useState<FilamentoForm>(() => ({
    ...initialFilamentoForm,
    sku: generateSku(filamentos),
    dataCompra: new Date().toISOString().slice(0, 10),
  }));
  const [iForm, setIForm] = useState<InsumoForm>(initialInsumoForm);

  const [archiveDialog, setArchiveDialog] = useState<{
    open: boolean;
    filamentId: string;
    qualidade: FilamentoQualidade;
    comentario: string;
    dataFim: string;
  }>({
    open: false,
    filamentId: "",
    qualidade: "bom",
    comentario: "",
    dataFim: new Date().toISOString().slice(0, 10),
  });

  const setFField = <K extends keyof FilamentoForm>(key: K, value: FilamentoForm[K]) =>
    setFForm((f) => ({ ...f, [key]: value }));

  const setIField = <K extends keyof InsumoForm>(key: K, value: InsumoForm[K]) =>
    setIForm((f) => ({ ...f, [key]: value }));

  // ── Filament submit ──
  const submitFilamento = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = filamentoSchema.safeParse({
      sku: fForm.sku,
      marca: fForm.marca,
      cor: fForm.cor,
      material: fForm.material,
      pesoInicial: Number(fForm.pesoInicial),
      precoPago: Number(fForm.precoPago),
      dataCompra: fForm.dataCompra,
      linkProduto: fForm.linkProduto || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutateFilamento.mutate(parsed.data);
    setFForm({
      ...initialFilamentoForm,
      sku: generateSku(filamentos),
      dataCompra: new Date().toISOString().slice(0, 10),
    });
    toast.success(`Rolo [${parsed.data.sku}] cadastrado.`);
  };

  // ── Archive submit ──
  const submitArchive = () => {
    mutateArchive.mutate({
      id: archiveDialog.filamentId,
      qualidade: archiveDialog.qualidade,
      comentario: archiveDialog.comentario || undefined,
    });
    setArchiveDialog({ open: false, filamentId: "", qualidade: "bom", comentario: "", dataFim: new Date().toISOString().slice(0, 10) });
  };

  // ── Insumo submit ──
  const submitInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = insumoSchema.safeParse({
      nome: iForm.nome,
      dataCompra: iForm.dataCompra,
      quantidade: iForm.quantidade,
      precoTotal: Number(iForm.precoTotal),
      linkProduto: iForm.linkProduto || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    mutateInsumo.mutate(parsed.data);
    setIForm(initialInsumoForm);
    toast.success(`Insumo "${parsed.data.nome}" cadastrado.`);
  };

  // ── Summary stats ──
  const totalGramas = filamentos.reduce((sum, f) => sum + f.pesoAtual, 0);
  const totalInicial = filamentos.reduce((sum, f) => sum + f.pesoInicial, 0);
  const totalFilamentos = filamentos.reduce((sum, f) => sum + f.precoPago, 0);
  const totalInsumos = insumos.reduce((sum, i) => sum + i.precoTotal, 0);
  const totalInvestido = totalFilamentos + totalInsumos;
  const percentualGeral = totalInicial > 0 ? (totalGramas / totalInicial) * 100 : 0;

  return (
    <div className="space-y-8">
      <Toaster />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Estoque & Insumos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão completa de filamentos, ferramentas e materiais de apoio.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Rolos ativos
            </div>
            <div className="font-display text-xl font-bold">{filamentos.length}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Estoque geral
            </div>
            <div className="font-display text-xl font-bold filament-text">
              {percentualGeral.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total investido
            </div>
            <div className="font-display text-xl font-bold">{brl(totalInvestido)}</div>
          </div>
        </div>
      </div>

      {/* ═══════════ FILAMENT FORM ═══════════ */}
      <form
        onSubmit={submitFilamento}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-semibold">Cadastrar Novo Rolo</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="SKU (Código)" className="md:col-span-1">
            <Input
              value={fForm.sku}
              onChange={(e) => setFField("sku", e.target.value.toUpperCase())}
              placeholder="FIL-004"
              maxLength={50}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={fForm.marca}
              onChange={(e) => setFField("marca", e.target.value)}
              placeholder="Creality, Bambu Lab..."
              maxLength={100}
            />
          </Field>
          <Field label="Cor">
            <Input
              value={fForm.cor}
              onChange={(e) => setFField("cor", e.target.value)}
              placeholder="Cyan, Magenta, Black..."
              maxLength={100}
            />
          </Field>
          <Field label="Material">
            <Select
              value={fForm.material}
              onValueChange={(v) => setFField("material", v as Material)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <NumberField
            label="Peso Inicial (g)"
            value={fForm.pesoInicial}
            onChange={(v) => setFField("pesoInicial", v)}
            placeholder="1000"
            step="1"
          />
          <NumberField
            label="Preço Pago (R$)"
            value={fForm.precoPago}
            onChange={(v) => setFField("precoPago", v)}
            placeholder="120,00"
          />
          <Field label="Data da Compra">
            <Input
              type="date"
              value={fForm.dataCompra}
              onChange={(e) => setFField("dataCompra", e.target.value)}
            />
          </Field>
          <Field label="Link do Produto (opcional)" className="md:col-span-2 lg:col-span-4">
            <Input
              type="url"
              value={fForm.linkProduto}
              onChange={(e) => setFField("linkProduto", e.target.value)}
              placeholder="https://www.amazon.com.br/... ou link do vendedor"
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Rolo
          </Button>
        </div>
      </form>

      {/* ═══════════ FILAMENT LIST ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Estoque Atual de Filamentos</h2>
          <span className="text-xs text-muted-foreground">
            {totalGramas}g de {totalInicial}g restantes
          </span>
        </div>
        {filamentos.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum filamento cadastrado. Adicione seu primeiro rolo acima.
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {filamentos.map((f) => {
              const percent = f.pesoInicial > 0 ? (f.pesoAtual / f.pesoInicial) * 100 : 0;
              const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
              const isLow = percent < 20;
              const isMedium = percent >= 20 && percent < 50;

              return (
                <div
                  key={f.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
                >
                  {isLow && (
                    <div className="absolute right-3 top-3">
                      <Badge variant="destructive" className="text-xs">
                        Acabando!
                      </Badge>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                      style={{
                        background: isLow
                          ? "rgba(239,68,68,0.15)"
                          : isMedium
                            ? "rgba(224,169,59,0.15)"
                            : "rgba(95,168,163,0.15)",
                      }}
                    >
                      <Package
                        className="h-5 w-5"
                        style={{
                          color: isLow ? "#ef4444" : isMedium ? "#e0a93b" : "#5fa8a3",
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold leading-tight">
                        {f.marca} — {f.cor}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.sku}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {f.material}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-end justify-between text-xs">
                      <span className="text-muted-foreground">Estoque restante</span>
                      <span className="font-semibold tabular-nums">
                        {f.pesoAtual}g / {f.pesoInicial}g
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      className={isLow ? "progress-low" : isMedium ? "progress-medium" : ""}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: isLow ? "#ef4444" : undefined }}
                      >
                        {percent.toFixed(0)}%
                      </span>
                      <span>Custo/g: {brl(custoPorGrama)}</span>
                    </div>
                  </div>

                  {/* Quality badge (if set) */}
                  {f.qualidade && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs"
                        style={{ borderColor: QUALIDADE_CONFIG[f.qualidade].color, color: QUALIDADE_CONFIG[f.qualidade].color }}
                      >
                        {(() => { const Icon = QUALIDADE_CONFIG[f.qualidade].icon; return <Icon className="h-3 w-3" />; })()}
                        {QUALIDADE_CONFIG[f.qualidade].label}
                      </Badge>
                    </div>
                  )}

                  {/* Link (if set) */}
                  {f.linkProduto && (
                    <a
                      href={f.linkProduto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver produto
                    </a>
                  )}

                  {/* Comment (if set) */}
                  {f.comentario && (
                    <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                      "{f.comentario}"
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      {brl(f.precoPago)} ·{" "}
                      <span className="tabular-nums">
                        {new Date(f.dataCompra).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() =>
                          setArchiveDialog({
                            open: true,
                            filamentId: f.id,
                            qualidade: "bom",
                            comentario: "",
                            dataFim: new Date().toISOString().slice(0, 10),
                          })
                        }
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Finalizar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          mutateRemoveFilamento.mutate(f.id);
                          toast.success("Filamento removido.");
                        }}
                        aria-label="Excluir filamento"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ ARCHIVE DIALOG ═══════════ */}
      <Dialog open={archiveDialog.open} onOpenChange={(open) => setArchiveDialog((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Filamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              O filamento será removido do estoque ativo e salvo no histórico.
            </p>
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Input
                type="date"
                value={archiveDialog.dataFim}
                onChange={(e) => setArchiveDialog((s) => ({ ...s, dataFim: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Qualidade do Filamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["bom", "medio", "ruim"] as FilamentoQualidade[]).map((q) => {
                  const cfg = QUALIDADE_CONFIG[q];
                  const Icon = cfg.icon;
                  const selected = archiveDialog.qualidade === q;
                  return (
                    <Button
                      key={q}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="gap-1.5"
                      style={selected ? { background: cfg.color } : undefined}
                      onClick={() => setArchiveDialog((s) => ({ ...s, qualidade: q }))}
                    >
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea
                rows={3}
                maxLength={500}
                placeholder="Ex: Cor ficou apagada, quebrou fácil, excelente acabamento..."
                value={archiveDialog.comentario}
                onChange={(e) => setArchiveDialog((s) => ({ ...s, comentario: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialog((s) => ({ ...s, open: false }))}>
              Cancelar
            </Button>
            <Button className="btn-filament" onClick={submitArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ FILAMENT HISTORY ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Histórico de Filamentos</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {filamentosHistory.length} rolo(s) arquivado(s)
          </span>
        </div>
        {filamentosHistory.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum filamento arquivado ainda. Use o botão "Finalizar" em um rolo para movê-lo ao histórico.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Marca / Cor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Preço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filamentosHistory.map((h) => {
                const qCfg = h.qualidade ? QUALIDADE_CONFIG[h.qualidade] : null;
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.sku}</TableCell>
                    <TableCell className="font-medium">{h.marca} — {h.cor}</TableCell>
                    <TableCell>{h.material}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {new Date(h.dataCompra).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {h.dataFim ? new Date(h.dataFim).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      {qCfg ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs"
                          style={{ borderColor: qCfg.color, color: qCfg.color }}
                        >
                          {(() => { const Icon = qCfg.icon; return <Icon className="h-3 w-3" />; })()}
                          {qCfg.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={h.comentario ?? ""}>
                      {h.comentario || "—"}
                    </TableCell>
                    <TableCell>
                      {h.linkProduto ? (
                        <a href={h.linkProduto} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(h.precoPago)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ═══════════ INSUMOS FORM ═══════════ */}
      <form
        onSubmit={submitInsumo}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">
            Outros Insumos e Ferramentas
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome do Item" className="md:col-span-2">
            <Input
              value={iForm.nome}
              onChange={(e) => setIField("nome", e.target.value)}
              placeholder="Correntes de Chaveiro, Álcool Isopropílico, Bico 0.4mm..."
              maxLength={200}
            />
          </Field>
          <Field label="Data da Compra">
            <Input
              type="date"
              value={iForm.dataCompra}
              onChange={(e) => setIField("dataCompra", e.target.value)}
            />
          </Field>
          <Field label="Quantidade / Volume">
            <Input
              value={iForm.quantidade}
              onChange={(e) => setIField("quantidade", e.target.value)}
              placeholder="Ex: 100 un., 500ml, 1 pc..."
              maxLength={100}
            />
          </Field>
          <NumberField
            label="Preço Total Pago (R$)"
            value={iForm.precoTotal}
            onChange={(v) => setIField("precoTotal", v)}
            placeholder="25,00"
          />
          <Field label="Link do Produto (opcional)" className="md:col-span-2 lg:col-span-4">
            <Input
              type="url"
              value={iForm.linkProduto}
              onChange={(e) => setIField("linkProduto", e.target.value)}
              placeholder="https://www.amazon.com.br/... ou link do vendedor"
              maxLength={500}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Insumo
          </Button>
        </div>
      </form>

      {/* ═══════════ INSUMOS TABLE ═══════════ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Insumos Cadastrados</h2>
          <span className="text-xs text-muted-foreground">
            {insumos.length} item(ns) · {brl(totalInsumos)}
          </span>
        </div>
        {insumos.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum insumo cadastrado ainda. Registre ferramentas e materiais de apoio acima.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Preço Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>{i.quantidade}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(i.dataCompra).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {i.linkProduto ? (
                      <a href={i.linkProduto} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        Ver produto
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(i.precoTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        mutateRemoveInsumo.mutate(i.id);
                        toast.success("Insumo removido.");
                      }}
                      aria-label="Excluir insumo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step = "0.01",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}
