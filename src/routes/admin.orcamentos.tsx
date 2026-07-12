import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock,
  Send, Ban, ArrowRightLeft, Percent, Hash, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { brl } from "@/lib/utils";
import {
  createBudgetQuote, updateBudgetQuote, deleteBudgetQuote,
  convertQuoteToOrder,
} from "@/lib/api/data.functions";
import { useBudgetQuotes } from "@/lib/hooks/use-budget-quotes";
import { useOrders } from "@/lib/hooks/use-orders";
import { normalizeText } from "@/lib/utils/normalization";
import type { BudgetQuote, BudgetQuoteItem, BudgetQuoteStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/admin/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Kurti 3D" }] }),
  component: OrcamentosPage,
});

const STATUS_LABELS: Record<BudgetQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  expired: "Expirado",
  converted: "Convertido",
};

const STATUS_COLORS: Record<BudgetQuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  sent: "bg-blue-100 text-blue-700 border-blue-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  expired: "bg-yellow-100 text-yellow-700 border-yellow-300",
  converted: "bg-purple-100 text-purple-700 border-purple-300",
};

const STATUS_ICONS: Partial<Record<BudgetQuoteStatus, typeof CheckCircle2>> = {
  draft: FileText,
  sent: Send,
  approved: CheckCircle2,
  rejected: XCircle,
  expired: Clock,
  converted: ArrowRightLeft,
};

function emptyItem(): BudgetQuoteItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    timeMinutes: 0,
    materialGrams: 0,
    subtotal: 0,
  };
}

