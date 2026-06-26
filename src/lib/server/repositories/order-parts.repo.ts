import { getSupabaseAdminClient } from "../supabase.server";
import { fromOrderPartRow, toOrderPartRow } from "./mappers";
import { unwrapResult } from "./shared";

export async function orderPartsRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("order_parts").select("*").order("order_id").order("position"), {
    table: "order_parts",
    operation: "list",
    query: "select(*).order(order_id).order(position)",
  });
  const list = (rows as any[]).map(fromOrderPartRow);

  return {
    list,
    async saveForOrder(orderId: string, next: ReturnType<typeof fromOrderPartRow>[]) {
      const current = unwrapResult(await supabase.from("order_parts").select("id").eq("order_id", orderId), {
        table: "order_parts",
        operation: "selectCurrentIds",
        query: "select(id).eq(order_id, orderId)",
        metadata: { orderId },
      }) as { id: string }[];

      if (next.length > 0) {
        unwrapResult(await supabase.from("order_parts").upsert(next.map(toOrderPartRow) as never[], { onConflict: "id" }), {
          table: "order_parts",
          operation: "upsertForOrder",
          query: "upsert(onConflict=id)",
          metadata: { orderId, count: next.length },
        });
      }

      const nextIds = new Set(next.map((item) => item.id));
      const toDelete = current.map((item) => item.id).filter((id) => !nextIds.has(id));
      if (toDelete.length > 0) {
        unwrapResult(await supabase.from("order_parts").delete().in("id", toDelete), {
          table: "order_parts",
          operation: "deleteMissingForOrder",
          query: "delete().in(id, toDelete)",
          metadata: { orderId, count: toDelete.length },
        });
      }
    },
  };
}
