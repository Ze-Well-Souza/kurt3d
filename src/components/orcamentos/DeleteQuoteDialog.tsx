import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { OrcamentosCtx } from "./use-orcamentos-page-state";

export function DeleteQuoteDialog({ ctx }: { ctx: OrcamentosCtx }) {
  const { deleteId, setDeleteId, mutateDelete } = ctx;

  return (
    <Dialog
      open={!!deleteId}
      onOpenChange={(open) => {
        if (!open) setDeleteId(null);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover Orçamento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza? Esta ação não pode ser desfeita.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteId && mutateDelete.mutate(deleteId)}
            disabled={mutateDelete.isPending}
          >
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
