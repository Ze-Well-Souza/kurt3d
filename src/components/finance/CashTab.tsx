import { Banknote, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { type PaymentHistorySourceFilter, type PaymentHistoryTypeFilter } from "./finance-shared";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { FinanceCtx } from "./use-finance-page-state";

export function CashTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    paymentHistorySourceFilter,
    setPaymentHistorySourceFilter,
    paymentHistoryTypeFilter,
    setPaymentHistoryTypeFilter,
    visibleFinanceHistoryRows,
    periodPreset,
    installmentKpiMonthAnchor,
  } = ctx;

  const historyPagination = usePagination(
    visibleFinanceHistoryRows,
    `${paymentHistorySourceFilter}|${paymentHistoryTypeFilter}|${periodPreset}|${installmentKpiMonthAnchor}`,
  );

  return (
    <div className="filament-top rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Histórico de Pagamentos</h2>
          <p className="text-xs text-muted-foreground">
            Cada parcial, quitação e estorno fica registrado como um evento separado para auditoria.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label className="text-[11px]">Origem</Label>
            <Select
              value={paymentHistorySourceFilter}
              onValueChange={(value) =>
                setPaymentHistorySourceFilter(value as PaymentHistorySourceFilter)
              }
            >
              <SelectTrigger className="h-8 min-w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="filamento">Filamentos</SelectItem>
                <SelectItem value="insumo">Insumos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[11px]">Evento</Label>
            <Select
              value={paymentHistoryTypeFilter}
              onValueChange={(value) =>
                setPaymentHistoryTypeFilter(value as PaymentHistoryTypeFilter)
              }
            >
              <SelectTrigger className="h-8 min-w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pagamento">Pagamentos</SelectItem>
                <SelectItem value="estorno">Estornos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {visibleFinanceHistoryRows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhum movimento encontrado para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyPagination.pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums text-xs text-muted-foreground">
                      {formatIsoDatePtBr(row.dataPagamento)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={row.kind === "filamento" ? "font-mono" : "font-medium"}>
                        {row.reference}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.numero ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.tipo === "pagamento"
                            ? "border-green-600/30 bg-green-50 text-green-700"
                            : "border-red-500/30 bg-red-50 text-red-700"
                        }
                      >
                        {row.tipo === "pagamento" ? "Pagamento" : "Estorno"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.formaPagamento === "a_vista" || row.numero === 1 ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]"
                        >
                          <Banknote className="h-3 w-3" /> À vista
                        </Badge>
                      ) : row.formaPagamento === "parcelado" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]"
                        >
                          <CreditCard className="h-3 w-3" /> Parcelado
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${
                        row.tipo === "pagamento" ? "text-green-700" : "text-destructive"
                      }`}
                    >
                      {row.tipo === "pagamento" ? "+" : "-"}
                      {brl(Math.abs(row.valor))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.observacao?.trim() ? row.observacao : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            total={historyPagination.total}
            pageSize={historyPagination.pageSize}
            onPageChange={historyPagination.setPage}
            onPageSizeChange={historyPagination.setPageSize}
          />
        </>
      )}
    </div>
  );
}
