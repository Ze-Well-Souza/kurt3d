import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteQuoteDialog } from "@/components/orcamentos/DeleteQuoteDialog";
import { QuoteCard } from "@/components/orcamentos/QuoteCard";
import { QuoteFormDialog } from "@/components/orcamentos/QuoteFormDialog";
import { ReceiptDialog } from "@/components/orcamentos/ReceiptDialog";
import { STATUS_ICONS, STATUS_LABELS } from "@/components/orcamentos/orcamentos-shared";
import { useOrcamentosPageState } from "@/components/orcamentos/use-orcamentos-page-state";
import { PaginationBar } from "@/components/shared/pagination-bar";

export const Route = createFileRoute("/admin/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Kurti 3D" }] }),
  component: OrcamentosPage,
});

function OrcamentosPage() {
  const ctx = useOrcamentosPageState();
  const { quotes, search, setSearch, openCreate, filtered, pagination } = ctx;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
            <Plus className="h-4 w-4" />
            Novo Orçamento
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
          {pagination.pageRows.map((quote) => (
            <QuoteCard key={quote.id} ctx={ctx} quote={quote} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <Card>
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </Card>
      )}

      <QuoteFormDialog ctx={ctx} />
      <DeleteQuoteDialog ctx={ctx} />
      <ReceiptDialog ctx={ctx} />
    </div>
  );
}
