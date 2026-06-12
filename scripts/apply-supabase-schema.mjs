import { readFile } from "node:fs/promises";

const projectRef = process.env.SUPABASE_PROJECT_REF;
const managementToken = process.env.SUPABASE_MANAGEMENT_TOKEN;

if (!projectRef) {
  throw new Error("SUPABASE_PROJECT_REF não definido");
}

if (!managementToken) {
  throw new Error("SUPABASE_MANAGEMENT_TOKEN não definido");
}

const query = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf-8");

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${managementToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query,
    read_only: false,
  }),
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Falha ao aplicar schema (${response.status}): ${text}`);
}

console.log("Schema aplicado com sucesso no Supabase.");
