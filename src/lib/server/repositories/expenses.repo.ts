import { createCrudRepo } from "./crud-repo";
import { fromExpenseRow, toExpenseRow } from "./mappers";

export const expensesRepo = createCrudRepo({
  table: "expenses",
  fromRow: fromExpenseRow,
  toRow: toExpenseRow,
  order: [{ column: "data", ascending: false }],
});
