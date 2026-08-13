import { randomUUID } from "node:crypto";
import type { InventoryTxn } from "../../domain/types";
import { nowIso } from "../db.server";
import { createCrudRepo } from "./crud-repo";
import { fromInventoryRow, toInventoryRow } from "./mappers";

const baseRepo = createCrudRepo({
  table: "inventory_txns",
  fromRow: fromInventoryRow,
  toRow: toInventoryRow,
  order: [{ column: "created_at", ascending: false }],
});

export async function inventoryRepo() {
  const repo = await baseRepo();

  return {
    ...repo,

    /** Registra um movimento de estoque (reserva, liberacao ou consumo). */
    async append(txn: Omit<InventoryTxn, "id" | "createdAt">): Promise<InventoryTxn> {
      const row: InventoryTxn = { id: randomUUID(), createdAt: nowIso(), ...txn };
      await repo.insert(row);
      return row;
    },
  };
}
