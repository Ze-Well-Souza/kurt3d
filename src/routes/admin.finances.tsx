import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, TrendingUp, DollarSign, Package, Plus, Trash2, AlertCircle, BookOpen, LayoutList, Table as TableIcon } from "lucide-react";
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
  const [stockView, setStockView] = useState<"list" | "table">("table");
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

  // Stock summary with full cost accounting per filament
  const stockSummary = useMemo(() => {
    return filamentos.map((f) => {
      const used = f.pesoInicial - f.pesoAtual;
      const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
      const valorConsumido = used * custoPorGrama;
      const valorRestante = f.pesoAtual * custoPorGrama;
      return {
        id: f.id,
        sku: f.sku,
        marca: f.marca,
        cor: f.cor,
        material: f.material,
        nome: f.label ?? `[${f.sku}] ${f.marca} ${f.cor}`,
        pesoInicial: f.pesoInicial,
        pesoAtual: f.pesoAtual,
        precoPago: f.precoPago,
        dataCompra: f.dataCompra,
        linkProduto: f.linkProduto ?? null,
        used,
        remaining: f.pesoAtual,
        percent: f.pesoInicial > 0 ? (used / f.pesoInicial) * 100 : 0,
        custoPorGrama,
        valorConsumido,
        valorRestante,
      };
    });
  }, [filamentos]);

  // Aggregated filament KPIs
  const filamentTotals = useMemo(() => {
    return stockSummary.reduce(
      (acc, s) => ({
        investido: acc.investido + s.precoPago,
        consumido: acc.consumido + s.valorConsumido,
        restante: acc.restante + s.valorRestante,
        gramasConsumidos: acc.gramasConsumidos + s.used,
        gramasRestantes: acc.gramasRestantes + s.remaining,
      }),
      { investido: 0, consumido: 0, restante: 0, gramasConsumidos: 0, gramasRestantes: 0 },
    );
  }, [stockSummary]);

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

      {/* Manual / Como funciona */}
      <Accordion type="single" collapsible className="filament-top rounded-2xl border border-border bg-card px-6">
        <AccordionItem value="manual" className="border-0">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" style={{ color: "var(--filament-cyan)" }} />
              <span className="font-display text-base font-semibold">Como funciona o seu Financeiro (manual rápido)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-sm text-muted-foreground">
            <div className="space-y-5 leading-relaxed">
              <p>
                Este módulo calcula o seu <strong className="text-foreground">lucro real</strong> a partir de três entradas:
                vendas finalizadas, despesas registradas e o custo de produção de cada peça.
              </p>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-cyan)" }}>
                  1. Receita Total (entradas)
                </h4>
                <p>
                  Só conta como receita quando você <strong className="text-foreground">finaliza um pedido</strong> em{" "}
                  <em>Calculadora e Pedidos → coluna Concluído → botão Finalizar → "Kurtido e Vendido"</em> e informa o
                  valor recebido. ⚠️ Apenas arrastar o card para "Concluído" no Kanban <strong>não</strong> gera receita —
                  isso é só o status de impressão.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-magenta)" }}>
                  2. Despesas (saídas)
                </h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong className="text-foreground">Insumo</strong> — todo item cadastrado em <em>Estoque → Outros Insumos</em> vira despesa automática com o valor pago.</li>
                  <li><strong className="text-foreground">Manual</strong> — despesas fixas (aluguel, internet, marketing) adicionadas pelo botão "Nova despesa".</li>
                  <li><strong className="text-foreground">Falha</strong> — pedidos finalizados como "Falha de Impressão" geram despesa automática com o custo do filamento desperdiçado.</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-yellow)" }}>
                  3. Custo de Produção (por venda)
                </h4>
                <p>
                  Calculado peça a peça com a fórmula:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    filamento consumido (R$/g × g) + energia (kWh × tarifa) + depreciação (R$/h) + custo fixo por unidade
                  </code>. Esses parâmetros vêm de <em>Configurações</em>.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground" style={{ color: "var(--filament-green)" }}>
                  4. Lucro Líquido (resultado)
                </h4>
                <p className="rounded-md bg-muted/50 p-3 font-mono text-xs text-foreground">
                  Lucro = Receita Total − Custo de Produção − Despesas (insumos + manuais + falhas)
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-2 font-semibold text-foreground">Exemplo prático</h4>
                <ul className="ml-4 list-disc space-y-1 text-xs">
                  <li>Você comprou 1 rolo PLA por <strong>R$ 120</strong> e 1 frasco de álcool por <strong>R$ 25</strong>.</li>
                  <li>→ Despesas automáticas: <strong>R$ 145</strong> (origem Insumo).</li>
                  <li>Vendeu 10 chaveiros por <strong>R$ 150</strong> (Kurtido e Vendido).</li>
                  <li>→ Receita: <strong>R$ 150</strong>. Custo calculado (filamento + energia + depreciação): <strong>R$ 18</strong>.</li>
                  <li>→ <strong className="filament-text">Lucro Líquido = 150 − 18 − 145 = −R$ 13</strong> (no vermelho até diluir o investimento do rolo nas próximas vendas).</li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Dica: o rolo de filamento é despesa única no mês da compra, mas rende ~166 chaveiros de 6g. A partir da
                  segunda dúzia de vendas o lucro fica positivo.
                </p>
              </div>

              <div>
                <h4 className="mb-1 font-semibold text-foreground">Checklist diário</h4>
                <ol className="ml-4 list-decimal space-y-1 text-xs">
                  <li>Cadastrou compra de filamento ou insumo? → vai direto para Despesas.</li>
                  <li>Imprimiu e entregou um pedido? → finalize como "Kurtido e Vendido" com o valor recebido.</li>
                  <li>Print falhou? → finalize como "Falha de Impressão" para contabilizar a perda.</li>
                  <li>Pagou algo fora do estoque (luz, internet)? → "Nova despesa" aqui em Finanças.</li>
                </ol>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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

      {/* Filament Investment KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Investido em Filamentos"
          value={brl(filamentTotals.investido)}
          color="var(--filament-cyan)"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Filamento em Estoque"
          value={brl(filamentTotals.restante)}
          color="var(--filament-green)"
        />
        <KpiCard
          icon={<Wrench className="h-4 w-4" />}
          label="Filamento Consumido"
          value={brl(filamentTotals.consumido)}
          color="var(--filament-yellow)"
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Estoque Físico Restante"
          value={`${filamentTotals.gramasRestantes.toFixed(0)} g`}
          color="var(--filament-pink)"
        />
      </div>

      {/* Depreciation Reserve + Filament Stock (with list/table toggle) */}
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

        {/* Filament Stock with list/table toggle */}
        {stockSummary.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Estoque de Filamentos
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stockSummary.length} rolo(s) · {brl(filamentTotals.investido)} investidos ·{" "}
                  {brl(filamentTotals.consumido)} consumidos
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                <Button
                  size="sm"
                  variant={stockView === "list" ? "default" : "ghost"}
                  className="h-7 gap-1.5 px-3 text-xs"
                  onClick={() => setStockView("list")}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Lista
                </Button>
                <Button
                  size="sm"
                  variant={stockView === "table" ? "default" : "ghost"}
                  className="h-7 gap-1.5 px-3 text-xs"
                  onClick={() => setStockView("table")}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Tabela
                </Button>
              </div>
            </div>

            {stockView === "list" ? (
              <div className="space-y-3">
                {stockSummary.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-border bg-card/60 p-4"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{s.nome}</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {s.sku}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
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
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {s.remaining}g restantes ({s.percent.toFixed(0)}% usado)
                        </span>
                        <span className="tabular-nums">
                          {s.used.toFixed(0)}g × {brl(s.custoPorGrama)}/g ={" "}
                          <strong className="text-foreground">{brl(s.valorConsumido)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <StatChip label="Investido" value={brl(s.precoPago)} />
                      <StatChip label="Consumido" value={brl(s.valorConsumido)} />
                      <StatChip label="Em estoque" value={brl(s.valorRestante)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Marca / Cor</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Peso Inicial</TableHead>
                      <TableHead className="text-right">Peso Atual</TableHead>
                      <TableHead className="text-right">% Usado</TableHead>
                      <TableHead className="text-right">Custo/g</TableHead>
                      <TableHead className="text-right">Investido</TableHead>
                      <TableHead className="text-right">Consumido</TableHead>
                      <TableHead className="text-right">Em Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSummary.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                        <TableCell className="font-medium">
                          {s.marca} — {s.cor}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.material}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {s.pesoInicial}g
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {s.pesoAtual}g
                        </TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          style={{
                            color:
                              s.percent > 80
                                ? "var(--filament-magenta)"
                                : s.percent > 50
                                  ? "var(--filament-yellow)"
                                  : "var(--filament-green)",
                          }}
                        >
                          {s.percent.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(s.custoPorGrama)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {brl(s.precoPago)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {brl(s.valorConsumido)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold filament-text">
                          {brl(s.valorRestante)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={7} className="text-right text-xs font-semibold">
                        Totais ({stockSummary.length} rolos)
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {brl(filamentTotals.investido)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-muted-foreground">
                        {brl(filamentTotals.consumido)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold filament-text">
                        {brl(filamentTotals.restante)}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            )}
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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
