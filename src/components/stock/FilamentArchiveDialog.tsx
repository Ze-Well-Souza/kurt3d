import { Archive } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { FilamentoQualidade } from "@/lib/domain/types";
import { QUALIDADE_CONFIG } from "./stock-shared";
import type { StockCtx } from "./use-stock-page-state";

export function FilamentArchiveDialog({ ctx }: { ctx: StockCtx }) {
  const { archiveDialog, setArchiveDialog, submitArchive } = ctx;

  return (
    <Dialog
      open={archiveDialog.open}
      onOpenChange={(open) => setArchiveDialog((s) => ({ ...s, open }))}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Filamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            O filamento será removido do estoque ativo e salvo no histórico.
          </p>
          <div className="space-y-2">
            <Label>Data de Término</Label>
            <Input
              type="date"
              value={archiveDialog.dataFim}
              onChange={(e) => setArchiveDialog((s) => ({ ...s, dataFim: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Qualidade do Filamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["Ótimo", "bom", "médio", "ruim"] as FilamentoQualidade[]).map((q) => {
                const cfg = QUALIDADE_CONFIG[q];
                const Icon = cfg.icon;
                const selected = archiveDialog.qualidade === q;
                return (
                  <Button
                    key={q}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="gap-1.5"
                    style={selected ? { background: cfg.color } : undefined}
                    onClick={() => setArchiveDialog((s) => ({ ...s, qualidade: q }))}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="Ex: Cor ficou apagada, quebrou fácil, excelente acabamento..."
              value={archiveDialog.observacao}
              onChange={(e) => setArchiveDialog((s) => ({ ...s, observacao: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setArchiveDialog((s) => ({ ...s, open: false }))}
          >
            Cancelar
          </Button>
          <Button className="btn-filament" onClick={submitArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
