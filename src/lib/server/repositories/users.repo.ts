import { getSupabaseAdminClient } from "../supabase.server";
import { fromUserRow, toUserRow, type User } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export type { User };

export async function usersRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("users").select("*").order("created_at", { ascending: false }), {
    table: "users",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromUserRow);
  return {
    list,
    async save(next: User[]) {
      await replaceById("users", next.map(toUserRow));
    },
  };
}
