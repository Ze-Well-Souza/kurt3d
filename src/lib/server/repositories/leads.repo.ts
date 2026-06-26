import { getSupabaseAdminClient } from "../supabase.server";
import { fromLeadRow, toLeadRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function leadsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("leads").select("*").order("created_at", { ascending: false }), {
    table: "leads",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromLeadRow);
  return {
    list,
    async save(next: ReturnType<typeof fromLeadRow>[]) {
      await replaceById("leads", next.map(toLeadRow));
    },
    async insert(lead: ReturnType<typeof fromLeadRow>) {
      unwrapResult(await supabase.from("leads").insert(toLeadRow(lead)), {
        table: "leads",
        operation: "insert",
        query: "insert(lead)",
        metadata: { leadId: lead.id },
      });
    },
  };
}
