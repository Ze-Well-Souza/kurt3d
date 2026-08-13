import { createCrudRepo } from "./crud-repo";
import { fromLeadRow, toLeadRow } from "./mappers";

export const leadsRepo = createCrudRepo({
  table: "leads",
  fromRow: fromLeadRow,
  toRow: toLeadRow,
  order: [{ column: "created_at", ascending: false }],
});
