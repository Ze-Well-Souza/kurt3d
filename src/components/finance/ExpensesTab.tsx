import { Download, Plus, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { EXPENSE_CATEGORIES, SOURCE_LABELS } from "./finance-shared";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { FinanceCtx } from "./use-finance-page-state";

export function ExpensesTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    totals,
    despesasInsumosOperacionais,
    despesasManuais,
    exportCostCsv,
    setShowExpense,
    showExpense,
    expForm,
    setExpForm,
    mutateAddExp,
    mutateRemoveExp,
    classifiedExpenses,
    periodPreset,
    installmentKpiMonthAnchor,
  } = ctx;

  const expensesPagination = usePagination(
    classifiedExpenses,
    `${periodPreset}|${installmentKpiMonthAnchor}`,
  );

  return (
    <>
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">Saídas Financeiras</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">Operacionais: {brl(totals.despesasOperacionais)}</Badge>
              <Badge variant="secondary">Investimentos: {brl(totals.investimentos)}</Badge>
              <Badge variant="secondary">
                Insumos operacionais: {brl(despesasInsumosOperacionais)}
              </Badge>
              <Badge variant="secondary">Manuais: {brl(despesasManuais)}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={exportCostCsv}
            >
              <Download className="h-3 w-3" /> Exportar Excel
            </Button>
            <Button size="sm" className="btn-filament gap-2" onClick={() => setShowExpense(true)}>
              <Plus className="h-4 w-4" />
              Nova despesa
            </Button>
          </div>
        </div>
        {classifiedExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhuma saída registrada.
          </div>
        ) : (
          <>
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
                {expensesPagination.pageRows.map((e) => {
                  const src = SOURCE_LABELS[e.source] ?? { label: e.source, color: "#999" };
                  const categoryLabel =
                    e.categoria ??
                    (e.financialClass === "investimento"
                      ? "Investimento / Imobilizado"
                      : "Despesa Operacional");
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: src.color, color: src.color }}
                        >
                          {src.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatIsoDatePtBr(e.data)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {brl(e.valor)}
                      </TableCell>
                      <TableCell>
                        {e.source !== "insumo" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => mutateRemoveExp.mutate(e.id)}
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <PaginationBar
              page={expensesPagination.page}
              totalPages={expensesPagination.totalPages}
              total={expensesPagination.total}
              pageSize={expensesPagination.pageSize}
              onPageChange={expensesPagination.setPage}
            />
          </>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutateAddExp.mutate({
                descricao: expForm.descricao.trim(),
                valor: Number(expForm.valor),
                data: expForm.data,
                categoria: expForm.categoria || null,
              });
            }}
          >
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Input
                value={expForm.descricao}
                onChange={(e) => setExpForm((s) => ({ ...s, descricao: e.target.value }))}
                required
                placeholder="Ex: Aluguel do mês, Internet..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={expForm.valor}
                  onChange={(e) => setExpForm((s) => ({ ...s, valor: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={expForm.data}
                  onChange={(e) => setExpForm((s) => ({ ...s, data: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={expForm.categoria}
                onValueChange={(v) => setExpForm((s) => ({ ...s, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpense(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="btn-filament"
                disabled={!expForm.descricao.trim() || !expForm.valor || mutateAddExp.isPending}
              >
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
