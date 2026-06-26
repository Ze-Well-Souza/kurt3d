import { getSupabaseAdminClient } from "../supabase.server";
import { fromSettingsRow, toSettingsRow } from "./mappers";
import { unwrapResult } from "./shared";

export async function settingsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("app_settings").select("*").eq("id", "main").limit(1), {
    table: "app_settings",
    operation: "getMainSettings",
    query: "select(*).eq(id, main).limit(1)",
  });
  const list = rows as any[];
  const settings = list.length > 0 ? fromSettingsRow(list[0]) : fromSettingsRow({});
  return {
    settings,
    async save(next: typeof settings) {
      const client = getSupabaseAdminClient();
      unwrapResult(await client.from("app_settings").upsert(toSettingsRow(next), { onConflict: "id" }), {
        table: "app_settings",
        operation: "save",
        query: "upsert(onConflict=id)",
      });
    },
  };
}
