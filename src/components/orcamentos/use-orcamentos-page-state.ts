import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBudgetQuote,
  updateBudgetQuote,
  deleteBudgetQuote,
  convertQuoteToOrder,
} from "@/lib/api/data.functions";
import { useBudgetQuotes } from "@/lib/hooks/use-budget-quotes";
import { useOrders } from "@/lib/hooks/use-orders";
import { useSettings } from "@/lib/hooks/use-settings";
import { normalizeText } from "@/lib/utils/normalization";
import type { BudgetQuote, BudgetQuoteItem, BudgetQuoteStatus } from "@/lib/domain/types";
import { invalidarPor } from "@/lib/query-keys";
import { emptyItem } from "./orcamentos-shared";

/**
 * Estado completo da página de orçamentos: dados, filtros, dialogs e
 * mutações. Lista e diálogos recebem este objeto como `ctx` e apenas
 * renderizam — nenhuma lógica de domínio vive nos componentes.
 */
export function useOrcamentosPageState() {
  const qc = useQueryClient();
  const { data: quotesData } = useBudgetQuotes();
  const { data: ordersData } = useOrders();
  const { data: settingsData } = useSettings();
  const quotes = quotesData ?? [];
  const orders = ordersData ?? [];
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editQuote, setEditQuote] = useState<BudgetQuote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean;
    quote: BudgetQuote | null;
    docType: "cnpj" | "cpf";
    docNumber: string;
    studioDocType: "cnpj" | "cpf";
    studioDocNumber: string;
    clientPhone: string;
    formaPagamento: string;
    dataRecebimento: string;
    paid: boolean;
  }>({
    open: false,
    quote: null,
    docType: "cnpj",
    docNumber: "",
    studioDocType: "cnpj",
    studioDocNumber: "",
    clientPhone: "",
    formaPagamento: "",
    dataRecebimento: new Date().toISOString().slice(0, 10),
    paid: false,
  });

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
    mutationFn: (data: Parameters<typeof createBudgetQuote>[0]["data"]) =>
      createBudgetQuote({ data }),
    onSuccess: () => {
      invalidarPor(qc, "orcamento");
      toast.success("Orçamento criado.");
      setShowForm(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao criar orçamento."),
  });

  const mutateUpdate = useMutation({
    mutationFn: (data: Parameters<typeof updateBudgetQuote>[0]["data"]) =>
      updateBudgetQuote({ data }),
    onSuccess: () => {
      invalidarPor(qc, "orcamento");
      toast.success("Orçamento atualizado.");
      setShowForm(false);
      setEditQuote(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("email") || msg.includes("e-mail")) {
        toast.error("E-mail do cliente inválido. Corrija ou remova antes de salvar.");
      } else if (msg.includes("rate_limited")) {
        toast.error("Muitas operações. Aguarde alguns segundos.");
      } else {
        toast.error(`Erro ao atualizar orçamento: ${msg}`);
      }
    },
  });

  const mutateDelete = useMutation({
    mutationFn: (quoteId: string) => deleteBudgetQuote({ data: { quoteId } }),
    onSuccess: () => {
      invalidarPor(qc, "orcamento");
      toast.success("Orçamento removido.");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao remover orçamento."),
  });

  const mutateConvert = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToOrder({ data: { quoteId } }),
    onSuccess: (result) => {
      invalidarPor(qc, "orcamento");
      if (result.ok) {
        toast.success("Orçamento convertido em pedido!");
      } else {
        toast.error(
          result.reason === "not_approved"
            ? "Aprove o orçamento antes de converter."
            : "Erro ao converter.",
        );
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
      invalidarPor(qc, "orcamento");
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

  function closeForm() {
    setShowForm(false);
    setEditQuote(null);
  }

  function openReceiptFor(quote: BudgetQuote) {
    setReceiptDialog({
      open: true,
      quote,
      docType: "cnpj",
      docNumber: "",
      studioDocType: "cnpj",
      studioDocNumber: "",
      clientPhone: quote.clientContact ?? "",
      formaPagamento: "",
      dataRecebimento: new Date().toISOString().slice(0, 10),
      paid: false,
    });
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

  return {
    quotes,
    orders,
    settingsData,
    search,
    setSearch,
    showForm,
    editQuote,
    deleteId,
    setDeleteId,
    receiptDialog,
    setReceiptDialog,
    openReceiptFor,
    clientName,
    setClientName,
    clientContact,
    setClientContact,
    clientEmail,
    setClientEmail,
    items,
    discountPercent,
    setDiscountPercent,
    validityDays,
    setValidityDays,
    notes,
    setNotes,
    computedSubtotal,
    computedTotal,
    updateItem,
    addItem,
    removeItem,
    openCreate,
    openEdit,
    closeForm,
    handleSubmit,
    mutateCreate,
    mutateUpdate,
    mutateDelete,
    mutateConvert,
    mutateStatus,
    filtered,
  };
}

export type OrcamentosCtx = ReturnType<typeof useOrcamentosPageState>;
