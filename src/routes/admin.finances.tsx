import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, TrendingUp, DollarSign, Package, Plus, Trash2, AlertCircle, BookOpen } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { SearchInput } from "@/components/SearchInput";
import { listSnapshot, addManualExpense, removeExpense } from "@/lib/api/data.functions";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

const EXPENSE_CATEGORIES = ["Aluguel","Internet","Manutenção","Energia","Perda de Material","Transporte","Marketing","Outros"] as const;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  insumo: { label: "Insumo", color: "var(--filament-yellow)" },
  manual: { label: "Manual", color: "var(--filament-cyan)" },
  falha: { label: "Falha", color: "var(--filament-magenta)" },
};

function Finances() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["snapshot"], queryFn: () => listSnapshot() });
  const vendas = snap.data?.vendas ?? [];
  const orders = snap.data?.orders ?? [];
  const filamentos = snap.data?.filamentos ?? [];
  const expenses = snap.data?.expenses ?? [];

  const [search, setSearch] = useState("");
  const [showExpense, setShowExpense] = useState(false);
  const [expForm, setExpForm] = useState({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" });

  const mutateAddExp = useMutation({ mutationFn: (data: any) => addManualExpense({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Despesa adicionada."); setShowExpense(false); setExpForm({ descricao: "", valor: "", data: new Date().toISOString().slice(0, 10), categoria: "" }); } });
  const mutateRemoveExp = useMutation({ mutationFn: (id: string) => removeExpense({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["snapshot"] }); toast.success("Despesa removida."); } });

  const totals = useMemo(() => {
    const receita = vendas.reduce((s, v) => s + v.valor, 0);
    const custo = vendas.reduce((s, v) => s + v.custo, 0);
    const despesas = expenses.reduce((s, e) => s + e.valor, 0);
    const lucro = receita - custo - despesas;
    const depreciacaoAcumulada = vendas.reduce((s, v) => s + v.depreciacao, 0);
    return { receita, custo, lucro, depreciacaoAcumulada, despesas };
  }, [vendas, expenses]);

  // Stock summary
  const stockSummary = useMemo(() => {
    return filamentos.map((f) => ({
      nome: f.label ?? `[${f.sku}] ${f.marca} ${f.cor}`,
      used: f.pesoInicial - f.pesoAtual,
      remaining: f.pesoAtual,
      percent: f.pesoInicial > 0 ? ((f.pesoInicial - f.pesoAtual) / f.pesoInicial) * 100 : 0,
    }));
  }, [filamentos]);

  const despesasManuais = expenses.filter((e) => e.source === "manual").reduce((s, e) => s + e.valor, 0);
  const despesasFalha = expenses.filter((e) => e.source === "falha").reduce((s, e) => s + e.valor, 0);
  const despesasInsumos = expenses.filter((e) => e.source === "insumo").reduce((s, e) => s + e.valor, 0);

  const filteredVendas = useMemo(() => {
    if (!search.trim()) return vendas;
    const s = search.toLowerCase().trim();
    return vendas.filter((v) => v.projectName.toLowerCase().includes(s) || v.client.toLowerCase().includes(s));
  }, [vendas, search]);

  // Falha count
  const falhasCount = orders.filter((o) => o.status === "falha").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Finanças</h1>
        <p className="text-sm text-muted-foreground">
          Receita, custos e fundo de reserva de depreciação.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita Total"
          value={brl(totals.receita)}
          color="var(--filament-cyan)"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Lucro Líquido"
          value={brl(totals.lucro)}
          color={totals.lucro >= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Custo de Produção"
          value={brl(totals.custo)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<Wrench className="h-4 w-4" />}
          label="Despesas"
          value={brl(totals.despesas)}
          color="var(--filament-magenta)"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Perdas por Falha"
          value={brl(despesasFalha)}
          color="var(--filament-magenta)"
        />
      </div>

      {/* Depreciation Reserve Card */}
      <div className="filament-top rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Fundo de Reserva de Depreciação
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Valor acumulado para manutenções e peças da Bambu Lab A1. Esse dinheiro é
              separado de cada venda para garantir a longevidade das impressoras.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Acumulado
            </div>
            <div className="font-display text-3xl font-bold filament-text">
              {brl(totals.depreciacaoAcumulada)}
            </div>
          </div>
        </div>

        {/* Stock bars */}
        {stockSummary.length > 0 && (
          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Estoque de Filamentos
            </h3>
            {stockSummary.map((s) => (
              <div key={s.nome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.nome}</span>
                  <span className="text-muted-foreground">
                    {s.remaining}g restantes ({s.percent.toFixed(0)}% usado)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, s.percent)}%`,
                      background:
                        s.percent > 80
                          ? "var(--filament-magenta)"
                          : s.percent > 50
                            ? "var(--filament-yellow)"
                            : "var(--filament-green)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Despesas</h2>
          </div>
          <Button size="sm" className="btn-filament gap-2" onClick={() => setShowExpense(true)}><Plus className="h-4 w-4" />Nova despesa</Button>
        </div>
        {expenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhuma despesa registrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => {
                const src = SOURCE_LABELS[e.source] ?? { label: e.source, color: "#999" };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.descricao}</TableCell>
                    <TableCell>{e.categoria ? <Badge variant="secondary">{e.categoria}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant="outline" style={{ borderColor: src.color, color: src.color }}>{src.label}</Badge></TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{brl(e.valor)}</TableCell>
                    <TableCell>
                      {e.source !== "insumo" && (
                        <Button size="icon" variant="ghost" onClick={() => mutateRemoveExp.mutate(e.id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sales History Table */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Histórico de Vendas</h2>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar venda..." />
            <Badge variant="secondary">{filteredVendas.length} registros</Badge>
          </div>
        </div>
        {vendas.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada ainda. Finalize pedidos como &ldquo;Kurtido e
            Vendido&rdquo; na Fila de Pedidos.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor da Venda</TableHead>
                <TableHead className="text-right">Custo de Produção</TableHead>
                <TableHead className="text-right">Depreciação</TableHead>
                <TableHead className="text-right">Lucro Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendas.map((v) => {
                const lucro = v.valor - v.custo;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">{v.client}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(v.valor)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(v.custo)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(v.depreciacao)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        lucro >= 0 ? "filament-text" : "text-destructive"
                      }`}
                    >
                      {brl(lucro)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); mutateAddExp.mutate({ descricao: expForm.descricao.trim(), valor: Number(expForm.valor), data: expForm.data, categoria: expForm.categoria || null }); }}>
            <div className="grid gap-2"><Label>Descrição *</Label><Input value={expForm.descricao} onChange={(e) => setExpForm((s) => ({ ...s, descricao: e.target.value }))} required placeholder="Ex: Aluguel do mês, Internet..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Valor (R$) *</Label><Input type="number" min={0.01} step={0.01} value={expForm.valor} onChange={(e) => setExpForm((s) => ({ ...s, valor: e.target.value }))} required /></div>
              <div className="grid gap-2"><Label>Data</Label><Input type="date" value={expForm.data} onChange={(e) => setExpForm((s) => ({ ...s, data: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Categoria</Label>
              <Select value={expForm.categoria} onValueChange={(v) => setExpForm((s) => ({ ...s, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpense(false)}>Cancelar</Button>
              <Button type="submit" className="btn-filament" disabled={!expForm.descricao.trim() || !expForm.valor || mutateAddExp.isPending}>Adicionar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="filament-top border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span
          className="grid h-6 w-6 place-items-center rounded-md text-white"
          style={{ background: color }}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </Card>
  );
}
