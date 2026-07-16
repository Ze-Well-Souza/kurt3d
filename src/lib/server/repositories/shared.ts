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

/**
 * Extract the missing column name from a PostgREST error, if any.
 * Covers both schema-cache errors (PGRST204) and Postgres undefined-column (42703).
 */
function parseMissingColumn(error: PostgrestError): string | null {
  const schemaCacheMatch = /Could not find the '([^']+)' column/.exec(error.message);
  if (schemaCacheMatch) return schemaCacheMatch[1];
  if (error.code === "42703") {
    const pgMatch = /column\s+(?:"?[\w.]+"?\.)?"?(\w+)"?\s+does not exist/.exec(error.message);
    if (pgMatch) return pgMatch[1];
  }
  return null;
}

function stripColumn<T extends Record<string, unknown>>(rows: T[], column: string): T[] {
  return rows.map((row) => {
    const { [column]: _omitted, ...rest } = row;
    return rest as unknown as T;
  });
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
    // Upsert with graceful fallback: if the live database is missing a column
    // (pending migration), retry without it instead of failing the whole save.
    let payload = rows;
    const droppedColumns: string[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await supabase.from(table).upsert(payload as never[], { onConflict: "id" });
      if (!result.error) break;
      const missingColumn = parseMissingColumn(result.error);
      if (!missingColumn || droppedColumns.includes(missingColumn)) {
        unwrapResult(result, {
          table,
          operation: "replaceUpsert",
          query: "upsert(onConflict=id)",
          metadata: { count: payload.length, droppedColumns },
        });
        break;
      }
      droppedColumns.push(missingColumn);
      console.warn(
        `[repositories] Column "${missingColumn}" missing on table "${table}" — saving without it. Apply pending migrations to persist this field.`,
      );
      payload = stripColumn(payload as Record<string, unknown>[], missingColumn) as unknown as T[];
    }
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
