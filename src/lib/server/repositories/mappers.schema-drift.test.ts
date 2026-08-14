import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// Guarda contra deriva entre mappers.ts e supabase/schema.sql
// ═══════════════════════════════════════════════════════════════════════════
// Descoberta durante esta auditoria: `orders.printer` e `users.active` eram
// lidos/gravados por mappers.ts havia semanas, mas as colunas nunca existiram
// no banco de producao (a migration de `users.active` nunca foi consolidada
// em schema.sql; a de `orders.printer` existia só como ALTER solto).
//
// Antes (com o fallback `stripColumn` em replaceById), isso falhava em
// silêncio: a gravação seguia sem o campo, sem nenhum aviso. Depois do P0-1
// remover esse fallback, o mesmo problema virou erro visível — o que é
// correto, mas só é descoberto em produção quando alguém salva.
//
// Este teste faz a mesma verificação estaticamente: toda coluna snake_case
// que um mapper lê ou escreve precisa aparecer em pelo menos uma linha de
// `create table` ou `alter table ... add column` do schema canônico.

const schemaSql = readFileSync("supabase/schema.sql", "utf-8");
const mappersSrc = readFileSync("src/lib/server/repositories/mappers.ts", "utf-8");
const extendedSrc = readFileSync("src/lib/server/repositories/extended-repos.ts", "utf-8");

/** Todas as colunas declaradas em CREATE TABLE ou ALTER TABLE ADD COLUMN, por tabela. */
function extractDeclaredColumns(sql: string): Map<string, Set<string>> {
  const byTable = new Map<string, Set<string>>();
  const ensure = (t: string) => byTable.get(t) ?? (byTable.set(t, new Set()), byTable.get(t)!);

  const createRe = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  for (const m of sql.matchAll(createRe)) {
    const [, table, body] = m;
    const cols = ensure(table);
    for (const line of body.split("\n")) {
      const colMatch = /^\s*(\w+)\s+[a-zA-Z]/.exec(line);
      if (colMatch) cols.add(colMatch[1]);
    }
  }

  const alterRe = /alter table public\.(\w+)\s+add column if not exists\s+(\w+)/g;
  for (const m of sql.matchAll(alterRe)) {
    ensure(m[1]).add(m[2]);
  }

  return byTable;
}

const TABLE_BY_MAPPER: Record<string, string> = {
  fromUserRow: "users",
  fromFilamentoRow: "filamentos",
  fromFilamentoHistoryRow: "filamentos_history",
  fromOrderRow: "orders",
  fromOrderPartRow: "order_parts",
  fromPortfolioRow: "portfolio_projects",
  fromInsumoRow: "insumos",
  fromVendaRow: "vendas",
  fromInventoryRow: "inventory_txns",
  fromPaymentRow: "filamento_payments",
  fromInsumoPaymentRow: "insumo_payments",
  fromInstallmentRow: "filamento_payment_installments",
  fromFilamentoPaymentEventRow: "filamento_payment_events",
  fromInsumoInstallmentRow: "insumo_payment_installments",
  fromInsumoPaymentEventRow: "insumo_payment_events",
  fromExpenseRow: "expenses",
  fromOrderPaymentRow: "order_payments",
  fromLeadRow: "leads",
  fromClientRow: "clients",
  fromSettingsRow: "app_settings",
  fromProductionCalendarRow: "production_calendar",
  fromBudgetQuoteRow: "budget_quotes",
  fromPortfolioVideoRow: "portfolio_videos",
  fromSavedReportRow: "saved_reports",
  fromReceiptRow: "receipts",
};

function extractFunctionBody(src: string, fnName: string): string {
  const re = new RegExp(`function ${fnName}\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`);
  const m = re.exec(src);
  if (!m) throw new Error(`funcao ${fnName} nao encontrada no arquivo`);
  return m[1];
}

describe("mappers.ts nao referencia coluna ausente do schema.sql", () => {
  const declared = extractDeclaredColumns(schemaSql);
  const src = `${mappersSrc}\n${extendedSrc}`;

  for (const [fnName, table] of Object.entries(TABLE_BY_MAPPER)) {
    it(`${fnName} só lê colunas declaradas em "${table}"`, () => {
      const body = extractFunctionBody(src, fnName);
      const colsRead = new Set([...body.matchAll(/row\.([a-z][a-z0-9_]*)\b/g)].map((m) => m[1]));
      const declaredCols = declared.get(table);
      expect(declaredCols, `tabela "${table}" não encontrada em schema.sql`).toBeDefined();

      const faltando = [...colsRead].filter((c) => !declaredCols!.has(c));
      expect(faltando, `colunas lidas por ${fnName} mas ausentes de schema.sql`).toEqual([]);
    });
  }
});
