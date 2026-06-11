import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
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
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useFilamentos, addFilamento, removeFilamento, type Filamento } from "@/lib/store";

export const Route = createFileRoute("/admin/stock")({
  component: Stock,
});

const MATERIALS = ["PLA", "PETG", "ABS", "TPU"] as const;
type Material = (typeof MATERIALS)[number];

const schema = z.object({
  nome: z.string().trim().min(1, "Informe a marca/cor").max(100),
  material: z.enum(MATERIALS),
  pesoInicial: z.number().min(1, "Peso inicial inválido").max(100000),
  precoPago: z.number().min(0.01, "Preço pago inválido").max(100000),
});

type FormState = {
  nome: string;
  material: Material;
  pesoInicial: string;
  precoPago: string;
};

const initialForm: FormState = {
  nome: "",
  material: "PLA",
  pesoInicial: "1000",
  precoPago: "",
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Stock() {
  const filamentos = useFilamentos();
  const [form, setForm] = useState<FormState>(initialForm);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      nome: form.nome,
      material: form.material,
      pesoInicial: Number(form.pesoInicial),
      precoPago: Number(form.precoPago),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const { nome, material, pesoInicial, precoPago } = parsed.data;
    const filamento: Filamento = {
      id: crypto.randomUUID(),
      nome: `${material} ${nome}`,
      material,
      pesoInicial,
      pesoAtual: pesoInicial,
      precoPago,
    };
    addFilamento(filamento);
    setForm(initialForm);
    toast.success(`Rolo "${filamento.nome}" cadastrado com sucesso.`);
  };

  const remove = (id: string) => {
    removeFilamento(id);
    toast.success("Filamento removido.");
  };

  // Summary stats
  const totalGramas = filamentos.reduce((sum, f) => sum + f.pesoAtual, 0);
  const totalInicial = filamentos.reduce((sum, f) => sum + f.pesoInicial, 0);
  const totalInvestido = filamentos.reduce((sum, f) => sum + f.precoPago, 0);
  const percentualGeral = totalInicial > 0 ? (totalGramas / totalInicial) * 100 : 0;

  return (
    <div className="space-y-8">
      <Toaster />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Estoque de Filamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre rolos e acompanhe o consumo de material.
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

      {/* Form */}
      <form
        onSubmit={submit}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-semibold">Cadastrar Novo Rolo</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Marca / Cor" className="md:col-span-2">
            <Input
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              placeholder="Ex: Creality Magenta, Bambu Lab Cyan..."
              maxLength={100}
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
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Adicionar Rolo
          </Button>
        </div>
      </form>

      {/* Filament List */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Estoque Atual</h2>
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
                  {/* Low stock indicator */}
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
                          color: isLow
                            ? "#ef4444"
                            : isMedium
                              ? "#e0a93b"
                              : "#5fa8a3",
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold leading-tight">{f.nome}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {f.material}
                      </Badge>
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
                      <span className="tabular-nums font-medium" style={{ color: isLow ? "#ef4444" : undefined }}>
                        {percent.toFixed(0)}%
                      </span>
                      <span>
                        Custo/g: {brl(custoPorGrama)}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      Pago: <span className="font-medium text-foreground">{brl(f.precoPago)}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(f.id)}
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
