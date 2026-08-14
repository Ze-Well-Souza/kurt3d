import { Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/utils";
import type { OrcamentosCtx } from "./use-orcamentos-page-state";

export function QuoteFormDialog({ ctx }: { ctx: OrcamentosCtx }) {
  const {
    showForm,
    editQuote,
    closeForm,
    handleSubmit,
    clientName,
    setClientName,
    clientContact,
    setClientContact,
    clientEmail,
    setClientEmail,
    validityDays,
    setValidityDays,
    items,
    updateItem,
    addItem,
    removeItem,
    discountPercent,
    setDiscountPercent,
    computedSubtotal,
    computedTotal,
    notes,
    setNotes,
    mutateCreate,
    mutateUpdate,
  } = ctx;

  return (
    <Dialog
      open={showForm}
      onOpenChange={(open) => {
        if (!open) closeForm();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editQuote ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Info */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-3">
              <Label>Cliente *</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Contato</Label>
              <Input
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="WhatsApp"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>E-mail</Label>
              <Input
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                type="email"
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Validade (dias)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value) || 7)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Itens</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" /> Adicionar Item
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <Label className="text-xs">Descrição *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Peça, serviço..."
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Minutos</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item.timeMinutes || ""}
                      onChange={(e) => updateItem(idx, "timeMinutes", Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end justify-between sm:col-span-2">
                    <div>
                      <Label className="text-xs">Subtotal</Label>
                      <p className="mt-1 text-sm font-medium filament-text">{brl(item.subtotal)}</p>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent || ""}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                  className="w-20"
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Subtotal: {brl(computedSubtotal)}</div>
              {discountPercent > 0 && (
                <div className="text-xs text-green-600">
                  Desconto: {discountPercent}% (-{brl((computedSubtotal * discountPercent) / 100)})
                </div>
              )}
              <div className="font-display text-xl font-bold filament-text">
                Total: {brl(computedTotal)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condições de pagamento, prazo, etc..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="btn-filament"
              disabled={mutateCreate.isPending || mutateUpdate.isPending}
            >
              {editQuote ? "Salvar Alterações" : "Criar Orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
