import { MessageCircle, Printer, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { brl } from "@/lib/utils";
import { saveReceipt } from "@/lib/api/data.functions";
import { openPrintSaleReceipt, openSaleReceiptWhatsApp } from "@/lib/domain/sale-receipt-print";
import type { OrcamentosCtx } from "./use-orcamentos-page-state";

export function ReceiptDialog({ ctx }: { ctx: OrcamentosCtx }) {
  const { receiptDialog, setReceiptDialog, settingsData } = ctx;
  const q = receiptDialog.quote;

  async function buildReceiptItems() {
    if (!q) return null;
    const items = q.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));
    const total = items.reduce((s, i) => s + i.subtotal, 0) * (1 - (q.discountPercent ?? 0) / 100);
    const result = await saveReceipt({
      data: {
        type: "sale",
        clientName: q.clientName,
        items,
        total,
        docType: receiptDialog.docType,
        docNumber: receiptDialog.docNumber || undefined,
        studioDocType: receiptDialog.studioDocType,
        studioDocNumber: receiptDialog.studioDocNumber || undefined,
        formaPagamento: receiptDialog.formaPagamento || undefined,
        observacao: q.notes || undefined,
        paid: receiptDialog.paid,
        sourceType: "quote",
        sourceId: q.id,
        discountPercent: q.discountPercent ?? undefined,
      },
    });
    if (!result.ok) {
      toast.error("Erro ao salvar recibo.");
      return null;
    }
    return { items, receiptNumber: result.receiptNumber };
  }

  async function handleWhatsApp() {
    if (!q) return;
    const saved = await buildReceiptItems();
    if (!saved) return;
    openSaleReceiptWhatsApp({
      clientName: q.clientName,
      items: saved.items,
      docType: receiptDialog.docType,
      docNumber: receiptDialog.docNumber,
      studioDocType: receiptDialog.studioDocType,
      studioDocNumber: receiptDialog.studioDocNumber,
      formaPagamento: receiptDialog.formaPagamento || undefined,
      dataRecebimento: receiptDialog.dataRecebimento || undefined,
      discountPercent: q.discountPercent ?? undefined,
      observacao: q.notes ?? undefined,
      studioNome: settingsData?.studioNome ?? "Kurti 3D",
      whatsappNumero: settingsData?.whatsappNumero ?? "",
      clientPhone: receiptDialog.clientPhone || undefined,
      paid: receiptDialog.paid || undefined,
      receiptNumber: saved.receiptNumber,
    });
  }

  async function handlePrint() {
    if (!q) return;
    const saved = await buildReceiptItems();
    if (!saved) return;
    openPrintSaleReceipt({
      clientName: q.clientName,
      items: saved.items,
      docType: receiptDialog.docType,
      docNumber: receiptDialog.docNumber,
      studioDocType: receiptDialog.studioDocType,
      studioDocNumber: receiptDialog.studioDocNumber,
      formaPagamento: receiptDialog.formaPagamento || undefined,
      dataRecebimento: receiptDialog.dataRecebimento || undefined,
      discountPercent: q.discountPercent ?? undefined,
      observacao: q.notes ?? undefined,
      studioNome: settingsData?.studioNome ?? "Kurti 3D",
      whatsappNumero: settingsData?.whatsappNumero ?? "",
      clientPhone: receiptDialog.clientPhone || undefined,
      paid: receiptDialog.paid || undefined,
      receiptNumber: saved.receiptNumber,
    });
    setReceiptDialog((prev) => ({ ...prev, open: false }));
  }

  return (
    <Dialog
      open={receiptDialog.open}
      onOpenChange={(open) => setReceiptDialog((prev) => ({ ...prev, open }))}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Gerar Recibo de Venda
          </DialogTitle>
        </DialogHeader>
        {q && (
          <div className="space-y-4">
            {/* Read-only summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-semibold">{q.clientName}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="font-medium">{q.items.length} item(ns)</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-lg font-bold filament-text">{brl(q.total)}</span>
              </div>
            </div>

            {/* Document type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Documento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.docType === "cnpj" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, docType: "cnpj" }))}
                >
                  CNPJ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.docType === "cpf" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, docType: "cpf" }))}
                >
                  CPF
                </Button>
              </div>
            </div>

            {/* Document number */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Número do {receiptDialog.docType === "cnpj" ? "CNPJ" : "CPF"}
              </Label>
              <Input
                value={receiptDialog.docNumber}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, docNumber: e.target.value }))
                }
                placeholder={
                  receiptDialog.docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
            </div>

            {/* Kurt3D document info */}
            <div className="space-y-1.5">
              <Label className="text-xs">Documento da Kurti 3D (Vendedor)</Label>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.studioDocType === "cnpj" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, studioDocType: "cnpj" }))}
                >
                  CNPJ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={receiptDialog.studioDocType === "cpf" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setReceiptDialog((prev) => ({ ...prev, studioDocType: "cpf" }))}
                >
                  CPF
                </Button>
              </div>
              <Input
                value={receiptDialog.studioDocNumber}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, studioDocNumber: e.target.value }))
                }
                placeholder={
                  receiptDialog.studioDocType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
            </div>

            {/* Payment info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Input
                  value={receiptDialog.formaPagamento}
                  onChange={(e) =>
                    setReceiptDialog((prev) => ({ ...prev, formaPagamento: e.target.value }))
                  }
                  placeholder="PIX, Dinheiro..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data do Recebimento</Label>
                <Input
                  type="date"
                  value={receiptDialog.dataRecebimento}
                  onChange={(e) =>
                    setReceiptDialog((prev) => ({ ...prev, dataRecebimento: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Client phone */}
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone do Cliente (WhatsApp)</Label>
              <Input
                value={receiptDialog.clientPhone}
                onChange={(e) =>
                  setReceiptDialog((prev) => ({ ...prev, clientPhone: e.target.value }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Paid toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <input
                type="checkbox"
                id="rcpt-paid"
                checked={receiptDialog.paid}
                onChange={(e) => setReceiptDialog((prev) => ({ ...prev, paid: e.target.checked }))}
                className="h-4 w-4 rounded accent-green-600"
              />
              <Label htmlFor="rcpt-paid" className="text-sm cursor-pointer">
                Pagamento já recebido (exibe carimbo PAGO)
              </Label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs text-green-700"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button className="btn-filament gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Gerar Recibo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
