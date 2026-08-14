import {
  AlertTriangle,
  Banknote,
  CreditCard,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { extractQuantityNumber, getInsumoAlertLevel } from "@/lib/domain/stock-alert";
import type { StockCtx } from "./use-stock-page-state";

export function InsumosTab({ ctx }: { ctx: StockCtx }) {
  const {
    insumos,
    filteredInsumos,
    insSearch,
    setInsSearch,
    totalInsumos,
    lowInsumosCount,
    unknownInsumosCount,
    getInsumoPaymentMeta,
    setEditInsumo,
    setCreateInsumoOpen,
    mutateRemoveInsumo,
  } = ctx;

  const pagination = usePagination(filteredInsumos, insSearch);

  return (
    <div className="filament-top rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="font-display text-lg font-semibold">Insumos Cadastrados</h2>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={insSearch} onChange={setInsSearch} placeholder="Buscar insumo..." />
          <span className="text-xs text-muted-foreground">
            {filteredInsumos.length} item(ns) · {brl(totalInsumos)}
          </span>
          <Button
            type="button"
            className="btn-filament gap-2"
            onClick={() => setCreateInsumoOpen(true)}
          >
            <Plus className="h-4 w-4" /> Cadastrar Insumo
          </Button>
        </div>
      </div>
      {(lowInsumosCount > 0 || unknownInsumosCount > 0) && (
        <div className="space-y-2 border-b border-amber-500/20 bg-amber-500/5 px-6 py-3 text-sm text-amber-800">
          {lowInsumosCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {lowInsumosCount} insumo(s) com quantidade baixa detectada automaticamente.
              </span>
            </div>
          )}
          {unknownInsumosCount > 0 && (
            <div className="text-xs text-amber-900/80">
              {unknownInsumosCount} item(ns) usam quantidade textual sem numero; nesses casos o
              sistema nao consegue inferir alerta automatico.
            </div>
          )}
        </div>
      )}
      {insumos.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
          Nenhum insumo cadastrado ainda. Use o botão "Cadastrar Insumo" para registrar ferramentas
          e materiais de apoio.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Data p/ Pagto</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Preço Total</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageRows.map((i) => {
              const alertLevel = getInsumoAlertLevel(i);
              const quantityNumber = extractQuantityNumber(i.quantidade);
              const { payment, installments, paidCount, dataParaPagamento } =
                getInsumoPaymentMeta(i);
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell>
                    <div>{i.quantidade}</div>
                    {quantityNumber !== null ? (
                      <div className="text-[10px] text-muted-foreground">
                        Base numerica: {quantityNumber}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {alertLevel === "low" ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Estoque baixo
                      </Badge>
                    ) : alertLevel === "unknown" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Sem leitura automatica
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        OK
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatIsoDatePtBr(i.dataCompra)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {i.classificacaoFinanceira === "investimento"
                        ? "Investimento"
                        : "Operacional"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!payment ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : payment.formaPagamento === "a_vista" ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-600/30 bg-green-50 text-green-700 text-[10px]"
                      >
                        <Banknote className="h-3 w-3" /> À vista
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 text-[10px]"
                      >
                        <CreditCard className="h-3 w-3" />
                        {paidCount}/{installments.length}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {dataParaPagamento ? formatIsoDatePtBr(dataParaPagamento) : "—"}
                  </TableCell>
                  <TableCell>
                    {i.linkProduto ? (
                      <a
                        href={i.linkProduto}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver produto
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(i.precoTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setEditInsumo({
                            id: i.id,
                            nome: i.nome,
                            dataCompra: i.dataCompra,
                            quantidade: i.quantidade,
                            precoTotal: String(i.precoTotal),
                            linkProduto: i.linkProduto ?? "",
                            classificacaoFinanceira: i.classificacaoFinanceira,
                            formaPagamento: payment?.formaPagamento ?? "a_vista",
                            parcelas: String(payment?.parcelas ?? 1),
                            dataParaPagamento: dataParaPagamento ?? i.dataCompra,
                          })
                        }
                        aria-label="Editar insumo"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          mutateRemoveInsumo.mutate(i.id);
                          toast.success("Insumo removido.");
                        }}
                        aria-label="Excluir insumo"
                      >
                        <Trash2 className="h-4 w-4" />
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
