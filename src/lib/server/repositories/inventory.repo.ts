import { randomUUID } from "node:crypto";
import { nowIso } from "../db.server";
import { getSupabaseAdminClient } from "../supabase.server";
import { fromInventoryRow, toInventoryRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function inventoryRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("inventory_txns").select("*").order("created_at", { ascending: false }), {
    table: "inventory_txns",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromInventoryRow);
  return {
    list,
    async save(next: ReturnType<typeof fromInventoryRow>[]) {
      await replaceById("inventory_txns", next.map(toInventoryRow));
    },
    async append(txn: Omit<ReturnType<typeof fromInventoryRow>, "id" | "createdAt">) {
      const row = { id: randomUUID(), createdAt: nowIso(), ...txn };
      unwrapResult(await supabase.from("inventory_txns").insert(toInventoryRow(row)), {
        table: "inventory_txns",
        operation: "append",
        query: "insert(txn)",
        metadata: { orderId: txn.orderId, filamentId: txn.filamentId, type: txn.type },
      });
      return row;
    },
  };
}
