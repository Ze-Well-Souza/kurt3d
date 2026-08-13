import { createCrudRepo } from "./crud-repo";
import { fromClientRow, toClientRow } from "./mappers";

export const clientsRepo = createCrudRepo({
  table: "clients",
  fromRow: fromClientRow,
  toRow: toClientRow,
  order: [{ column: "nome", ascending: true }],
});
