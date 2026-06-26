import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../supabase.server";

type PostgrestResult<T> = { data: T | null; error: PostgrestError | null };
type RowWithId = { id: string };

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

export async function replaceById<T extends RowWithId>(table: string, rows: T[]) {
  const supabase = getSupabaseAdminClient();
  const current = unwrapResult(await supabase.from(table).select("id"), {
    table,
    operation: "selectCurrentIds",
    query: "select(id)",
  });
  const currentIds = new Set((current as RowWithId[]).map((row) => row.id));
  const nextIds = new Set(rows.map((row) => row.id));

  if (rows.length > 0) {
    unwrapResult(await supabase.from(table).upsert(rows as never[], { onConflict: "id" }), {
      table,
      operation: "replaceUpsert",
      query: "upsert(onConflict=id)",
      metadata: { count: rows.length },
    });
  }

  const toDelete = [...currentIds].filter((id) => !nextIds.has(id));
  if (toDelete.length > 0) {
    unwrapResult(await supabase.from(table).delete().in("id", toDelete), {
      table,
      operation: "replaceDeleteMissing",
      query: "delete().in(id, toDelete)",
      metadata: { count: toDelete.length },
    });
  }
}
