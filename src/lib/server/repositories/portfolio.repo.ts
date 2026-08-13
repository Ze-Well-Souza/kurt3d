import { createCrudRepo } from "./crud-repo";
import { fromPortfolioRow, toPortfolioRow } from "./mappers";

export const portfolioRepo = createCrudRepo({
  table: "portfolio_projects",
  fromRow: fromPortfolioRow,
  toRow: toPortfolioRow,
  order: [{ column: "created_at", ascending: false }],
});
