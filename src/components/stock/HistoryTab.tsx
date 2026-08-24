import { Archive, ExternalLink, Pencil, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/SearchInput";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import { usePagination } from "@/lib/hooks/use-pagination";
import { brl } from "@/lib/utils";
import { QUALIDADE_CONFIG } from "./stock-shared";
import type { StockCtx } from "./use-stock-page-state";
import { corCompleta, corHex } from "@/lib/domain/filament-colors";
import { ColorFilterBar } from "./ColorFilterBar";

export function HistoryTab({ ctx }: { ctx: StockCtx }) {
  const {
    filamentosHistory,
    historyCorCounts,
    historyCorFilter,
    setHistoryCorFilter,
    filteredHistory,
    historySearch,
    setHistorySearch,
    filamentoPayments,
    filamentoInstallments,
    openEditArchived,
    setRestoreTarget,
  } = ctx;

  const pagination = usePagination(filteredHistory, historySearch);

  return (
    <div className="filament-top rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Histórico de Filamentos</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={historySearch}
            onChange={setHistorySearch}
            placeholder="Buscar por SKU, marca ou cor..."
          />
          <span className="text-xs text-muted-foreground">
            {filamentosHistory.length} rolo(s) arquivado(s)
          </span>
        </div>
      </div>
      <div className="border-b border-border px-4 pb-4 sm:px-6">
        <ColorFilterBar
          counts={historyCorCounts}
          active={historyCorFilter}
          onChange={setHistoryCorFilter}
          total={historyCorCounts.reduce((sum, c) => sum + c.qtd, 0)}
        />
      </div>
      {filamentosHistory.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhum filamento arquivado ainda. Use o botão "Finalizar" em um rolo para movê-lo ao
          histórico.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Marca / Cor</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Onde Comprou</TableHead>
              <TableHead>Compra</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Data p/ Pagto</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Qualidade</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageRows.map((h) => {
              const qCfg = h.qualidade ? QUALIDADE_CONFIG[h.qualidade] : null;
              const payment = h.paymentId
                ? filamentoPayments.find((p) => p.id === h.paymentId)
                : null;
              const insts = payment
                ? filamentoInstallments.filter((i) => i.paymentId === payment.id)
                : [];
              const dataParaPagamento =
                payment?.dataParaPagamento ??
                [...insts].sort((a, b) => a.numero - b.numero)[0]?.vencimento ??
                null;
              return (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs">{h.sku}</TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-border"
                        style={{ background: corHex(h.cor) }}
                      />
                      {h.marca} — {corCompleta(h.cor, h.corTom)}
                    </span>
                  </TableCell>
                  <TableCell>{h.material}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs" title={h.ondeComprou ?? ""}>
                    {h.ondeComprou ? (
                      h.ondeComprou
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatIsoDatePtBr(h.dataCompra)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {h.dataEntrega ? formatIsoDatePtBr(h.dataEntrega) : "Pendente"}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {dataParaPagamento ? formatIsoDatePtBr(dataParaPagamento) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {h.dataFim ? formatIsoDatePtBr(h.dataFim) : "—"}
                  </TableCell>
                  <TableCell>
                    {qCfg ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs"
                        style={{ borderColor: qCfg.color, color: qCfg.color }}
                      >
                        {(() => {
                          const Icon = qCfg.icon;
                          return <Icon className="h-3 w-3" />;
                        })()}
                        {qCfg.label}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate text-xs text-muted-foreground"
                    title={h.observacao ?? h.comentario ?? ""}
                  >
                    {h.observacao ?? h.comentario ?? "—"}
                  </TableCell>
                  <TableCell>
                    {h.linkProduto ? (
                      <a
                        href={h.linkProduto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(h.precoPago)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEditArchived(h)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setRestoreTarget(h)}
                        title="Reativar"
                        aria-label="Reativar"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <PaginationBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  );
}
