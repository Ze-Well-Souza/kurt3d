import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StockCtx } from "./use-stock-page-state";

/**
 * Confirmação de reativação de um filamento arquivado (volta ao estoque ativo
 * com o mesmo SKU e peso registrado). Se o SKU já estiver em uso por um
 * filamento ativo, a server function lança erro e nada muda.
 */
export function FilamentRestoreDialog({ ctx }: { ctx: StockCtx }) {
  const { restoreTarget, setRestoreTarget, submitRestore, mutateRestore } = ctx;

  return (
    <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Reativar Filamento
          </DialogTitle>
        </DialogHeader>
        {restoreTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O rolo{" "}
              <span className="font-mono font-semibold text-foreground">{restoreTarget.sku}</span> (
              {restoreTarget.marca} — {restoreTarget.cor}) voltará ao estoque ativo com o peso
              registrado de{" "}
              <span className="font-semibold text-foreground">{restoreTarget.pesoAtual} g</span>.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRestoreTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="btn-filament gap-2"
                disabled={mutateRestore.isPending}
                onClick={() => void submitRestore()}
              >
                <Undo2 className="h-4 w-4" />
                {mutateRestore.isPending ? "Reativando…" : "Reativar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
