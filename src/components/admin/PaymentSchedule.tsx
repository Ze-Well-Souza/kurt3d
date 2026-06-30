import { useState } from "react";
import { Banknote, Check, CreditCard, Pencil, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIsoDatePtBr, todayIso } from "@/lib/domain/installments";
import type { Filamento, FilamentoPayment, FilamentoPaymentInstallment } from "@/lib/domain/types";

type PaymentScheduleProps = {
  payment: FilamentoPayment;
  installments: FilamentoPaymentInstallment[];
  batchFilamentos: Filamento[];
  brl: (n: number) => string;
  onPay: (input: { installmentId: string; dataPagamento: string; valorPago?: number; observacao?: string }) => Promise<unknown> | void;
  onRevert: (installmentId: string) => Promise<unknown> | void;
  onSettle: (input: { paymentId: string; totalPago?: number; dataPagamento?: string }) => Promise<unknown> | void;
  onUpdateInst: (input: { installmentId: string; vencimento?: string; valor?: number; observacao?: string }) => Promise<unknown> | void;
  isPending: boolean;
};

export function PaymentSchedule({
  payment,
  installments,
  batchFilamentos,
  brl,
  onPay,
  onRevert,
  onSettle,
  onUpdateInst,
  isPending,
}: PaymentScheduleProps) {
  const [payDialog, setPayDialog] = useState<{
    installmentId: string;
    dataPagamento: string;
    valorPago: string;
  } | null>(null);
  const [settleDialog, setOpenSettle] = useState<{
    open: boolean;
    totalPago: string;
    dataPagamento: string;
  }>({ open: false, totalPago: "", dataPagamento: todayIso() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVencimento, setEditVencimento] = useState("");
  const [editObservacao, setEditObservacao] = useState("");

  const sorted = [...installments].sort((a, b) => a.numero - b.numero);
  const paid = sorted.filter((i) => i.pago);
  const pending = sorted.filter((i) => !i.pago);
  const totalPago = paid.reduce((s, i) => s + (i.valorPago ?? i.valor), 0);
  const totalPendente = pending.reduce((s, i) => s + i.valor, 0);
  const percent = payment.parcelas > 0 ? (paid.length / payment.parcelas) * 100 : 0;
  const today = todayIso();

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {payment.formaPagamento === "parcelado" ? (
            <CreditCard className="h-4 w-4 text-blue-500" />
          ) : (
            <Banknote className="h-4 w-4 text-green-600" />
          )}
          <h4 className="font-display text-sm font-semibold">
            {payment.formaPagamento === "parcelado"
              ? `Parcelamento · ${payment.parcelas}×`
              : "Pagamento à vista"}
          </h4>
        </div>
        {batchFilamentos.length > 1 && (
          <span className="text-[10px] text-muted-foreground">
            Lote: {batchFilamentos.map((f) => f.sku).join(", ")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <div>
          <div className="text-muted-foreground">Custo total</div>
          <div className="font-semibold tabular-nums">{brl(payment.custoTotal)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Pago</div>
          <div className="font-semibold tabular-nums text-green-600">{brl(totalPago)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Pendente</div>
          <div className="font-semibold tabular-nums text-amber-600">{brl(totalPendente)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Progresso</div>
          <div className="font-semibold tabular-nums">{percent.toFixed(0)}%</div>
        </div>
      </div>
      <Progress value={percent} />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Data Pgto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((i) => {
              const isEditing = editingId === i.id;
              const overdue = !i.pago && i.vencimento < today;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.numero}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editVencimento}
                        onChange={(e) => setEditVencimento(e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className={`text-xs tabular-nums ${overdue ? "font-semibold text-destructive" : ""}`}>
                        {formatIsoDatePtBr(i.vencimento)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{brl(i.valor)}</TableCell>
                  <TableCell className="text-center">
                    {i.pago ? (
                      <Badge className="gap-1 bg-green-600 text-[10px]">
                        <Check className="h-3 w-3" /> Pago
                      </Badge>
                    ) : overdue ? (
                      <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs text-muted-foreground">
                    {i.dataPagamento ? formatIsoDatePtBr(i.dataPagamento) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600"
                            title="Salvar"
                            disabled={isPending}
                            onClick={async () => {
                              await onUpdateInst({
                                installmentId: i.id,
                                vencimento: editVencimento,
                                observacao: editObservacao,
                              });
                              setEditingId(null);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Cancelar"
                            onClick={() => setEditingId(null)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {!i.pago && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600"
                                title="Marcar como pago"
                                disabled={isPending}
                                onClick={() =>
                                  setPayDialog({
                                    installmentId: i.id,
                                    dataPagamento: new Date().toISOString().slice(0, 10),
                                    valorPago: String(i.valor),
                                  })
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Editar vencimento"
                                disabled={isPending}
                                onClick={() => {
                                  setEditingId(i.id);
                                  setEditVencimento(i.vencimento);
                                  setEditObservacao(i.observacao ?? "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {i.pago && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-amber-600"
                              title="Desfazer pagamento"
                              disabled={isPending}
                              onClick={() => onRevert(i.id)}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pending.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            disabled={isPending}
            onClick={() =>
              setOpenSettle({
                open: true,
                totalPago: String(totalPendente.toFixed(2)),
                dataPagamento: new Date().toISOString().slice(0, 10),
              })
            }
          >
            <Check className="h-3.5 w-3.5" /> Quitar tudo
          </Button>
        </div>
      )}

      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4" /> Marcar como pago
            </DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Data do pagamento</Label>
                <Input
                  type="date"
                  value={payDialog.dataPagamento}
                  onChange={(e) => setPayDialog({ ...payDialog, dataPagamento: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor pago (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payDialog.valorPago}
                  onChange={(e) => setPayDialog({ ...payDialog, valorPago: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!payDialog) return;
                    await onPay({
                      installmentId: payDialog.installmentId,
                      dataPagamento: payDialog.dataPagamento,
                      valorPago: Number(payDialog.valorPago) || undefined,
                    });
                    setPayDialog(null);
                  }}
                  disabled={isPending}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={settleDialog.open} onOpenChange={(o) => setOpenSettle((s) => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Check className="h-4 w-4" /> Quitar todas as parcelas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pending.length} parcela(s) pendente(s) serão marcadas como pagas.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Data do pagamento</Label>
              <Input
                type="date"
                value={settleDialog.dataPagamento}
                onChange={(e) => setOpenSettle((s) => ({ ...s, dataPagamento: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total pago (R$) — opcional</Label>
              <Input
                type="number"
                step="0.01"
                value={settleDialog.totalPago}
                onChange={(e) => setOpenSettle((s) => ({ ...s, totalPago: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenSettle((s) => ({ ...s, open: false }))}>Cancelar</Button>
              <Button
                onClick={async () => {
                  await onSettle({
                    paymentId: payment.id,
                    dataPagamento: settleDialog.dataPagamento,
                    totalPago: Number(settleDialog.totalPago) > 0 ? Number(settleDialog.totalPago) : undefined,
                  });
                  setOpenSettle({ open: false, totalPago: "", dataPagamento: new Date().toISOString().slice(0, 10) });
                }}
                disabled={isPending}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
