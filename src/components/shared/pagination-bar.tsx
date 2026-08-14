import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, type PageSizeOption } from "@/lib/hooks/use-pagination";

/**
 * Barra de paginacao compacta das listas do sistema (financeiro, estoque e demais
 * telas administrativas). Some quando nao ha registros (os empty states das abas
 * ja comunicam isso). `onPageSizeChange` e opcional: quando ausente, o seletor de
 * itens por pagina fica oculto (util para listas com tamanho fixo).
 */
export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: PageSizeOption) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs tabular-nums text-muted-foreground">
          {from}–{to} de {total}
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value) as PageSizeOption)}
            >
              <SelectTrigger className="h-7 w-[68px] text-xs" aria-label="Itens por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
