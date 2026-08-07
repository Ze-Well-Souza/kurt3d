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
import { brl } from "@/lib/utils";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { FinanceCtx } from "./use-finance-page-state";

export function SalesTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    search,
    setSearch,
    filteredVendas,
    periodFilteredVendas,
    periodPreset,
    installmentKpiMonthAnchor,
  } = ctx;

  const salesPagination = usePagination(
    filteredVendas,
    `${search}|${periodPreset}|${installmentKpiMonthAnchor}`,
  );

  return (
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
          Nenhuma venda registrada no período selecionado. Finalize pedidos como &ldquo;Kurtido e
          Vendido&rdquo; na Fila de Pedidos.
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
  );
}
