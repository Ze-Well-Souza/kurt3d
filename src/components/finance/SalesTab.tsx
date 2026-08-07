import { BarChart3, Coins, TrendingDown, TrendingUp, Wallet, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/SearchInput";
import { brl, cn } from "@/lib/utils";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import { KpiCard } from "./finance-shared";
import type { FinanceCtx } from "./use-finance-page-state";

export function SalesTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    search,
    setSearch,
    filteredVendas,
    periodFilteredVendas,
    periodPreset,
    installmentKpiMonthAnchor,
    periodLabel,
    totals,
    monthlySalesSeries,
  } = ctx;

  const salesPagination = usePagination(
    filteredVendas,
    `${search}|${periodPreset}|${installmentKpiMonthAnchor}`,
  );
  const margem = totals.receita > 0 ? (totals.lucro / totals.receita) * 100 : null;

  return (
    <div className="space-y-4">
      {/* ═══ Resumo do período: bruto, custos, despesas e líquido ═══ */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Resumo do período</h2>
          <Badge variant="secondary">
            Margem líquida: {margem === null ? "—" : `${margem.toFixed(1)}%`}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Coins className="h-4 w-4" />}
            label="Valor Bruto"
            value={brl(totals.receita)}
            color="var(--filament-cyan)"
            tooltip="Total recebido nas vendas finalizadas como “Kurtido e Vendido” no período."
          />
          <KpiCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Custo de Produção"
            value={brl(totals.custo)}
            color="var(--filament-yellow)"
            tooltip="Material + tempo de impressão das vendas do período."
          />
          <KpiCard
            icon={<Wrench className="h-4 w-4" />}
            label="Despesas Operacionais"
            value={brl(totals.despesasOperacionais)}
            color="var(--filament-magenta)"
            tooltip="Gastos do dia a dia no período (aluguel, energia, insumos etc.)."
          />
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Líquido Após Despesas"
            value={brl(totals.lucro)}
            color={totals.lucro >= 0 ? "var(--filament-green)" : "var(--filament-magenta)"}
            tooltip="Valor bruto menos custo de produção menos despesas operacionais."
          />
        </div>
      </div>

      {/* ═══ Comparativo mês a mês ═══ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Comparativo mês a mês</h2>
          <Badge variant="secondary">6 meses até {periodLabel}</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Valor Bruto</TableHead>
              <TableHead className="text-right">Custos</TableHead>
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
              <TableHead className="text-right">vs mês anterior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlySalesSeries.map((row, index) => {
              const prev = index > 0 ? monthlySalesSeries[index - 1] : null;
              const delta = prev ? row.liquido - prev.liquido : null;
              const pct =
                prev && prev.liquido !== 0 && delta !== null
                  ? (delta / Math.abs(prev.liquido)) * 100
                  : null;
              const isAnchor = row.key === installmentKpiMonthAnchor;
              return (
                <TableRow key={row.key} className={cn(isAnchor && "bg-muted/40")}>
                  <TableCell className={cn("font-medium", isAnchor && "font-semibold")}>
                    {row.label}
                    {isAnchor && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        (período ativo)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(row.receita)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl(row.custo)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {brl(row.despesas)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-semibold ${
                      row.liquido >= 0 ? "filament-text" : "text-destructive"
                    }`}
                  >
                    {brl(row.liquido)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {delta === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          delta >= 0 ? "text-green-600" : "text-destructive"
                        }`}
                      >
                        {delta >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {brl(delta)}
                        {pct !== null && ` (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ═══ Histórico de vendas do período ═══ */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Histórico de Vendas</h2>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar venda..." />
            <Badge variant="secondary">{filteredVendas.length} registros</Badge>
          </div>
        </div>
        {periodFilteredVendas.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda registrada no período selecionado. Para registrar uma venda, vá em
            Calculadora e Pedidos → aba Pedidos, arraste o pedido até &ldquo;Concluído&rdquo; e
            clique em &ldquo;Finalizar Destino&rdquo; → &ldquo;Kurtido e Vendido&rdquo;.
          </div>
        ) : (
          <>
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
                {salesPagination.pageRows.map((v) => {
                  const lucro = v.valor - v.custo;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.projectName}</TableCell>
                      <TableCell className="text-muted-foreground">{v.client}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(v.valor)}</TableCell>
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
            <PaginationBar
              page={salesPagination.page}
              totalPages={salesPagination.totalPages}
              total={salesPagination.total}
              pageSize={salesPagination.pageSize}
              onPageChange={salesPagination.setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
