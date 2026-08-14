import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HardDrive, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { runStorageCleanup } from "@/lib/api/data.functions";
import { invalidarPor } from "@/lib/query-keys";

export function StorageCleanupCard() {
  const qc = useQueryClient();
  const mutateCleanup = useMutation({
    mutationFn: (olderThanDays: number) => runStorageCleanup({ data: { olderThanDays } }),
    onSuccess: (result) => {
      invalidarPor(qc, "limpezaStorage");
      toast.success(`${result.deletedCount} arquivos removidos do storage.`);
    },
    onError: () => toast.error("Erro ao executar limpeza."),
  });

  return (
    <Card className="filament-top overflow-hidden border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold tracking-tight">
            Limpeza de Storage
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Remove imagens de leads antigos para liberar espaço no plano gratuito do Supabase.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 p-6">
        <div className="text-sm text-muted-foreground">
          <p>Remove imagens de leads com mais de 90 dias.</p>
          <p className="text-xs mt-1">
            Esta ação é irreversível — as imagens serão permanentemente excluídas do storage.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          disabled={mutateCleanup.isPending}
          onClick={() => mutateCleanup.mutate(90)}
        >
          <Trash2 className="h-4 w-4" />
          {mutateCleanup.isPending ? "Limpando..." : "Limpar Storage"}
        </Button>
      </div>
    </Card>
  );
}
