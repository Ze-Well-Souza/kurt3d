import { createCrudRepo } from "./crud-repo";
import { fromFilamentoRow, toFilamentoRow } from "./mappers";

export const filamentosRepo = createCrudRepo({
  table: "filamentos",
  fromRow: fromFilamentoRow,
  toRow: toFilamentoRow,
  order: [{ column: "created_at", ascending: false }],
});
