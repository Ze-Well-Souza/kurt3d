import { AlertCircle, Banknote, CalendarClock, Check, CreditCard } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { brl } from "@/lib/utils";
import { formatIsoDatePtBr, todayIso } from "@/lib/domain/installments";
import {
  getInstallmentPaidAmount,
  getInstallmentRemainingAmount,
  isPartialInstallment,
  type InstallmentAuditMonthRow,
} from "@/lib/domain/finance-schedule";
import { formatMonthYearLabel, KpiCard } from "./finance-shared";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import type { FinanceCtx } from "./use-finance-page-state";

export function InstallmentsTab({ ctx }: { ctx: FinanceCtx }) {
  const {
    installmentKpiMonthAnchor,
    totalApagarNoMes,
    installmentKpis,
    scheduleEntries,
    installmentViewFilter,
    setInstallmentViewFilter,
    setRescheduleDialog,
    rescheduleDialog,
    mutateReschedule,
    highlightedInstallmentId,
    highlightedPaymentId,
    setPayDialog,
    payDialog,
    selectedFinanceInstallment,
    mutatePayInstallment,
    mutateSettlePayment,
    mutatePayInsumoInstallment,
    mutateSettleInsumoPayment,
    installmentAuditByMonth,
    currentMonthBreakdown,
  } = ctx;

  const schedulePagination = usePagination(
    scheduleEntries,
    `${installmentViewFilter}|${installmentKpiMonthAnchor}`,
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={`Conta de ${formatMonthYearLabel(installmentKpiMonthAnchor)} (a vencer)`}
          value={brl(totalApagarNoMes.total)}
          color={totalApagarNoMes.total > 0 ? "var(--filament-yellow)" : "var(--filament-green)"}
          tooltip="Quanto ainda falta pagar das parcelas com vencimento neste mês, independente de quando o pagamento acontece."
        />
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={`Caixa pago em ${formatMonthYearLabel(installmentKpiMonthAnchor)}`}
          value={brl(installmentKpis.pagoNoMes)}
          color="var(--filament-green)"
          tooltip="Dinheiro que realmente saiu da conta neste mês para pagar parcelas — inclusive parcelas de outros meses."
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Parcelas atrasadas (qtd · valor)"
          value={`${String(installmentKpis.atrasadas)} · ${brl(installmentKpis.atrasadasValor)}`}
          color={installmentKpis.atrasadas > 0 ? "var(--filament-magenta)" : "var(--filament-cyan)"}
          tooltip="Parcelas cujo vencimento já passou e ainda não foram totalmente pagas."
        />
      </div>

      {/* Installments Schedule */}
      <div className="filament-top rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">Cronograma de Parcelas</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setRescheduleDialog({ open: true, targetDate: "" })}
            >
              <CalendarClock className="h-3 w-3" /> Adiar vencimentos
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <Button
                size="sm"
                variant={installmentViewFilter === "pending" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("pending")}
              >
                Pendentes
              </Button>
              <Button
                size="sm"
                variant={installmentViewFilter === "paid" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("paid")}
              >
                Pagas
              </Button>
              <Button
                size="sm"
                variant={installmentViewFilter === "all" ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => setInstallmentViewFilter("all")}
              >
                Todas
              </Button>
            </div>
          </div>
        </div>
        <div className="border-b border-border px-6 py-3 text-xs text-muted-foreground">
          Ao clicar em <strong className="text-foreground">Pagar</strong>, voce pode registrar o
          valor total ou um valor parcial. A parcela so vira{" "}
          <strong className="text-foreground">Pago</strong> quando o saldo restante chegar a zero.
        </div>
        <div className="grid gap-4 border-b border-border px-6 py-5 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Auditoria por Mês de Vencimento
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {installmentAuditByMonth.length} mês(es)
              </Badge>
            </div>
            <div className="space-y-2">
              {installmentAuditByMonth.map((row: InstallmentAuditMonthRow) => (
                <div
                  key={row.dueMonth}
                  className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px]"
                >
                  <div className="col-span-2 font-mono font-semibold text-foreground">
                    {formatMonthYearLabel(row.dueMonth)}
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    Total: <span className="font-mono text-foreground">{row.countTotal}</span> ·{" "}
                    <span className="tabular-nums text-foreground">{brl(row.valorTotal)}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    Pagas: <span className="font-mono text-green-700">{row.countPaid}</span> ·{" "}
                    <span className="tabular-nums text-green-700">{brl(row.valorPago)}</span>
                  </div>
                  <div className="col-span-3 text-muted-foreground">
                    Pendentes: <span className="font-mono text-amber-700">{row.countPending}</span>{" "}
                    · <span className="tabular-nums text-amber-700">{brl(row.valorPendente)}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    {row.countPartial > 0 && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-50 text-[10px] text-amber-700"
                      >
                        {row.countPartial} parcial(is)
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {installmentAuditByMonth.length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                  Nenhuma parcela cadastrada.
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                O que tenho a pagar em {formatMonthYearLabel(installmentKpiMonthAnchor)}
              </div>
              <Badge
                variant={currentMonthBreakdown.vencimentos.length === 0 ? "secondary" : "outline"}
                className="text-[10px]"
              >
                {currentMonthBreakdown.vencimentos.length} vencimento(s)
              </Badge>
            </div>
            <div className="grid gap-2 text-[11px] sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">Total dev. mês</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums">
                  {brl(currentMonthBreakdown.valorTotalDevido)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">Já pago mês</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-green-700">
                  {brl(currentMonthBreakdown.valorJaPago)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-muted-foreground">A pagar (pendente)</div>
                <div className="mt-1 font-display text-lg font-bold tabular-nums text-amber-700">
                  {brl(currentMonthBreakdown.valorApagarNoMes)}
                </div>
              </div>
            </div>
            {currentMonthBreakdown.vencimentos.length > 0 && (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1">
                {currentMonthBreakdown.vencimentos.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-md border border-border bg-card/60 px-2 py-1.5 text-[10px]"
                  >
                    <div className="col-span-2 font-mono">{formatIsoDatePtBr(v.vencimento)}</div>
                    <div className="col-span-2 font-mono text-muted-foreground">
                      {v.dataCompra ? formatIsoDatePtBr(v.dataCompra) : "—"}
                    </div>
                    <div className="col-span-5 truncate">
                      <Badge variant="secondary" className="mr-1 text-[9px]">
                        {v.tipo === "filamento" ? "Filam." : "Insumo"}
                      </Badge>
                      <span className="text-foreground">{v.label || "Sem referência"}</span>
                    </div>
                    <div className="col-span-3 text-right tabular-nums">
                      {v.pago ? (
                        <span className="text-green-700">Pago {brl(v.pagoValor)}</span>
                      ) : (
                        <span className="text-amber-700">Falta {brl(v.restante)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {scheduleEntries.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {installmentViewFilter === "pending"
              ? "Nenhuma parcela pendente. Todos os pagamentos estão em dia."
              : installmentViewFilter === "paid"
                ? "Nenhuma parcela paga encontrada no período selecionado."
                : "Nenhuma parcela encontrada no período selecionado."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Data Compra</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Forma</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulePagination.pageRows.map(
                    ({ kind, inst, payment, label, overdue, progress, dataCompra }) => {
                      const totalInstallments =
                        (payment?.parcelas ?? progress.totalInstallments) || 1;
                      const totalPlanAmount = payment?.custoTotal ?? progress.totalAmount;
                      return (
                        <TableRow
                          key={inst.id}
                          className={
                            highlightedInstallmentId === inst.id ||
                            highlightedPaymentId === inst.paymentId
                              ? "bg-green-50/60"
                              : undefined
                          }
                        >
                          <TableCell className="font-mono text-xs">{`${inst.numero}/${totalInstallments}`}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              {label ? (
                                <span
                                  className={kind === "filamento" ? "font-mono" : "font-medium"}
                                >
                                  {label}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              <Badge
                                variant="secondary"
                                className={
                                  progress.totalAmount > 0 &&
                                  progress.paidAmount >= progress.totalAmount
                                    ? "border-green-600/20 bg-green-50 text-green-700"
                                    : progress.paidAmount > 0
                                      ? "border-amber-500/20 bg-amber-50 text-amber-700"
                                      : ""
                                }
                              >
                                {progress.totalAmount > 0 &&
                                progress.paidAmount >= progress.totalAmount
                                  ? `Quitado ${totalInstallments}/${totalInstallments}`
                                  : progress.paidAmount > 0
                                    ? `Pago ${progress.paidInstallments}/${totalInstallments}${isPartialInstallment(inst) ? ` + parcial ${brl(getInstallmentPaidAmount(inst))}` : ""}`
                                    : totalInstallments > 1
                                      ? `Em aberto 0/${totalInstallments}`
                                      : "Em aberto"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {payment && payment.parcelas > 1
                                ? `Parcela ${inst.numero}/${totalInstallments} · Total ${brl(totalPlanAmount)}`
                                : `Pagamento único · Total ${brl(totalPlanAmount)}`}
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums text-xs text-muted-foreground">
                            {dataCompra ? formatIsoDatePtBr(dataCompra) : "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs tabular-nums ${overdue ? "font-semibold text-destructive" : ""}`}
                            >
                              {formatIsoDatePtBr(inst.vencimento)}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums text-xs text-muted-foreground">
                            {inst.dataPagamento ? formatIsoDatePtBr(inst.dataPagamento) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <div>{brl(inst.valor)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Total {brl(totalPlanAmount)}
                            </div>
                            {!inst.pago && (
                              <div className="text-[10px] text-muted-foreground">
                                Falta {brl(getInstallmentRemainingAmount(inst))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {inst.pago ? (
                              <Badge className="gap-1 bg-green-600 text-[10px]">
                                <Check className="h-3 w-3" /> Pago
                              </Badge>
                            ) : isPartialInstallment(inst) ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/30 bg-amber-50 text-[10px] text-amber-700"
                              >
                                Parcial
                              </Badge>
                            ) : overdue ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Atrasado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!payment || payment.parcelas <= 1 ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]"
                              >
                                <Banknote className="h-3 w-3" /> À vista
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]"
                              >
                                <CreditCard className="h-3 w-3" />
                                Parcelado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                disabled={
                                  mutatePayInstallment.isPending ||
                                  mutateSettlePayment.isPending ||
                                  mutatePayInsumoInstallment.isPending ||
                                  mutateSettleInsumoPayment.isPending
                                }
                                title={
                                  inst.pago ? "Pagamento já confirmado" : "Registrar pagamento"
                                }
                                onClick={() =>
                                  setPayDialog({
                                    kind,
                                    installmentId: inst.id,
                                    dataPagamento: todayIso(),
                                    valorPago: String(getInstallmentRemainingAmount(inst)),
                                  })
                                }
                                style={{ visibility: inst.pago ? "hidden" : "visible" }}
                              >
                                <Check className="h-3 w-3" /> Pagar
                              </Button>
                              {payment && !inst.pago && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs"
                                  disabled={
                                    mutateSettlePayment.isPending ||
                                    mutateSettleInsumoPayment.isPending
                                  }
                                  onClick={() =>
                                    kind === "filamento"
                                      ? mutateSettlePayment.mutate({
                                          paymentId: payment.id,
                                          dataPagamento: todayIso(),
                                        })
                                      : mutateSettleInsumoPayment.mutate({
                                          paymentId: payment.id,
                                          dataPagamento: todayIso(),
                                        })
                                  }
                                >
                                  {kind === "filamento" ? "Quitar lote" : "Quitar compra"}
                                </Button>
                              )}
                              {!inst.pago && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  disabled={mutateReschedule.isPending}
                                  onClick={() => {
                                    const target = "2026-09-01";
                                    mutateReschedule.mutate([
                                      {
                                        installmentId: inst.id,
                                        kind,
                                        newVencimento: target,
                                      },
                                    ]);
                                  }}
                                  title="Mover vencimento para 01/09"
                                >
                                  <CalendarClock className="h-3 w-3" /> Adiar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationBar
              page={schedulePagination.page}
              totalPages={schedulePagination.totalPages}
              total={schedulePagination.total}
              pageSize={schedulePagination.pageSize}
              onPageChange={schedulePagination.setPage}
              onPageSizeChange={schedulePagination.setPageSize}
            />
          </>
        )}
      </div>

      <Dialog open={!!payDialog} onOpenChange={(open) => !open && setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4" /> Registrar pagamento
            </DialogTitle>
          </DialogHeader>
          {payDialog && selectedFinanceInstallment && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Parcela de{" "}
                <strong className="text-foreground">{brl(selectedFinanceInstallment.valor)}</strong>
                {" · "}
                ja pago:{" "}
                <strong className="text-foreground">
                  {brl(getInstallmentPaidAmount(selectedFinanceInstallment))}
                </strong>
                {" · "}
                restante:{" "}
                <strong className="text-foreground">
                  {brl(getInstallmentRemainingAmount(selectedFinanceInstallment))}
                </strong>
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Data do pagamento</Label>
                <Input
                  type="date"
                  value={payDialog.dataPagamento}
                  onChange={(e) =>
                    setPayDialog((current) =>
                      current ? { ...current, dataPagamento: e.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor a adicionar (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payDialog.valorPago}
                  onChange={(e) =>
                    setPayDialog((current) =>
                      current ? { ...current, valorPago: e.target.value } : current,
                    )
                  }
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!payDialog || !selectedFinanceInstallment) return;
                    const amount = Number(payDialog.valorPago);
                    if (
                      !Number.isFinite(amount) ||
                      amount <= 0 ||
                      amount > getInstallmentRemainingAmount(selectedFinanceInstallment)
                    ) {
                      return;
                    }
                    if (payDialog.kind === "filamento") {
                      mutatePayInstallment.mutate({
                        installmentId: payDialog.installmentId,
                        dataPagamento: payDialog.dataPagamento,
                        valorPago: amount,
                      });
                    } else {
                      mutatePayInsumoInstallment.mutate({
                        installmentId: payDialog.installmentId,
                        dataPagamento: payDialog.dataPagamento,
                        valorPago: amount,
                      });
                    }
                    setPayDialog(null);
                  }}
                  disabled={
                    mutatePayInstallment.isPending ||
                    mutatePayInsumoInstallment.isPending ||
                    !Number.isFinite(Number(payDialog.valorPago)) ||
                    Number(payDialog.valorPago) <= 0 ||
                    Number(payDialog.valorPago) >
                      getInstallmentRemainingAmount(selectedFinanceInstallment)
                  }
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={rescheduleDialog.open}
        onOpenChange={(open) => setRescheduleDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reagendar vencimentos
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione as parcelas pendentes abaixo para mover o vencimento para uma nova data.
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nova data de vencimento</Label>
              <Input
                type="date"
                value={rescheduleDialog.targetDate}
                onChange={(e) =>
                  setRescheduleDialog((prev) => ({ ...prev, targetDate: e.target.value }))
                }
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {scheduleEntries
                .filter(({ inst }) => !inst.pago)
                .map(({ kind, inst, label }) => (
                  <label
                    key={inst.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded"
                      defaultChecked={false}
                      data-installment-id={inst.id}
                      data-kind={kind}
                    />
                    <span className="font-mono text-muted-foreground">
                      {inst.vencimento.slice(5)}
                    </span>
                    <span className="flex-1 truncate">
                      {kind === "filamento" ? "🧵" : "📦"} {label || "—"}
                    </span>
                    <span className="tabular-nums">{brl(inst.valor)}</span>
                  </label>
                ))}
              {scheduleEntries.filter(({ inst }) => !inst.pago).length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhuma parcela pendente para reagendar.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialog({ open: false, targetDate: "" })}
            >
              Cancelar
            </Button>
            <Button
              disabled={!rescheduleDialog.targetDate || mutateReschedule.isPending}
              onClick={() => {
                const checks = document.querySelectorAll<HTMLInputElement>("[data-installment-id]");
                const selected: {
                  installmentId: string;
                  kind: "filamento" | "insumo";
                  newVencimento: string;
                }[] = [];
                checks.forEach((cb) => {
                  if (cb.checked) {
                    selected.push({
                      installmentId: cb.dataset.installmentId!,
                      kind: cb.dataset.kind as "filamento" | "insumo",
                      newVencimento: rescheduleDialog.targetDate,
                    });
                  }
                });
                if (selected.length === 0) {
                  toast.error("Selecione ao menos uma parcela.");
                  return;
                }
                mutateReschedule.mutate(selected);
              }}
            >
              {mutateReschedule.isPending
                ? "Reagendando..."
                : `Reagendar ${rescheduleDialog.targetDate ? `para ${rescheduleDialog.targetDate.split("-").reverse().join("/")}` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
