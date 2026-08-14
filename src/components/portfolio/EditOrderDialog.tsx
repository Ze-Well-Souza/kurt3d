import { CreditCard, Download, FileUp, Printer, User } from "lucide-react";
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
import { getOrderAssetFileName, isOrderAssetReference } from "@/lib/domain/order-asset";
import { PAYMENT_METHODS } from "./order-card-shared";
import { NO_CLIENT_SELECTED, NO_PRINTER, PRINTERS } from "./calc-pedidos-shared";
import { DialogSection } from "./DialogSection";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function EditOrderDialog({ ctx }: { ctx: CalcPedidosCtx }) {
  const { editOrder, setEditOrder, clients, mutateUpdateOrder, filamentos, openProjectReference } =
    ctx;

  return (
    <Dialog
      open={!!editOrder}
      onOpenChange={(open) => {
        if (!open) setEditOrder(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
        </DialogHeader>
        {editOrder && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const selectedClientId = (fd.get("clientId") as string) || "";
              const selectedClient = clients.find((client) => client.id === selectedClientId);
              const printerValue = (fd.get("printer") as string) || "";
              mutateUpdateOrder.mutate({
                orderId: editOrder.id,
                client:
                  (selectedClient?.nome ?? (fd.get("client") as string)?.trim()) ||
                  editOrder.client,
                projectName: (fd.get("projectName") as string)?.trim() || editOrder.projectName,
                quantity: Number(fd.get("quantity")) || editOrder.quantity,
                timeMinutes: Number(fd.get("timeMinutes")) || editOrder.timeMinutes,
                filamentoId: (fd.get("filamentoId") as string) || null,
                gramsPerUnit: Number(fd.get("gramsPerUnit")) || null,
                precoVenda: Number(fd.get("precoVenda")) || null,
                linkProjeto:
                  (fd.get("linkProjeto") as string)?.trim() ||
                  (isOrderAssetReference(editOrder.linkProjeto)
                    ? (editOrder.linkProjeto ?? null)
                    : null),
                multiPart: editOrder.parts?.length ? true : (editOrder.multiPart ?? false),
                formaPagamento: (fd.get("formaPagamento") as string) || null,
                dataPagamento: (fd.get("dataPagamento") as string) || null,
                clientId: selectedClient?.id ?? null,
                printer: printerValue && printerValue !== NO_PRINTER ? printerValue : null,
              });
              setEditOrder(null);
            }}
          >
            <DialogSection icon={User} title="Cliente e projeto">
              <div className="grid gap-2">
                <Label>Cliente Cadastrado</Label>
                <Select name="clientId" defaultValue={editOrder.clientId ?? NO_CLIENT_SELECTED}>
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
                <Input name="client" defaultValue={editOrder.client} />
              </div>
              <div className="grid gap-2">
                <Label>Projeto</Label>
                <Input name="projectName" defaultValue={editOrder.projectName} />
              </div>
            </DialogSection>

            <DialogSection icon={Printer} title="Produção">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input name="quantity" type="number" min={1} defaultValue={editOrder.quantity} />
                </div>
                <div className="grid gap-2">
                  <Label>
                    {editOrder.parts?.length ? "Tempo total (calculado)" : "Tempo (min)"}
                  </Label>
                  <Input
                    name="timeMinutes"
                    type="number"
                    min={1}
                    defaultValue={editOrder.timeMinutes}
                    disabled={Boolean(editOrder.parts?.length)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Filamento</Label>
                  <Select name="filamentoId" defaultValue={editOrder.filamentoId ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filamentos.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    {editOrder.parts?.length ? "Gramas totais (calculado)" : "Gramas / unidade"}
                  </Label>
                  <Input
                    name="gramsPerUnit"
                    type="number"
                    min={0}
                    defaultValue={editOrder.gramsPerUnit ?? ""}
                    disabled={Boolean(editOrder.parts?.length)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Impressora</Label>
                <Select name="printer" defaultValue={editOrder.printer ?? NO_PRINTER}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PRINTER}>Sem impressora</SelectItem>
                    {PRINTERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editOrder.parts?.length ? (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  Este pedido usa multi-partes. Tempo e consumo total sao recalculados
                  automaticamente a partir das partes no detalhe do pedido.
                </p>
              ) : null}
            </DialogSection>

            <DialogSection icon={FileUp} title="Arquivo e referência">
              <div className="grid gap-2">
                <Label>Link do Projeto</Label>
                <Input
                  name="linkProjeto"
                  type="text"
                  defaultValue={
                    isOrderAssetReference(editOrder.linkProjeto)
                      ? ""
                      : (editOrder.linkProjeto ?? "")
                  }
                  placeholder={
                    isOrderAssetReference(editOrder.linkProjeto)
                      ? "Arquivo STL/3MF ja salvo neste pedido"
                      : ""
                  }
                />
                {isOrderAssetReference(editOrder.linkProjeto) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    onClick={() => void openProjectReference(editOrder.linkProjeto)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Abrir {getOrderAssetFileName(editOrder.linkProjeto) ?? "arquivo salvo"}
                  </button>
                )}
              </div>
            </DialogSection>

            <DialogSection icon={CreditCard} title="Preço e pagamento">
              <div className="grid gap-2">
                <Label>Preço de Venda (R$)</Label>
                <Input
                  name="precoVenda"
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={editOrder.precoVenda ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Forma de Pagamento</Label>
                  <Select name="formaPagamento" defaultValue={editOrder.formaPagamento ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Data do Pagamento</Label>
                  <Input
                    name="dataPagamento"
                    type="date"
                    defaultValue={editOrder.dataPagamento ?? ""}
                  />
                </div>
              </div>
            </DialogSection>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOrder(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament" disabled={mutateUpdateOrder.isPending}>
                {mutateUpdateOrder.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
