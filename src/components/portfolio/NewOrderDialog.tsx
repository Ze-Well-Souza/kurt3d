import { CreditCard, FileUp, Layers, Plus, Printer, Trash2, User } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS, formatTime } from "./order-card-shared";
import {
  MAX_ORDER_ASSET_SIZE,
  NO_CLIENT_SELECTED,
  HYBRID_PRINTER,
  NO_PRINTER,
  ORDER_ASSET_ACCEPT,
  PRINTERS,
  buildEmptyOrderPart,
  formatFileSize,
  validateOrderAssetFile,
} from "./calc-pedidos-shared";
import { DialogSection } from "./DialogSection";
import type { CalcPedidosCtx } from "./use-calc-pedidos-state";

export function NewOrderDialog({ ctx }: { ctx: CalcPedidosCtx }) {
  const {
    showNewOrder,
    setShowNewOrder,
    resetNewOrderForm,
    submitNewOrder,
    newOrder,
    setNewOrder,
    clients,
    filamentos,
    newOrderPartsTotals,
    newOrderAsset,
    setNewOrderAsset,
    newOrderParts,
    setNewOrderParts,
    newOrderPartSummary,
    updateNewOrderPartField,
    addNewOrderPart,
    removeNewOrderPart,
    mutateAddOrder,
    mutateUploadOrderAsset,
  } = ctx;

  return (
    <Dialog
      open={showNewOrder}
      onOpenChange={(open) => {
        setShowNewOrder(open);
        if (!open) resetNewOrderForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pedido</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submitNewOrder}>
          <DialogSection icon={User} title="Cliente e projeto">
            <div className="grid gap-2">
              <Label>Cliente Cadastrado</Label>
              <Select
                value={newOrder.clientId || NO_CLIENT_SELECTED}
                onValueChange={(value) => {
                  const nextClientId = value === NO_CLIENT_SELECTED ? "" : value;
                  const selectedClient = clients.find((client) => client.id === nextClientId);
                  setNewOrder((state) => ({
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
                value={newOrder.client}
                onChange={(e) => setNewOrder((s) => ({ ...s, client: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Projeto</Label>
              <Input
                value={newOrder.projectName}
                onChange={(e) => setNewOrder((s) => ({ ...s, projectName: e.target.value }))}
              />
            </div>
          </DialogSection>

          <DialogSection icon={Printer} title="Produção">
            <div className="grid gap-2">
              <Label>Impressora</Label>
              <Select
                value={newOrder.printer || NO_PRINTER}
                onValueChange={(v) =>
                  setNewOrder((s) => ({ ...s, printer: v === NO_PRINTER ? "" : v }))
                }
              >
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
                  <SelectItem value={HYBRID_PRINTER}>Híbrido (as duas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder((s) => ({ ...s, quantity: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Horas (calc.)" : "Horas"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    newOrder.multiPart
                      ? newOrderPartsTotals.timeMinutes > 0
                        ? String(Math.floor(newOrderPartsTotals.timeMinutes / 60))
                        : ""
                      : String(Math.floor(Number(newOrder.timeMinutes) / 60))
                  }
                  onChange={(e) => {
                    const h = Number(e.target.value) || 0;
                    const m = Number(newOrder.timeMinutes) % 60;
                    setNewOrder((s) => ({ ...s, timeMinutes: String(h * 60 + m) }));
                  }}
                  disabled={newOrder.multiPart}
                />
              </div>
              <div className="grid gap-2">
                <Label>{newOrder.multiPart ? "Minutos (calc.)" : "Minutos"}</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={
                    newOrder.multiPart
                      ? newOrderPartsTotals.timeMinutes > 0
                        ? String(newOrderPartsTotals.timeMinutes % 60)
                        : ""
                      : String(Number(newOrder.timeMinutes) % 60)
                  }
                  onChange={(e) => {
                    const m = Math.min(Number(e.target.value) || 0, 59);
                    const h = Math.floor(Number(newOrder.timeMinutes) / 60);
                    setNewOrder((s) => ({ ...s, timeMinutes: String(h * 60 + m) }));
                  }}
                  disabled={newOrder.multiPart}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Filamentos</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    setNewOrder((s) => ({ ...s, filamentoIds: [...s.filamentoIds, ""] }))
                  }
                >
                  <Plus className="h-3 w-3" /> Adicionar filamento
                </Button>
              </div>
              {newOrder.filamentoIds.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setNewOrder((s) => ({ ...s, filamentoIds: [""] }))}
                >
                  <Plus className="mr-2 h-4 w-4" /> Selecionar filamento
                </Button>
              ) : (
                <div className="space-y-2">
                  {newOrder.filamentoIds.map((fId, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={fId}
                        onValueChange={(v) =>
                          setNewOrder((s) => {
                            const ids = [...s.filamentoIds];
                            ids[idx] = v;
                            return { ...s, filamentoIds: ids };
                          })
                        }
                      >
                        <SelectTrigger className="flex-1">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setNewOrder((s) => ({
                            ...s,
                            filamentoIds: s.filamentoIds.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{newOrder.multiPart ? "Gramas totais (calculado)" : "Gramas / unidade"}</Label>
              <Input
                type="number"
                min={0}
                value={
                  newOrder.multiPart
                    ? newOrderPartsTotals.gramsPerUnit > 0
                      ? String(newOrderPartsTotals.gramsPerUnit)
                      : ""
                    : newOrder.gramsPerUnit
                }
                onChange={(e) => setNewOrder((s) => ({ ...s, gramsPerUnit: e.target.value }))}
                disabled={newOrder.multiPart}
              />
            </div>
            <div>
              <Button
                type="button"
                variant={newOrder.multiPart ? "default" : "outline"}
                className="w-full gap-2"
                onClick={() => {
                  setNewOrder((s) => ({ ...s, multiPart: !s.multiPart }));
                  setNewOrderParts((current) =>
                    current.length > 0 ? current : [buildEmptyOrderPart()],
                  );
                }}
              >
                <Layers className="h-4 w-4" />
                {newOrder.multiPart ? "Multi-partes" : "Peça única"}
              </Button>
            </div>
          </DialogSection>

          {newOrder.multiPart && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Partes do pedido</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre cada parte com seu tempo, peso e arquivo opcional. Os totais do pedido
                    sao somados automaticamente.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addNewOrderPart}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar parte
                </Button>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <span className="font-medium text-foreground">{newOrderPartSummary.total}</span>{" "}
                  partes
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <span className="font-medium text-foreground">
                    {formatTime(Math.round(newOrderPartsTotals.timeMinutes))}
                  </span>{" "}
                  tempo total
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <span className="font-medium text-foreground">
                    {newOrderPartsTotals.gramsPerUnit.toFixed(2)}g
                  </span>{" "}
                  consumo total
                </div>
              </div>
              <div className="space-y-4">
                {newOrderParts.map((part, index) => (
                  <div
                    key={part.id}
                    className="space-y-3 rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Parte {index + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          Cada linha representa uma subpeca do pedido final.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeNewOrderPart(part.id)}
                        disabled={newOrderParts.length <= 1}
                        aria-label={`Remover parte ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label>Nome da parte</Label>
                        <Input
                          value={part.nome}
                          onChange={(e) => updateNewOrderPartField(part.id, "nome", e.target.value)}
                          placeholder="Ex.: Cabeca, Base, Braço esquerdo"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Quantidade desta parte</Label>
                        <Input
                          type="number"
                          min={1}
                          value={part.quantity}
                          onChange={(e) =>
                            updateNewOrderPartField(part.id, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Tempo por unidade (min)</Label>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={part.timeMinutes}
                          onChange={(e) =>
                            updateNewOrderPartField(part.id, "timeMinutes", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Gramas por unidade</Label>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={part.gramsPerUnit}
                          onChange={(e) =>
                            updateNewOrderPartField(part.id, "gramsPerUnit", e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Link externo da parte</Label>
                        <Input
                          type="url"
                          value={part.linkProjeto}
                          onChange={(e) =>
                            updateNewOrderPartField(part.id, "linkProjeto", e.target.value)
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="grid gap-2 sm:col-span-2">
                        <Label>Arquivo STL ou 3MF da parte (opcional)</Label>
                        <Input
                          type="file"
                          accept={ORDER_ASSET_ACCEPT}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (!file) {
                              updateNewOrderPartField(part.id, "file", null);
                              return;
                            }
                            const validationMessage = validateOrderAssetFile(file);
                            if (validationMessage) {
                              toast.error(validationMessage);
                              e.currentTarget.value = "";
                              return;
                            }
                            updateNewOrderPartField(part.id, "file", file);
                          }}
                        />
                        {part.file && (
                          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                            <span className="truncate font-medium">{part.file.name}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {formatFileSize(part.file.size)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2 sm:col-span-2">
                        <Label>Observacoes</Label>
                        <Textarea
                          rows={2}
                          value={part.notes}
                          onChange={(e) =>
                            updateNewOrderPartField(part.id, "notes", e.target.value)
                          }
                          placeholder="Observacoes de encaixe, orientacao, cor, suporte..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogSection icon={FileUp} title="Arquivo e referência">
            <div className="grid gap-2">
              <Label>Link externo (opcional)</Label>
              <Input
                type="url"
                value={newOrder.linkProjeto}
                onChange={(e) => setNewOrder((s) => ({ ...s, linkProjeto: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Arquivo STL ou 3MF (opcional)</Label>
              <Input
                type="file"
                accept=".stl,.3mf,model/stl,application/sla,application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setNewOrderAsset(null);
                    return;
                  }
                  const extension = file.name.split(".").pop()?.toLowerCase();
                  if (!extension || !["stl", "3mf"].includes(extension)) {
                    toast.error("Envie apenas arquivos STL ou 3MF.");
                    e.currentTarget.value = "";
                    return;
                  }
                  if (file.size > MAX_ORDER_ASSET_SIZE) {
                    toast.error("O arquivo excede o limite de 25 MB.");
                    e.currentTarget.value = "";
                    return;
                  }
                  setNewOrderAsset(file);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                O arquivo fica salvo em Storage para reimpressao futura. Se enviar um arquivo, ele
                sera a referencia principal do pedido.
              </p>
              {newOrderAsset && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="truncate font-medium">{newOrderAsset.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatFileSize(newOrderAsset.size)}
                  </span>
                </div>
              )}
            </div>
          </DialogSection>

          <DialogSection icon={CreditCard} title="Preço e pagamento">
            <div className="grid gap-2">
              <Label>Preço de Venda (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={newOrder.precoVenda}
                onChange={(e) => setNewOrder((s) => ({ ...s, precoVenda: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={newOrder.formaPagamento}
                  onValueChange={(v) => setNewOrder((s) => ({ ...s, formaPagamento: v }))}
                >
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
                  type="date"
                  value={newOrder.dataPagamento}
                  onChange={(e) => setNewOrder((s) => ({ ...s, dataPagamento: e.target.value }))}
                />
              </div>
            </div>
          </DialogSection>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewOrder(false);
                resetNewOrderForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="btn-filament"
              disabled={mutateAddOrder.isPending || mutateUploadOrderAsset.isPending}
            >
              {mutateAddOrder.isPending || mutateUploadOrderAsset.isPending
                ? "Salvando..."
                : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
