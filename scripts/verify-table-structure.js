const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log("🔍 Verificando estrutura detalhada das tabelas migradas");
console.log("");

const verifyQuery = `
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('production_calendar', 'portfolio_videos', 'budget_quotes', 'saved_reports')
ORDER BY table_name, ordinal_position;
`;

(async () => {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_MANAGEMENT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: verifyQuery,
          read_only: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro:", response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    let currentTable = null;
    
    if (result && Array.isArray(result) && result.length > 0) {
      for (const row of result) {
        if (row.table_name !== currentTable) {
          if (currentTable !== null) console.log("");
          currentTable = row.table_name;
          const tableDesc = {
            'production_calendar': '📅 Calendário de Produção',
            'portfolio_videos': '🎬 Vídeos/Reels',
            'budget_quotes': '💰 Orçamentos',
            'saved_reports': '📊 Relatórios Salvos'
          };
          console.log(`\n${tableDesc[currentTable] || currentTable}:`);
          console.log("─".repeat(50));
        }
        
        const nullable = row.is_nullable === 'YES' ? '?' : '!';
        console.log(`   ${row.column_name.padEnd(20)} ${row.data_type.padEnd(15)} ${nullable}`);
      }
      console.log("\n✅ Estrutura verificada com sucesso!");
    } else {
      console.log("⚠️ Nenhum resultado retornado");
    }

  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
})();
