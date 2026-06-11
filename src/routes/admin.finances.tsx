import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Wrench, TrendingUp, DollarSign, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVendas, useOrders, useFilamentos } from "@/lib/store";

export const Route = createFileRoute("/admin/finances")({
  component: Finances,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Finances() {
  const vendas = useVendas();
  const orders = useOrders();
  const filamentos = useFilamentos();

  const totals = useMemo(() => {
    const receita = vendas.reduce((s, v) => s + v.valor, 0);
    const custo = vendas.reduce((s, v) => s + v.custo, 0);
    const lucro = receita - custo;
    const depreciacaoAcumulada = vendas.reduce((s, v) => s + v.depreciacao, 0);
    return { receita, custo, lucro, depreciacaoAcumulada };
  }, [vendas]);

  // Stock summary
  const stockSummary = useMemo(() => {
    return filamentos.map((f) => ({
      nome: f.nome,
      used: f.pesoInicial - f.pesoAtual,
      remaining: f.pesoAtual,
      percent: f.pesoInicial > 0 ? ((f.pesoInicial - f.pesoAtual) / f.pesoInicial) * 100 : 0,
    }));
  }, [filamentos]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          label="Falhas Registradas"
          value={String(falhasCount)}
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

      {/* Sales History Table */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Histórico de Vendas</h2>
          <Badge variant="secondary">{vendas.length} registros</Badge>
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
              {vendas.map((v) => {
                const lucro = v.valor - v.custo;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.project}</TableCell>
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
