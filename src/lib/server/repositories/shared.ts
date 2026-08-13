import type { PostgrestError } from "@supabase/supabase-js";

type PostgrestResult<T> = { data: T | null; error: PostgrestError | null };

export class RepositoryError extends Error {
  readonly table: string;
  readonly operation: string;
  readonly query?: string;
  readonly metadata?: Record<string, unknown>;
  readonly supabaseCode?: string;
  readonly supabaseDetails?: string;
  readonly supabaseHint?: string;

  constructor(params: {
    table: string;
    operation: string;
    error: PostgrestError;
    query?: string;
    metadata?: Record<string, unknown>;
  }) {
    super(`[${params.table}.${params.operation}] ${params.error.message}`);
    this.name = "RepositoryError";
    this.table = params.table;
    this.operation = params.operation;
    this.query = params.query;
    this.metadata = params.metadata;
    this.supabaseCode = params.error.code;
    this.supabaseDetails = params.error.details;
    this.supabaseHint = params.error.hint;
    (this as Error & { cause?: unknown }).cause = params.error;
  }
}

export function unwrapResult<T>(
  result: PostgrestResult<T>,
  context: {
    table: string;
    operation: string;
    query?: string;
    metadata?: Record<string, unknown>;
  },
): T {
  if (result.error) {
    throw new RepositoryError({
      table: context.table,
      operation: context.operation,
      query: context.query,
      metadata: context.metadata,
      error: result.error,
    });
  }
  return (result.data ?? null) as T;
}
