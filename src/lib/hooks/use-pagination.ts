import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSizeOption = 20;

/**
 * Paginacao generica de listas (financeiro e estoque).
 * `resetKey` deve mudar quando filtros/periodo mudarem, para voltar a pagina 1.
 * O usuario pode trocar quantos itens ver por pagina (10/20/30) via `setPageSize`;
 * trocar o tamanho tambem volta para a pagina 1, para nao ficar numa pagina vazia.
 */
export function usePagination<T>(
  rows: T[],
  resetKey: string,
  initialPageSize: PageSizeOption = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSizeOption>(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  function setPageSize(size: PageSizeOption) {
    setPageSizeState(size);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return {
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    total: rows.length,
    pageRows,
  };
}
