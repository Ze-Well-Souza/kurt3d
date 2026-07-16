// Quick diagnostic: verify live DB columns for portfolio_projects + test insert path
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL_BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function main() {
  // 1. Select all columns from portfolio_projects (limit 1) to inspect shape
  const res = await fetch(`${URL_BASE}/rest/v1/portfolio_projects?select=*&limit=1`, { headers });
  console.log("portfolio_projects select status:", res.status);
  const body = await res.json();
  if (Array.isArray(body) && body.length > 0) {
    console.log("columns:", Object.keys(body[0]).join(", "));
  } else {
    console.log("body:", JSON.stringify(body));
  }

  // 2. Explicitly probe the columns the app writes
  const probeCols = ["image_url", "is_public", "published_at", "filamentos", "custos_extras", "custo_kwh", "consumo_kw", "custo_mao_obra_horas", "custo_mao_obra_valor_hora", "taxa_gateway", "perda_percent"];
  for (const col of probeCols) {
    const r = await fetch(`${URL_BASE}/rest/v1/portfolio_projects?select=${col}&limit=1`, { headers });
    console.log(`column ${col}:`, r.status === 200 ? "OK" : `MISSING (${r.status}) ${JSON.stringify(await r.json())}`);
  }

  // 3. Probe orders columns used by createOrderFromPortfolio
  const orderCols = ["portfolio_project_id", "filamento_id", "filamento_ids", "grams_per_unit", "preco_venda", "link_projeto", "client_id", "time_minutes"];
  for (const col of orderCols) {
    const r = await fetch(`${URL_BASE}/rest/v1/orders?select=${col}&limit=1`, { headers });
    console.log(`orders.${col}:`, r.status === 200 ? "OK" : `MISSING (${r.status}) ${JSON.stringify(await r.json())}`);
  }

  // 4. Check storage bucket portfolio-images
  const rb = await fetch(`${URL_BASE}/storage/v1/bucket/portfolio-images`, { headers });
  console.log("bucket portfolio-images:", rb.status === 200 ? "OK" : `MISSING (${rb.status})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
