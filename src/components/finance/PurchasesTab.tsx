import { Tags } from "lucide-react";
import { useMemo } from "react";
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
import { brl } from "@/lib/utils";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { usePagination } from "@/lib/hooks/use-pagination";
import { PaginationBar } from "@/components/shared/pagination-bar";
import type { FinanceCtx } from "./use-finance-page-state";

export function PurchasesTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    purchaseBrandFilter,
    setPurchaseBrandFilter,
    purchaseMaterialFilter,
    setPurchaseMaterialFilter,
    purchaseBrands,
    purchaseMaterials,
    purchaseAnalysis,
    filteredPurchaseAnalysis,
    periodPreset,
    installmentKpiMonthAnchor,
  } = ctx;

  const sortedPurchases = useMemo(
    () =>
      [...filteredPurchaseAnalysis].sort((a, b) =>
        (b.dataCompra ?? "").localeCompare(a.dataCompra ?? ""),
      ),
    [filteredPurchaseAnalysis],
  );

  const purchasesPagination = usePagination(
    sortedPurchases,
    `${purchaseBrandFilter}|${purchaseMaterialFilter}|${periodPreset}|${installmentKpiMonthAnchor}`,
  );

  return (
    <>
      <div className="filament-top flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4" style={{ color: "var(--filament-cyan)" }} />
          <span className="text-sm font-semibold">Compras de Filamento</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={purchaseBrandFilter} onValueChange={setPurchaseBrandFilter}>
            <SelectTrigger className="h-7 min-w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              {purchaseBrands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={purchaseMaterialFilter} onValueChange={setPurchaseMaterialFilter}>
            <SelectTrigger className="h-7 min-w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os materiais</SelectItem>
              {purchaseMaterials.map((material) => (
                <SelectItem key={material} value={material}>
                  {material}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {purchaseAnalysis.count} compras · média{" "}
            {purchaseAnalysis.count > 0 ? brl(purchaseAnalysis.average) : "—"}
          </Badge>
          {purchaseAnalysis.count > 0 && (
            <Badge
              variant="outline"
              className={`text-[10px] ${purchaseAnalysis.delta <= 0 ? "border-green-500/30 bg-green-50 text-green-700" : "border-red-500/30 bg-red-50 text-red-700"}`}
            >
              {purchaseAnalysis.delta <= 0
                ? `${brl(Math.abs(purchaseAnalysis.delta))} abaixo`
                : `${brl(Math.abs(purchaseAnalysis.delta))} acima`}
            </Badge>
          )}
        </div>
      </div>

      <div className="filament-top rounded-2xl border border-border bg-card">
        {sortedPurchases.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma compra de filamento no período selecionado.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Data Compra</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchasesPagination.pageRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="text-xs">{item.marca || "—"}</TableCell>
                    <TableCell className="text-xs">{item.material || "—"}</TableCell>
                    <TableCell className="tabular-nums text-xs text-muted-foreground">
                      {item.dataCompra ? formatIsoDatePtBr(item.dataCompra) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {brl(item.precoPago)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={purchasesPagination.page}
              totalPages={purchasesPagination.totalPages}
              total={purchasesPagination.total}
              pageSize={purchasesPagination.pageSize}
              onPageChange={purchasesPagination.setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
