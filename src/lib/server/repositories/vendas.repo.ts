import { createCrudRepo } from "./crud-repo";
import { fromVendaRow, toVendaRow } from "./mappers";

export const vendasRepo = createCrudRepo({
  table: "vendas",
  fromRow: fromVendaRow,
  toRow: toVendaRow,
  order: [{ column: "data", ascending: false }],
});
