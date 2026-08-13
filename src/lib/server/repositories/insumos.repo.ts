import { createCrudRepo } from "./crud-repo";
import { fromInsumoRow, toInsumoRow } from "./mappers";

export const insumosRepo = createCrudRepo({
  table: "insumos",
  fromRow: fromInsumoRow,
  toRow: toInsumoRow,
  order: [{ column: "data_compra", ascending: false }],
});
