import { TriangleAlert as AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function DeleteOrderDialog({ ctx }: { ctx: CalcPedidosCtx }) {
  const { deleteDialog, setDeleteDialog, mutateRemoveOrder } = ctx;

  return (
    <Dialog
      open={deleteDialog.open}
      onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir Pedido
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
          </p>
          <div className="grid gap-2">
            <Label>Motivo da exclusão *</Label>
            <Textarea
              rows={3}
              placeholder="Informe o motivo..."
              value={deleteDialog.reason}
              onChange={(e) => setDeleteDialog((s) => ({ ...s, reason: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialog((s) => ({ ...s, open: false, reason: "" }))}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!deleteDialog.reason.trim()}
            onClick={() => {
              mutateRemoveOrder.mutate({
                orderId: deleteDialog.orderId,
                reason: deleteDialog.reason,
              });
              setDeleteDialog({ open: false, orderId: "", reason: "" });
            }}
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
