import { Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { brl } from "@/lib/utils";
import { formatMonthYearLabel } from "./finance-shared";
import { MONTH_BILLS_TITLES, type FinanceCtx } from "./use-finance-page-state";

/**
 * Modal com a lista de parcelas que vencem no mes de referencia para a
 * categoria clicada no cartao principal (Filamentos, Insumos ou Impressora),
 * com opcoes de exportacao em CSV e PDF da propria lista.
 */
export function MonthBillsDialog({ ctx }: { ctx: FinanceCtx }) {
  const {
    monthBillsDialog,
    setMonthBillsDialog,
    monthBillsRows,
    exportMonthBillsCsv,
    exportMonthBillsPdf,
    installmentKpiMonthAnchor,
  } = ctx;

  const open = monthBillsDialog !== null;
  const title = monthBillsDialog ? MONTH_BILLS_TITLES[monthBillsDialog] : "";
  const isFilamento = monthBillsDialog === "filamentos";
  const monthLabel = formatMonthYearLabel(installmentKpiMonthAnchor);
  const total = monthBillsRows.reduce((sum, row) => sum + row.valor, 0);
  const aPagar = monthBillsRows.reduce((sum, row) => sum + row.restante, 0);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setMonthBillsDialog(null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Contas de {title} — <span className="capitalize">{monthLabel}</span>
          </DialogTitle>
          <DialogDescription>
            Parcelas com vencimento neste mês. Use os botões abaixo para exportar a lista.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          <span>
            <strong>{monthBillsRows.length}</strong> parcela(s)
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            Total: <strong>{brl(total)}</strong>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className={aPagar > 0 ? "text-amber-600" : "text-green-600"}>
            A pagar: <strong>{brl(aPagar)}</strong>
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
          {monthBillsRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhuma parcela de {title.toLowerCase()} com vencimento em {monthLabel}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  {isFilamento && <th className="px-3 py-2 text-left">Cor</th>}
                  <th className="px-3 py-2 text-left">Data Compra</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthBillsRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.parcelaTotal > 1
                          ? `Parcela ${row.numero}/${row.parcelaTotal}`
                          : "À vista"}
                      </div>
                    </td>
                    {isFilamento && <td className="px-3 py-2">{row.cor ?? "—"}</td>}
                    <td className="px-3 py-2 tabular-nums">
                      {row.dataCompra ? formatIsoDatePtBr(row.dataCompra) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatIsoDatePtBr(row.vencimento)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {brl(row.restante > 0 ? row.restante : row.valor)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.pago ? (
                        <Badge variant="secondary" className="bg-green-600/10 text-green-700">
                          Paga
                        </Badge>
                      ) : row.restante < row.valor ? (
                        <Badge variant="secondary" className="bg-sky-600/10 text-sky-700">
                          Parcial
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-600/10 text-amber-700">
                          Pendente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportMonthBillsCsv}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportMonthBillsPdf}>
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
