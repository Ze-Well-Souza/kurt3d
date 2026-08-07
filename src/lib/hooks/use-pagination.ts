import { useEffect, useMemo, useState } from "react";

/**
 * Paginacao generica de listas (financeiro e estoque).
 * `resetKey` deve mudar quando filtros/periodo mudarem, para voltar a pagina 1.
 */
export function usePagination<T>(rows: T[], resetKey: string, pageSize = 25) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

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
    total: rows.length,
    pageRows,
  };
}
