import { readFile } from "node:fs/promises";

const projectRef = "huvxpxwfqyrlpfzlaozq";
const managementToken = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";

const query = await readFile(
  new URL("../supabase/migrations/20260731000000_budget_quotes_updated_at.sql", import.meta.url),
  "utf-8",
);

console.log("🚀 Aplicando migration: budget_quotes updated_at\n");

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${managementToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, read_only: false }),
});

const text = await response.text();

if (!response.ok) {
  console.error(`❌ Erro (${response.status}):`, text);
  process.exit(1);
}

console.log("✅ Migration aplicada com sucesso:", text);
