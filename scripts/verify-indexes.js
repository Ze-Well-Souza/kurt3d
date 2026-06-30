const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log("🔍 Verificando índices criados nas tabelas migradas");
console.log("");

const verifyQuery = `
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('production_calendar', 'portfolio_videos', 'budget_quotes', 'saved_reports')
ORDER BY tablename, indexname;
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
    let indexCount = 0;
    
    if (result && Array.isArray(result) && result.length > 0) {
      for (const row of result) {
        if (row.tablename !== currentTable) {
          if (currentTable !== null) console.log("");
          currentTable = row.tablename;
          const tableDesc = {
            'production_calendar': '📅 Calendário de Produção',
            'portfolio_videos': '🎬 Vídeos/Reels',
            'budget_quotes': '💰 Orçamentos',
            'saved_reports': '📊 Relatórios Salvos'
          };
          console.log(`${tableDesc[currentTable] || currentTable}:`);
        }
        
        console.log(`   ✓ ${row.indexname}`);
        indexCount++;
      }
      console.log(`\n✅ Total de ${indexCount} índices verificados!`);
    } else {
      console.log("⚠️ Nenhum índice encontrado (pode ser esperado se os índices tiverem nomes diferentes)");
    }

  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
})();
