import { getSupabaseAdminClient } from "../supabase.server";
import { fromSiteContentRow } from "./mappers";
import { unwrapResult } from "./shared";

export async function siteContentRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("site_content").select("*").eq("id", "main").limit(1), {
    table: "site_content",
    operation: "getMainContent",
    query: "select(*).eq(id, main).limit(1)",
  });
  const list = rows as any[];
  const content = list.length > 0 ? fromSiteContentRow(list[0]) : fromSiteContentRow({});
  return {
    content,
    async save(next: typeof content) {
      const client = getSupabaseAdminClient();
      unwrapResult(
        await client.from("site_content").upsert(
          { id: "main", content: next, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        ),
        {
          table: "site_content",
          operation: "save",
          query: "upsert(onConflict=id)",
        },
      );
    },
  };
}
