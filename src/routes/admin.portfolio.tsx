import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useFilamentos, abaterEstoqueFilamento, usePortfolio, addPortfolioProject, removePortfolioProject } from "@/lib/store";

export const Route = createFileRoute("/admin/portfolio")({
  component: Portfolio,
});

const CATEGORIES = [
  "Chaveiro",
  "Miniatura",
  "Peça Mecânica",
  "Decoração",
  "Cosplay",
  "Protótipo",
] as const;
type Category = (typeof CATEGORIES)[number];

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do projeto").max(100),
  categoria: z.enum(CATEGORIES),
  linkModelo: z.string().url("URL inválida").or(z.literal("")).optional(),
  custoRolo: z.number().min(0.01, "Custo do rolo inválido").max(100000),
  pesoRolo: z.number().min(1, "Peso do rolo inválido").max(100000),
  pesoPeca: z.number().min(0.1, "Peso da peça inválido").max(100000),
  tempoMin: z.number().min(0).max(100000),
  quantidade: z.number().int().min(1, "Quantidade mínima 1").max(100000),
  precoVenda: z.number().min(0).max(1000000),
});

type ProjectInput = z.infer<typeof schema>;
type Project = ProjectInput & { id: string };

type FormState = {
  nome: string;
  categoria: Category;
  linkModelo: string;
  filamentoId: string;
  custoRolo: string;
  pesoRolo: string;
  pesoPeca: string;
  tempoMin: string;
  quantidade: string;
  precoVenda: string;
};

const initialForm: FormState = {
  nome: "",
  categoria: "Chaveiro",
  linkModelo: "",
  filamentoId: "",
  custoRolo: "",
  pesoRolo: "1000",
  pesoPeca: "",
  tempoMin: "",
  quantidade: "10",
  precoVenda: "",
};

