import { Printer } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openPrintQuote, type QuoteInput } from "@/lib/domain/quote-print";
import { NO_CLIENT_SELECTED } from "./calc-pedidos-shared";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function CreateOrderFromProjectDialog({
  ctx,
  onCreated,
}: {
  ctx: CalcPedidosCtx;
  onCreated: () => void;
}) {
  const { orderDialog, setOrderDialog, clients, projects, settings, mutateCreateOrder } = ctx;

  return (
    <Dialog
      open={orderDialog.open}
      onOpenChange={(open) => setOrderDialog((s) => ({ ...s, open }))}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar pedido</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const selectedClient = clients.find((client) => client.id === orderDialog.clientId);
            try {
              const result = await mutateCreateOrder.mutateAsync({
                portfolioProjectId: orderDialog.projectId,
                client: (selectedClient?.nome ?? orderDialog.client.trim()) || "Cliente",
                clientId: selectedClient?.id,
                quantity: Number(orderDialog.quantity) || 1,
              });
              if (!result.ok) {
                toast.error("Projeto nao encontrado. Salve-o novamente.");
                return;
              }
              setOrderDialog((s) => ({ ...s, open: false }));
              onCreated();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Erro ao criar o pedido.");
            }
          }}
        >
          <div className="grid gap-2">
            <Label>Cliente Cadastrado</Label>
            <Select
              value={orderDialog.clientId || NO_CLIENT_SELECTED}
              onValueChange={(value) => {
                const nextClientId = value === NO_CLIENT_SELECTED ? "" : value;
                const selectedClient = clients.find((client) => client.id === nextClientId);
                setOrderDialog((state) => ({
                  ...state,
                  clientId: nextClientId,
                  client: selectedClient?.nome ?? state.client,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem vínculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLIENT_SELECTED}>Sem vínculo</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Cliente</Label>
            <Input
              value={orderDialog.client}
              onChange={(e) => setOrderDialog((s) => ({ ...s, client: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={orderDialog.quantity}
              onChange={(e) => setOrderDialog((s) => ({ ...s, quantity: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                const project = projects.find((p) => p.id === orderDialog.projectId);
                if (!project) {
                  toast.error("Projeto nao encontrado.");
                  return;
                }
                const effectivePrice = project.precoVenda > 0 ? project.precoVenda : 0;
                const input: QuoteInput = {
                  clientName: orderDialog.client.trim() || "",
                  items: [
                    {
                      name: project.nome,
                      category: project.categoria,
                      quantity: Number(orderDialog.quantity) || 1,
                      unitPrice: effectivePrice,
                      total: effectivePrice * (Number(orderDialog.quantity) || 1),
                      timeMinutes: project.tempoMin,
                      gramsPerUnit: project.pesoPeca,
                    },
                  ],
                  validityDays: 7,
                  observations: project.linkModelo?.trim()
                    ? `Modelo de referencia: ${project.linkModelo.trim()}`
                    : undefined,
                  studioNome: settings.studioNome || "Kurti 3D",
                  whatsappNumero: settings.whatsappNumero || "",
                };
                openPrintQuote(input);
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimir Orçamento
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrderDialog((s) => ({ ...s, open: false }))}
            >
              Cancelar
            </Button>
            <Button type="submit" className="btn-filament" disabled={mutateCreateOrder.isPending}>
              {mutateCreateOrder.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
