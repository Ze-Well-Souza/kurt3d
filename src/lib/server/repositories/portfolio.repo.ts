import { getSupabaseAdminClient } from "../supabase.server";
import { fromPortfolioRow, toPortfolioRow } from "./mappers";
import { replaceById, unwrapResult } from "./shared";

export async function portfolioRepo() {
  const supabase = getSupabaseAdminClient();
  const rows = unwrapResult(await supabase.from("portfolio_projects").select("*").order("created_at", { ascending: false }), {
    table: "portfolio_projects",
    operation: "list",
    query: "select(*).order(created_at desc)",
  });
  const list = (rows as any[]).map(fromPortfolioRow);
  return {
    list,
    async save(next: ReturnType<typeof fromPortfolioRow>[]) {
      await replaceById("portfolio_projects", next.map(toPortfolioRow));
    },
  };
}
