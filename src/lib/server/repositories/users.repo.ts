import { createCrudRepo } from "./crud-repo";
import { fromUserRow, toUserRow, type User } from "./mappers";

export type { User };

export const usersRepo = createCrudRepo({
  table: "users",
  fromRow: fromUserRow,
  toRow: toUserRow,
  order: [{ column: "created_at", ascending: false }],
});
