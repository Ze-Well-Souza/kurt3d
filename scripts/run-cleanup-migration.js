import { readFile } from "node:fs/promises";

const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log(`🚀 Applying cleanup migration to project: ${SUPABASE_PROJECT_REF}`);
console.log("");

try {
  const migrationQuery = await readFile(
    new URL("../supabase/migrations/20260711000000_data_cleanup_and_portfolio_image.sql", import.meta.url),
    "utf-8"
  );

  console.log("📄 Migration file loaded");
  console.log(`   Size: ${migrationQuery.length} chars`);
  console.log("");

  console.log("🔗 Connecting to Supabase Management API...");
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_MANAGEMENT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: migrationQuery,
        read_only: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("");
    console.error(`❌ Migration failed! HTTP ${response.status}`);
    console.error(`   Details: ${errorText}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log("");
  console.log("✅ Migration applied successfully!");
  console.log("");
  console.log("📋 Changes applied:");
  console.log("   ✓ Added image_url to portfolio_projects");
  console.log("   ✓ Normalized date columns (TEXT → DATE)");
  console.log("   ✓ Removed duplicated comentario column");
  console.log("   ✓ Created portfolio-images storage bucket");
  console.log("   ✓ Added lead cleanup index");
  console.log("");

} catch (error) {
  console.error("");
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
