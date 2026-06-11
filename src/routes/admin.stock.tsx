import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Package, Wrench } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  useFilamentos,
  useInsumos,
  addFilamento,
  removeFilamento,
  addInsumo,
  removeInsumo,
  type Filamento,
  type Insumo,
} from "@/lib/store";

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
};

const initialFilamentoForm: FilamentoForm = {
  sku: "",
  marca: "",
  cor: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
  dataCompra: "",
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
};

const initialInsumoForm: InsumoForm = {
  nome: "",
  dataCompra: "",
  quantidade: "",
  precoTotal: "",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function generateSku(filamentos: Filamento[]): string {
  let max = 0;
  for (const f of filamentos) {
    const match = f.sku.match(/^FIL-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `FIL-${String(max + 1).padStart(3, "0")}`;
}

function Stock() {
  const filamentos = useFilamentos();
  const insumos = useInsumos();

  const [fForm, setFForm] = useState<FilamentoForm>(() => ({
    ...initialFilamentoForm,
    sku: generateSku(filamentos),
    dataCompra: new Date().toISOString().slice(0, 10),
  }));
  const [iForm, setIForm] = useState<InsumoForm>(initialInsumoForm);

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
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { sku, marca, cor, material, pesoInicial, precoPago, dataCompra } = parsed.data;
    const filamento: Filamento = {
      id: crypto.randomUUID(),
      sku,
      marca,
      cor,
      material,
      pesoInicial,
      pesoAtual: pesoInicial,
      precoPago,
      dataCompra,
    };
    addFilamento(filamento);
    setFForm({
      ...initialFilamentoForm,
      sku: generateSku([...filamentos, filamento]),
      dataCompra: new Date().toISOString().slice(0, 10),
    });
    toast.success(`Rolo [${sku}] ${marca} ${cor} cadastrado.`);
  };

  // ── Insumo submit ──
  const submitInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = insumoSchema.safeParse({
      nome: iForm.nome,
      dataCompra: iForm.dataCompra,
      quantidade: iForm.quantidade,
      precoTotal: Number(iForm.precoTotal),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const insumo: Insumo = { id: crypto.randomUUID(), ...parsed.data };
    addInsumo(insumo);
    setIForm(initialInsumoForm);
    toast.success(`Insumo "${insumo.nome}" cadastrado.`);
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

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      {brl(f.precoPago)} ·{" "}
                      <span className="tabular-nums">
                        {new Date(f.dataCompra).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        removeFilamento(f.id);
                        toast.success("Filamento removido.");
                      }}
                      aria-label="Excluir filamento"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
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
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(i.precoTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        removeInsumo(i.id);
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
