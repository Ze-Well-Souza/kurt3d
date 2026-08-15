import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  CreditCard,
  ExternalLink,
  Eye,
  LayoutGrid,
  Package,
  Pencil,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Field } from "@/components/admin/stock-fields";
import { formatIsoDatePtBr } from "@/lib/domain/installments";
import type { Filamento } from "@/lib/domain/types";
import { brl } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/use-pagination";
import { getFilamentoAlertLevel } from "@/lib/domain/stock-alert";
import { MATERIALS, QUALIDADE_CONFIG } from "./stock-shared";
import type { FilSortDir, FilSortKey, StockCtx } from "./use-stock-page-state";

/** Cabecalho de coluna ordenavel (padrao de paineis profissionais). */
function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: FilSortKey;
  activeKey: FilSortKey;
  dir: FilSortDir;
  onSort: (k: FilSortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <TableHead
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        title={`Ordenar por ${label}`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export function FilamentsTab({ ctx }: { ctx: StockCtx }) {
  const {
    filamentos,
    filamentoPayments,
    filamentoInstallments,
    filteredFilamentos,
    marcaOptions,
    corOptions,
    lowFilamentosCount,
    totalGramas,
    totalInicial,
    stockView,
    setStockView,
    filSearch,
    setFilSearch,
    filMarcaFilter,
    setFilMarcaFilter,
    filCorFilter,
    setFilCorFilter,
    filMaterialFilter,
    setFilMaterialFilter,
    filSortKey,
    filSortDir,
    toggleFilSort,
    setDetailFilament,
    openEdit,
    setArchiveDialog,
    mutateRemoveFilamento,
  } = ctx;

  // Paginacao vale para as duas vistas (cards/tabela); trocar a vista nao reseta a pagina.
  const pagination = usePagination(
    filteredFilamentos,
    [filSearch, filMarcaFilter, filCorFilter, filMaterialFilter, filSortKey, filSortDir].join("|"),
  );

  return (
    <div className="filament-top rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Estoque Atual de Filamentos</h2>
          <p className="text-xs text-muted-foreground">
            {filteredFilamentos.length} rolo(s) · {totalGramas}g de {totalInicial}g restantes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <Button
              size="sm"
              variant={stockView === "cards" ? "default" : "ghost"}
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => setStockView("cards")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </Button>
            <Button
              size="sm"
              variant={stockView === "table" ? "default" : "ghost"}
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => setStockView("table")}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Tabela
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-b border-border px-4 py-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={filSearch} onChange={setFilSearch} placeholder="Buscar filamento..." />
        <Select value={filMarcaFilter} onValueChange={setFilMarcaFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {marcaOptions.map((marca) => (
              <SelectItem key={marca} value={marca}>
                {marca}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filCorFilter} onValueChange={setFilCorFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por cor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cores</SelectItem>
            {corOptions.map((cor) => (
              <SelectItem key={cor} value={cor}>
                {cor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filMaterialFilter} onValueChange={setFilMaterialFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os materiais</SelectItem>
            {MATERIALS.map((material) => (
              <SelectItem key={material} value={material}>
                {material}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {lowFilamentosCount > 0 && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-6 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {lowFilamentosCount} filamento(s) com estoque baixo considerando saldo disponivel.
          </span>
        </div>
      )}
      {filamentos.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-muted-foreground">
          Nenhum filamento cadastrado. Adicione seu primeiro rolo acima.
        </div>
      ) : stockView === "table" ? (
        /* ───────── TABLE VIEW ───────── */
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="SKU" sortKey="sku" activeKey={filSortKey} dir={filSortDir} onSort={toggleFilSort} />
                <SortableHead label="Marca" sortKey="marca" activeKey={filSortKey} dir={filSortDir} onSort={toggleFilSort} />
                <TableHead>Cor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-center">Pagamento</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-center">Nível</TableHead>
                <TableHead className="text-right">Custo/g</TableHead>
                <TableHead className="text-right">Investido</TableHead>
                <TableHead className="text-right">Consumido</TableHead>
                <TableHead className="text-right">Em Estoque</TableHead>
                <SortableHead label="Data Compra" sortKey="dataCompra" activeKey={filSortKey} dir={filSortDir} onSort={toggleFilSort} />
                <SortableHead label="Entrega" sortKey="dataEntrega" activeKey={filSortKey} dir={filSortDir} onSort={toggleFilSort} />
                <TableHead>Data p/ Pagto</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageRows.map((f) => {
                const availableGrams = f.disponivelGrams ?? f.pesoAtual;
                const percent = f.pesoInicial > 0 ? (availableGrams / f.pesoInicial) * 100 : 0;
                const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
                const alertLevel = getFilamentoAlertLevel(f);
                const isLow = alertLevel === "low";
                const isMedium = alertLevel === "medium";
                const levelColor = isLow ? "#ef4444" : isMedium ? "#e0a93b" : "#5fa8a3";
                const payment = f.paymentId
                  ? filamentoPayments.find((p) => p.id === f.paymentId)
                  : null;
                const insts = payment
                  ? filamentoInstallments.filter((i) => i.paymentId === payment.id)
                  : [];
                const paidCount = insts.filter((i) => i.pago).length;
                const totalInsts = insts.length;
                const firstInstallment = [...insts].sort((a, b) => a.numero - b.numero)[0];
                const dataParaPagamento =
                  payment?.dataParaPagamento ?? firstInstallment?.vencimento ?? null;
                const qCfg = f.qualidade ? QUALIDADE_CONFIG[f.qualidade] : null;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.sku}</TableCell>
                    <TableCell className="font-medium">{f.marca}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ background: levelColor }}
                        />
                        {f.cor}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {f.material}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!payment ? (
                        <span className="text-[10px] text-muted-foreground">—</span>
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
                          {paidCount}/{totalInsts}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="font-semibold">
                        {availableGrams}g
                        <span className="text-muted-foreground"> / {f.pesoInicial}g</span>
                      </div>
                      {f.reservedGrams ? (
                        <div className="text-[10px] text-amber-700">
                          {f.reservedGrams}g reservado(s)
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, percent)}%`,
                              background: levelColor,
                            }}
                          />
                        </div>
                        <span
                          className="w-10 text-right text-xs font-semibold tabular-nums"
                          style={{ color: isLow ? "#ef4444" : undefined }}
                        >
                          {percent.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl(custoPorGrama)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {brl(f.precoPago)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brl((f.pesoInicial - f.pesoAtual) * custoPorGrama)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold filament-text">
                      {brl(f.pesoAtual * custoPorGrama)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatIsoDatePtBr(f.dataCompra)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {f.dataEntrega ? formatIsoDatePtBr(f.dataEntrega) : "Pendente"}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {dataParaPagamento ? formatIsoDatePtBr(dataParaPagamento) : "—"}
                    </TableCell>
                    <TableCell>
                      {qCfg ? (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px]"
                          style={{ borderColor: qCfg.color, color: qCfg.color }}
                        >
                          {qCfg.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {f.linkProduto ? (
                        <a
                          href={f.linkProduto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDetailFilament(f as Filamento)}
                          title="Ver detalhes"
                          aria-label="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(f as Filamento)}
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            setArchiveDialog({
                              open: true,
                              filamentId: f.id,
                              qualidade: f.qualidade ?? "bom",
                              observacao: f.observacao ?? f.comentario ?? "",
                              dataFim: new Date().toISOString().slice(0, 10),
                            })
                          }
                          title="Finalizar (arquivar)"
                          aria-label="Finalizar"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            mutateRemoveFilamento.mutate(f.id);
                            toast.success("Filamento removido.");
                          }}
                          aria-label="Excluir filamento"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Excluir"
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
        </div>
      ) : (
        /* ───────── CARD VIEW ───────── */
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {pagination.pageRows.map((f) => {
            const availableGrams = f.disponivelGrams ?? f.pesoAtual;
            const percent = f.pesoInicial > 0 ? (availableGrams / f.pesoInicial) * 100 : 0;
            const custoPorGrama = f.pesoInicial > 0 ? f.precoPago / f.pesoInicial : 0;
            const alertLevel = getFilamentoAlertLevel(f);
            const isLow = alertLevel === "low";
            const isMedium = alertLevel === "medium";
            const payment = f.paymentId
              ? filamentoPayments.find((p) => p.id === f.paymentId)
              : null;
            const insts = payment
              ? filamentoInstallments.filter((i) => i.paymentId === payment.id)
              : [];
            const paidCount = insts.filter((i) => i.pago).length;
            const dataParaPagamento =
              payment?.dataParaPagamento ??
              [...insts].sort((a, b) => a.numero - b.numero)[0]?.vencimento ??
              null;

            return (
              <div
                key={f.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                {isLow && (
                  <div className="absolute right-3 top-3">
                    <Badge variant="destructive" className="text-xs">
                      Acabando!
                    </Badge>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                    style={{
                      background: isLow
                        ? "rgba(239,68,68,0.15)"
                        : isMedium
                          ? "rgba(224,169,59,0.15)"
                          : "rgba(95,168,163,0.15)",
                    }}
                  >
                    <Package
                      className="h-5 w-5"
                      style={{
                        color: isLow ? "#ef4444" : isMedium ? "#e0a93b" : "#5fa8a3",
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold leading-tight">
                      {f.marca} — {f.cor}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {f.sku}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {f.material}
                      </Badge>
                      {(() => {
                        if (!payment) return null;
                        return payment.formaPagamento === "a_vista" ? (
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
                            {paidCount}/{insts.length}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-end justify-between text-xs">
                    <span className="text-muted-foreground">Estoque restante</span>
                    <span className="font-semibold tabular-nums">
                      {availableGrams}g / {f.pesoInicial}g
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    className={isLow ? "progress-low" : isMedium ? "progress-medium" : ""}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span
                      className="tabular-nums font-medium"
                      style={{ color: isLow ? "#ef4444" : undefined }}
                    >
                      {percent.toFixed(0)}%
                    </span>
                    {f.reservedGrams ? <span>{f.reservedGrams}g reservado(s)</span> : null}
                    <span className="tabular-nums">Custo/g: {brl(custoPorGrama)}</span>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-center">
                    <span className="text-muted-foreground">Investido </span>
                    <span className="font-semibold">{brl(f.precoPago)}</span>
                  </span>
                  <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-center">
                    <span className="text-muted-foreground">Consumido </span>
                    <span className="font-semibold">
                      {brl((f.pesoInicial - f.pesoAtual) * custoPorGrama)}
                    </span>
                  </span>
                  <span className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-center">
                    <span className="text-muted-foreground">Em estoque </span>
                    <span className="font-semibold filament-text">
                      {brl(f.pesoAtual * custoPorGrama)}
                    </span>
                  </span>
                </div>

                {/* Quality badge (if set) */}
                {f.qualidade && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1 text-xs"
                      style={{
                        borderColor: QUALIDADE_CONFIG[f.qualidade].color,
                        color: QUALIDADE_CONFIG[f.qualidade].color,
                      }}
                    >
                      {(() => {
                        const Icon = QUALIDADE_CONFIG[f.qualidade].icon;
                        return <Icon className="h-3 w-3" />;
                      })()}
                      {QUALIDADE_CONFIG[f.qualidade].label}
                    </Badge>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Compra: {formatIsoDatePtBr(f.dataCompra)}</span>
                  <span>
                    Entrega: {f.dataEntrega ? formatIsoDatePtBr(f.dataEntrega) : "Pendente"}
                  </span>
                  <span>
                    Pagto: {dataParaPagamento ? formatIsoDatePtBr(dataParaPagamento) : "—"}
                  </span>
                </div>

                {/* Link (if set) */}
                {f.linkProduto && (
                  <a
                    href={f.linkProduto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver produto
                  </a>
                )}

                {/* Comment (if set) */}
                {(f.observacao ?? f.comentario) && (
                  <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                    "{f.observacao ?? f.comentario}"
                  </p>
                )}

                {/* Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="text-xs text-muted-foreground">
                    {brl(f.precoPago)} ·{" "}
                    <span className="tabular-nums">{formatIsoDatePtBr(f.dataCompra)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setDetailFilament(f as Filamento)}
                      title="Ver detalhes"
                      aria-label="Ver detalhes"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => openEdit(f as Filamento)}
                      title="Editar"
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() =>
                        setArchiveDialog({
                          open: true,
                          filamentId: f.id,
                          qualidade: f.qualidade ?? "bom",
                          observacao: f.observacao ?? f.comentario ?? "",
                          dataFim: new Date().toISOString().slice(0, 10),
                        })
                      }
                      title="Finalizar (arquivar)"
                      aria-label="Finalizar"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        mutateRemoveFilamento.mutate(f.id);
                        toast.success("Filamento removido.");
                      }}
                      aria-label="Excluir filamento"
                      title="Excluir"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