function calc(p: {
  custoRolo: number;
  pesoRolo: number;
  pesoPeca: number;
  tempoMin: number;
  quantidade: number;
  precoVenda: number;
}) {
  // Custo do Filamento por unidade
  const custoFilamento = p.pesoRolo > 0 ? (p.custoRolo / p.pesoRolo) * p.pesoPeca : 0;

  // Custo de Energia: (tempo em horas) * 0.095 kW (consumo A1) * R$ 0,75/kWh
  const custoEnergia = (p.tempoMin / 60) * 0.095 * 0.75;

  // Custo de Depreciação da Máquina: R$ 0,70 por hora de impressão
  const custoDepreciacao = (p.tempoMin / 60) * 0.70;

  // Custo fixo estimado (correntes de chaveiro + cola)
  const custoFixo = 0.20;

  const custoUnidade = custoFilamento + custoEnergia + custoDepreciacao + custoFixo;
  const custoLote = custoUnidade * p.quantidade;
  const receitaTotal = p.precoVenda * p.quantidade;
  const lucroLiquido = receitaTotal - custoLote;
  return { custoUnidade, custoFilamento, custoEnergia, custoDepreciacao, custoFixo, custoLote, receitaTotal, lucroLiquido };
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Portfolio() {
  const projects = usePortfolio();
  const [form, setForm] = useState<FormState>(initialForm);
  const filamentos = useFilamentos();

  const numeric = useMemo(
    () => ({
      custoRolo: Number(form.custoRolo) || 0,
      pesoRolo: Number(form.pesoRolo) || 0,
      pesoPeca: Number(form.pesoPeca) || 0,
      tempoMin: Number(form.tempoMin) || 0,
      quantidade: Number(form.quantidade) || 0,
      precoVenda: Number(form.precoVenda) || 0,
    }),
    [form],
  );

  const results = useMemo(() => calc(numeric), [numeric]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      nome: form.nome,
      categoria: form.categoria,
      linkModelo: form.linkModelo || undefined,
      custoRolo: Number(form.custoRolo),
      pesoRolo: Number(form.pesoRolo),
      pesoPeca: Number(form.pesoPeca),
      tempoMin: Number(form.tempoMin),
      quantidade: Number(form.quantidade),
      precoVenda: Number(form.precoVenda),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    // Deduct filament stock: pesoPeca * quantidade from selected filament
    if (form.filamentoId) {
      const gramas = parsed.data.pesoPeca * parsed.data.quantidade;
      abaterEstoqueFilamento(form.filamentoId, gramas);
    }
    addPortfolioProject({ ...parsed.data, id: crypto.randomUUID() });
    setForm(initialForm);
    toast.success("Projeto salvo no portfólio.");
  };

  const remove = (id: string) => removePortfolioProject(id);

  const totals = useMemo(() => {
    return projects.reduce(
      (acc, p) => {
        const r = calc(p);
        acc.lucro += r.lucroLiquido;
        acc.receita += r.receitaTotal;
        return acc;
      },
      { lucro: 0, receita: 0 },
    );
  }, [projects]);

  return (
    <div className="space-y-8">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Gerenciar Portfólio
          </h1>
          <p className="text-sm text-muted-foreground">
            Calculadora de custo para chaveiros e lotes de impressão.
          </p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Lucro acumulado
            </div>
            <div className="font-display text-xl font-bold filament-text">
              {brl(totals.lucro)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Projetos
            </div>
            <div className="font-display text-xl font-bold">{projects.length}</div>
          </div>
        </div>
      </div>

      {/* Form + Results */}
      <form
        onSubmit={submit}
        className="filament-top space-y-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome do Projeto" className="md:col-span-2">
            <Input
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              placeholder="Chaveiro logo Bambu"
              maxLength={100}
            />
          </Field>
          <Field label="Categoria" className="md:col-span-2">
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
          <Field label="Link do Modelo (MakerWorld/STL)" className="md:col-span-2">
            <Input
              value={form.linkModelo}
              onChange={(e) => setField("linkModelo", e.target.value)}
              placeholder="https://makerworld.com/en/models/..."
              type="url"
            />
          </Field>
          <Field label="Filamento (Rolo)" className="md:col-span-2">
            <Select
              value={form.filamentoId}
              onValueChange={(v) => setField("filamentoId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o rolo" />
              </SelectTrigger>
              <SelectContent>
                {filamentos.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} (Restam {f.pesoAtual}g)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <NumberField
            label="Custo do Rolo de Filamento (R$)"
            value={form.custoRolo}
            onChange={(v) => setField("custoRolo", v)}
            placeholder="120,00"
          />
          <NumberField
            label="Peso do Rolo (g)"
            value={form.pesoRolo}
            onChange={(v) => setField("pesoRolo", v)}
            placeholder="1000"
          />
          <NumberField
            label="Peso da Peça (g)"
            value={form.pesoPeca}
            onChange={(v) => setField("pesoPeca", v)}
            placeholder="6"
          />
          <NumberField
            label="Tempo de Impressão (min)"
            value={form.tempoMin}
            onChange={(v) => setField("tempoMin", v)}
            placeholder="35"
          />
          <NumberField
            label="Quantidade do Lote"
            value={form.quantidade}
            onChange={(v) => setField("quantidade", v)}
            placeholder="20"
            step="1"
          />
          <NumberField
            label="Preço de Venda Sugerido (R$)"
            value={form.precoVenda}
            onChange={(v) => setField("precoVenda", v)}
            placeholder="15,00"
          />
        </div>

        {/* Dynamic Results */}
        <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <ResultCard
            label="Custo Filamento /un."
            value={brl(results.custoFilamento)}
            accent="cyan"
          />
          <ResultCard
            label="Energia + Depreciação"
            value={brl(results.custoEnergia + results.custoDepreciacao)}
            accent="yellow"
          />
          <ResultCard
            label="Custo Total do Lote"
            value={brl(results.custoLote)}
            accent="pink"
          />
          <ResultCard
            label="Lucro Líquido"
            value={brl(results.lucroLiquido)}
            accent={results.lucroLiquido >= 0 ? "green" : "magenta"}
            emphasize
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="btn-filament gap-2 px-6">
            <Plus className="h-4 w-4" /> Salvar Projeto
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Projetos salvos</h2>
          <span className="text-xs text-muted-foreground">
            {projects.length} no total
          </span>
        </div>
        {projects.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhum projeto ainda. Calcule e salve seu primeiro lote acima.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Custo/un.</TableHead>
                <TableHead className="text-right">Custo lote</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const r = calc(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.linkModelo ? (
                        <a
                          href={p.linkModelo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          title={p.linkModelo}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ver modelo</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.quantidade}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(r.custoUnidade)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(r.custoLote)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(r.receitaTotal)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        r.lucroLiquido >= 0 ? "filament-text" : "text-destructive"
                      }`}
                    >
                      {brl(r.lucroLiquido)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(p.id)}
                        aria-label="Excluir projeto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

const ACCENT_COLORS: Record<string, string> = {
  cyan: "#5fa8a3",
  green: "#8aab6e",
  yellow: "#e0a93b",
  pink: "#d98ca0",
  magenta: "#8a3a52",
};

function ResultCard({
  label,
  value,
  accent,
  emphasize = false,
}: {
  label: string;
  value: string;
  accent: keyof typeof ACCENT_COLORS;
  emphasize?: boolean;
}) {
  const color = ACCENT_COLORS[accent];
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
      style={{ boxShadow: `0 8px 24px -16px ${color}` }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
      />
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 font-display font-bold tabular-nums ${
          emphasize ? "text-3xl" : "text-2xl"
        }`}
        style={emphasize ? undefined : { color }}
      >
        {emphasize ? <span className="filament-text">{value}</span> : value}
      </div>
    </div>
  );
}
