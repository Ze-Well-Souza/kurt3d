import { createCrudRepo } from "./crud-repo";
import { fromOrderRow, toOrderRow } from "./mappers";

export const ordersRepo = createCrudRepo({
  table: "orders",
  fromRow: fromOrderRow,
  toRow: toOrderRow,
  order: [{ column: "created_at", ascending: false }],
});
