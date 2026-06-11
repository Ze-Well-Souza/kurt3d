import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  addFilamento,
  removeFilamento,
  nextFilamentoSku,
  useInsumos,
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
  sku: z.string().trim().min(1, "Informe o SKU").max(40),
  marca: z.string().trim().min(1, "Informe a marca").max(60),
  cor: z.string().trim().min(1, "Informe a cor").max(60),
  material: z.enum(MATERIALS),
  pesoInicial: z.number().min(1, "Peso inicial inválido").max(100000),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(100000),
  dataCompra: z.string().min(1, "Informe a data da compra"),
});

const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item").max(100),
  dataCompra: z.string().min(1, "Informe a data da compra"),
  quantidade: z.string().trim().min(1, "Informe a quantidade").max(40),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(1000000),
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

type InsumoForm = {
  nome: string;
  dataCompra: string;
  quantidade: string;
  precoPago: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const blankFilamento = (): FilamentoForm => ({
  sku: nextFilamentoSku(),
  marca: "",
  cor: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
  dataCompra: today(),
});

const blankInsumo = (): InsumoForm => ({
  nome: "",
  dataCompra: today(),
  quantidade: "",
  precoPago: "",
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

function Stock() {
  const filamentos = useFilamentos();
  const insumos = useInsumos();
  const [form, setForm] = useState<FilamentoForm>(blankFilamento);
  const [insumoForm, setInsumoForm] = useState<InsumoForm>(blankInsumo);

  // Keep auto-SKU fresh while form is empty/untouched
  useEffect(() => {
    setForm((f) => ({ ...f, sku: f.sku || nextFilamentoSku() }));
     
  }, [filamentos.length]);

  const setField = <K extends keyof FilamentoForm>(key: K, value: FilamentoForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setInsumoField = <K extends keyof InsumoForm>(key: K, value: InsumoForm[K]) =>
    setInsumoForm((f) => ({ ...f, [key]: value }));

  const submitFilamento = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = filamentoSchema.safeParse({
      sku: form.sku,
      marca: form.marca,
      cor: form.cor,
      material: form.material,
      pesoInicial: Number(form.pesoInicial),
      precoPago: Number(form.precoPago),
      dataCompra: form.dataCompra,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const d = parsed.data;
    if (filamentos.some((f) => f.sku.toLowerCase() === d.sku.toLowerCase())) {
      toast.error("Já existe um rolo com este SKU.");
      return;
    }
    const filamento: Filamento = {
      id: crypto.randomUUID(),
      sku: d.sku,
      marca: d.marca,
      cor: d.cor,
      nome: `${d.material} ${d.marca} ${d.cor}`,
      material: d.material,
      pesoInicial: d.pesoInicial,
      pesoAtual: d.pesoInicial,
      precoPago: d.precoPago,
      dataCompra: d.dataCompra,
    };
    addFilamento(filamento);
    setForm(blankFilamento());
    toast.success(`Rolo "${filamento.nome}" cadastrado.`);
  };

  const submitInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = insumoSchema.safeParse({
      nome: insumoForm.nome,
      dataCompra: insumoForm.dataCompra,
      quantidade: insumoForm.quantidade,
      precoPago: Number(insumoForm.precoPago),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const insumo: Insumo = { id: crypto.randomUUID(), ...parsed.data };
    addInsumo(insumo);
    setInsumoForm(blankInsumo());
    toast.success(`Insumo "${insumo.nome}" registrado.`);
  };

  const totalGramas = filamentos.reduce((s, f) => s + f.pesoAtual, 0);
  const totalInicial = filamentos.reduce((s, f) => s + f.pesoInicial, 0);
  const totalFilamentos = filamentos.reduce((s, f) => s + f.precoPago, 0);
  const totalInsumos = insumos.reduce((s, i) => s + i.precoPago, 0);
  const totalInvestido = totalFilamentos + totalInsumos;
  const percentualGeral = totalInicial > 0 ? (totalGramas / totalInicial) * 100 : 0;

  return (
    <div className="space-y-10">
      <Toaster />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Estoque de Filamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre rolos, insumos e acompanhe o capital investido.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <Kpi label="Rolos ativos" value={String(filamentos.length)} />
          <Kpi label="Estoque geral" value={`${percentualGeral.toFixed(0)}%`} accent />
          <Kpi label="Total investido" value={brl(totalInvestido)} />
        </div>
      </div>

      {/* Filamento form */}
      <form
        onSubmit={submitFilamento}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-semibold">Cadastrar Novo Rolo</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="SKU (Código de Controle)">
            <Input
              value={form.sku}
              onChange={(e) => setField("sku", e.target.value)}
              placeholder="FIL-001"
              maxLength={40}
            />
          </Field>
          <Field label="Marca">
            <Input
              value={form.marca}
              onChange={(e) => setField("marca", e.target.value)}
              placeholder="Bambu Lab, Creality..."
              maxLength={60}
            />
          </Field>
          <Field label="Cor">
            <Input
              value={form.cor}
              onChange={(e) => setField("cor", e.target.value)}
              placeholder="Cyan, Magenta, Preto..."
              maxLength={60}
            />
          </Field>
          <Field label="Material">
            <Select
              value={form.material}
              onValueChange={(v) => setField("material", v as Material)}
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
            value={form.pesoInicial}
            onChange={(v) => setField("pesoInicial", v)}
            placeholder="1000"
            step="1"
          />
          <NumberField
            label="Preço Pago (R$)"
            value={form.precoPago}
            onChange={(v) => setField("precoPago", v)}
            placeholder="120,00"
          />
          <Field label="Data da Compra">
            <Input
              type="date"
              value={form.dataCompra}
              onChange={(e) => setField("dataCompra", e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Rolo
          </Button>
        </div>
      </form>

      {/* Filament list */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Estoque Atual</h2>
          <span className="text-xs text-muted-foreground">
            {totalGramas}g de {totalInicial}g restantes
          </span>
        </div>
        {filamentos.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum filamento cadastrado.
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
                      <Badge variant="destructive" className="text-xs">Acabando!</Badge>
                    </div>
                  )}
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
                        style={{ color: isLow ? "#ef4444" : isMedium ? "#e0a93b" : "#5fa8a3" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold leading-tight">
                        {f.marca} <span className="text-muted-foreground">·</span> {f.cor}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">{f.sku}</Badge>
                        <Badge variant="secondary" className="text-xs">{f.material}</Badge>
                      </div>
                    </div>
                  </div>
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
                      <span className="tabular-nums font-medium" style={{ color: isLow ? "#ef4444" : undefined }}>
                        {percent.toFixed(0)}%
                      </span>
                      <span>Custo/g: {brl(custoPorGrama)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      <div>Pago: <span className="font-medium text-foreground">{brl(f.precoPago)}</span></div>
                      <div>Compra: <span className="font-medium text-foreground">{formatDate(f.dataCompra)}</span></div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { removeFilamento(f.id); toast.success("Filamento removido."); }}
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

      {/* ─── Outros Insumos e Ferramentas ─── */}
      <div className="space-y-6 border-t border-border pt-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Outros Insumos e Ferramentas
            </h2>
            <p className="text-sm text-muted-foreground">
              Bicos, álcool, correntes, embalagens — tudo que não é filamento.
            </p>
          </div>
        </div>

        <form
          onSubmit={submitInsumo}
          className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
        >
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Nome do Item" className="lg:col-span-2">
              <Input
                value={insumoForm.nome}
                onChange={(e) => setInsumoField("nome", e.target.value)}
                placeholder="Correntes de Chaveiro, Álcool Isopropílico, Bico 0.4mm..."
                maxLength={100}
              />
            </Field>
            <Field label="Data da Compra">
              <Input
                type="date"
                value={insumoForm.dataCompra}
                onChange={(e) => setInsumoField("dataCompra", e.target.value)}
              />
            </Field>
            <Field label="Quantidade / Volume">
              <Input
                value={insumoForm.quantidade}
                onChange={(e) => setInsumoField("quantidade", e.target.value)}
                placeholder="500ml, 100 un., 1 peça..."
                maxLength={40}
              />
            </Field>
            <NumberField
              label="Preço Total Pago (R$)"
              value={insumoForm.precoPago}
              onChange={(v) => setInsumoField("precoPago", v)}
              placeholder="45,00"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
              <Plus className="h-4 w-4" /> Registrar Insumo
            </Button>
          </div>
        </form>

        <div className="filament-top rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-display text-lg font-semibold">Insumos registrados</h3>
            <span className="text-xs text-muted-foreground">
              {insumos.length} itens · {brl(totalInsumos)}
            </span>
          </div>
          {insumos.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum insumo registrado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Qtd. / Volume</TableHead>
                  <TableHead className="text-right">Preço Pago</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell>{formatDate(i.dataCompra)}</TableCell>
                    <TableCell>{i.quantidade}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(i.precoPago)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { removeInsumo(i.id); toast.success("Insumo removido."); }}
                        aria-label="Excluir insumo"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
    </div>
  );
}

function Kpi({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-bold ${accent ? "filament-text" : ""}`}>
        {value}
      </div>
    </div>
  );
}

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