function OrcamentosPage() {
  const qc = useQueryClient();
  const { data: quotesData } = useBudgetQuotes();
  const { data: ordersData } = useOrders();
  const quotes = quotesData ?? [];
  const orders = ordersData ?? [];
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editQuote, setEditQuote] = useState<BudgetQuote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<BudgetQuoteItem[]>([emptyItem()]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("");

  const computedSubtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const computedTotal = computedSubtotal * (1 - discountPercent / 100);

  function resetForm() {
    setClientName("");
    setClientContact("");
    setClientEmail("");
    setItems([emptyItem()]);
    setDiscountPercent(0);
    setValidityDays(7);
    setNotes("");
  }

  function openCreate() {
    resetForm();
    setEditQuote(null);
    setShowForm(true);
  }

  function openEdit(quote: BudgetQuote) {
    setEditQuote(quote);
    setClientName(quote.clientName);
    setClientContact(quote.clientContact ?? "");
    setClientEmail(quote.clientEmail ?? "");
    setItems(quote.items.length > 0 ? quote.items.map((i) => ({ ...i })) : [emptyItem()]);
    setDiscountPercent(quote.discountPercent ?? 0);
    setValidityDays(quote.validityDays);
    setNotes(quote.notes ?? "");
    setShowForm(true);
  }

  function updateItem(idx: number, field: keyof BudgetQuoteItem, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      if (field === "unitPrice" || field === "quantity") {
        item.subtotal = item.quantity * item.unitPrice;
      }
      next[idx] = item;
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Mutations
  const mutateCreate = useMutation({
    mutationFn: (data: any) => createBudgetQuote({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-quotes"] });
      toast.success("Orçamento criado.");
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao criar orçamento."),
  });

  const mutateUpdate = useMutation({
    mutationFn: (data: any) => updateBudgetQuote({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-quotes"] });
      toast.success("Orçamento atualizado.");
      setShowForm(false);
      setEditQuote(null);
    },
    onError: () => toast.error("Erro ao atualizar orçamento."),
  });

  const mutateDelete = useMutation({
    mutationFn: (quoteId: string) => deleteBudgetQuote({ data: { quoteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-quotes"] });
      toast.success("Orçamento removido.");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao remover orçamento."),
  });

  const mutateConvert = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToOrder({ data: { quoteId } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["budget-quotes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      if (result.ok) {
        toast.success("Orçamento convertido em pedido!");
      } else {
        toast.error(result.reason === "not_approved" ? "Aprove o orçamento antes de converter." : "Erro ao converter.");
      }
    },
    onError: () => toast.error("Erro ao converter orçamento."),
  });

  const mutateStatus = useMutation({
    mutationFn: ({ quoteId, status }: { quoteId: string; status: BudgetQuoteStatus }) => {
      const quote = quotes.find((q) => q.id === quoteId);
      if (!quote) throw new Error("not_found");
      return updateBudgetQuote({
        data: {
          quoteId,
          clientName: quote.clientName,
          clientContact: quote.clientContact ?? undefined,
          clientEmail: quote.clientEmail ?? undefined,
          items: quote.items,
          discountPercent: quote.discountPercent ?? undefined,
          validityDays: quote.validityDays,
          notes: quote.notes ?? undefined,
          status,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-quotes"] });
      toast.success("Status atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar status."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.description.trim());

    if (!clientName.trim() || validItems.length === 0) {
      toast.error("Preencha nome do cliente e pelo menos 1 item.");
      return;
    }

    const payload = {
      clientName: clientName.trim(),
      clientContact: clientContact.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      items: validItems,
      discountPercent: discountPercent || undefined,
      validityDays,
      notes: notes.trim() || undefined,
    };

    if (editQuote) {
      mutateUpdate.mutate({
        ...payload,
        quoteId: editQuote.id,
        status: editQuote.status,
      });
    } else {
      mutateCreate.mutate(payload);
    }
  }

  const filtered = quotes.filter((q) => {
    if (!search.trim()) return true;
    const s = normalizeText(search);
    return (
      normalizeText(q.clientName).includes(s) ||
      (q.clientContact && normalizeText(q.clientContact).includes(s)) ||
      (q.clientEmail && normalizeText(q.clientEmail).includes(s))
    );
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Toaster />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie orçamentos e converta em pedidos ({quotes.length} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar orçamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
          <Button onClick={openCreate} className="btn-filament gap-2">
            <Plus className="h-4 w-4" />Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["draft", "sent", "approved", "converted"] as const).map((status) => {
          const count = quotes.filter((q) => q.status === status).length;
          const Icon = STATUS_ICONS[status] ?? FileText;
          return (
            <Card key={status} className="border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
              </div>
              <div className="mt-1 font-display text-xl font-bold">{count}</div>
            </Card>
          );
        })}
      </div>

      {/* Quote List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">
              {quotes.length === 0 ? "Nenhum orçamento criado" : "Nenhum resultado encontrado"}
            </p>
            <p className="text-sm text-muted-foreground">
              {quotes.length === 0
                ? "Crie orçamentos para seus clientes e converta os aprovados em pedidos."
                : `Nenhum resultado para "${search}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((quote) => {
            const StatusIcon = STATUS_ICONS[quote.status] ?? FileText;
            const isConverted = quote.convertedToOrderId && orders.some((o) => o.id === quote.convertedToOrderId);
            return (
              <Card key={quote.id} className="overflow-hidden border-border">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{quote.clientName}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {quote.clientContact && <span>{quote.clientContact}</span>}
                        {quote.clientEmail && <span>{quote.clientEmail}</span>}
                        <span>
                          {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`gap-1 text-xs ${STATUS_COLORS[quote.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[quote.status]}
                      </Badge>
                      <span className="font-display text-lg font-bold filament-text">
                        {brl(quote.total)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {/* Items list */}
                <div className="border-t border-border bg-muted/20 px-6 py-2">
                  <div className="space-y-1">
                    {quote.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">
                          <span className="font-medium">{item.description}</span>
                          {item.quantity > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">x{item.quantity}</span>
                          )}
                        </span>
                        <span className="ml-2 shrink-0 text-muted-foreground">
                          {brl(item.subtotal)}
                        </span>
                      </div>
                    ))}
                    {quote.discountPercent && quote.discountPercent > 0 && (
                      <div className="flex items-center justify-between text-sm text-green-600">
                        <span>Desconto</span>
                        <span>-{quote.discountPercent}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {quote.notes && (
                  <div className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
                    {quote.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <div className="flex items-center gap-1">
                    {/* Draft → Sent */}
                    {quote.status === "draft" && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "sent" })}
                        className="gap-1 text-xs"
                      >
                        <Send className="h-3 w-3" /> Marcar Enviado
                      </Button>
                    )}
                    {/* Sent → Approved */}
                    {quote.status === "sent" && (
                      <>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "approved" })}
                          className="gap-1 text-xs text-green-600"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Aprovar
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "rejected" })}
                          className="gap-1 text-xs text-red-600"
                        >
                          <XCircle className="h-3 w-3" /> Rejeitar
                        </Button>
                      </>
                    )}
                    {/* Approved → Convert */}
                    {quote.status === "approved" && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => mutateConvert.mutate(quote.id)}
                        className="gap-1 text-xs text-purple-600"
                        disabled={mutateConvert.isPending}
                      >
                        <ArrowRightLeft className="h-3 w-3" /> Converter em Pedido
                      </Button>
                    )}
                    {/* Expired/Rejected → Draft (reopen) */}
                    {(quote.status === "expired" || quote.status === "rejected") && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => mutateStatus.mutate({ quoteId: quote.id, status: "draft" })}
                        className="gap-1 text-xs"
                      >
                        <FileText className="h-3 w-3" /> Reabrir
                      </Button>
                    )}
                    {isConverted && (
                      <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 bg-purple-50">
                        Pedido #{quote.convertedToOrderId!.slice(0, 8)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {quote.status !== "converted" && (
                      <>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => openEdit(quote)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(quote.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditQuote(null); } }}>
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
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Adicionar Item
                </Button>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="grid gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-12">
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
                          type="button" variant="ghost" size="icon"
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
                <div className="text-xs text-muted-foreground">
                  Subtotal: {brl(computedSubtotal)}
                </div>
                {discountPercent > 0 && (
                  <div className="text-xs text-green-600">
                    Desconto: {discountPercent}% (-{brl(computedSubtotal * discountPercent / 100)})
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
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditQuote(null); }}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-filament" disabled={mutateCreate.isPending || mutateUpdate.isPending}>
                {editQuote ? "Salvar Alterações" : "Criar Orçamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover Orçamento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
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
    </div>
  );
}
