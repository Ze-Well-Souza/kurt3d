const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log("🔍 Verificando políticas RLS (Row Level Security)");
console.log("");

const verifyQuery = `
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('production_calendar', 'portfolio_videos', 'budget_quotes', 'saved_reports')
ORDER BY tablename, policyname;
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
    let policyCount = 0;
    
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
        
        console.log(`   ✓ ${row.policyname} (${row.cmd}) - ${row.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'}`);
        policyCount++;
      }
      console.log(`\n✅ Total de ${policyCount} políticas RLS verificadas!`);
    } else {
      console.log("⚠️ Nenhuma política RLS encontrada");
    }

  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
})();
