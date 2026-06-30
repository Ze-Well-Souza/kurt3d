const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log("🔍 Verificando triggers criados nas tabelas migradas");
console.log("");

const verifyQuery = `
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table IN ('production_calendar', 'portfolio_videos', 'budget_quotes', 'saved_reports')
ORDER BY event_object_table, trigger_name;
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
    let triggerCount = 0;
    
    if (result && Array.isArray(result) && result.length > 0) {
      for (const row of result) {
        if (row.event_object_table !== currentTable) {
          if (currentTable !== null) console.log("");
          currentTable = row.event_object_table;
          const tableDesc = {
            'production_calendar': '📅 Calendário de Produção',
            'portfolio_videos': '🎬 Vídeos/Reels',
            'budget_quotes': '💰 Orçamentos',
            'saved_reports': '📊 Relatórios Salvos'
          };
          console.log(`${tableDesc[currentTable] || currentTable}:`);
        }
        
        console.log(`   ✓ ${row.trigger_name} (${row.event_manipulation})`);
        triggerCount++;
      }
      console.log(`\n✅ Total de ${triggerCount} triggers verificados!`);
      console.log("   Estes triggers atualizam automaticamente o campo updated_at.");
    } else {
      console.log("⚠️ Nenhum trigger encontrado");
    }

  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
})();
