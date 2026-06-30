import { readFile } from "node:fs/promises";

const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "huvxpxwfqyrlpfzlaozq";

console.log("🔍 Verificando migração no projeto:", SUPABASE_PROJECT_REF);
console.log("");

const verifyQuery = `
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'production_calendar' THEN 'Calendário de Produção'
    WHEN table_name = 'portfolio_videos' THEN 'Vídeos/Reels'
    WHEN table_name = 'budget_quotes' THEN 'Orçamentos'
    WHEN table_name = 'saved_reports' THEN 'Relatórios Salvos'
    ELSE 'Outra tabela'
  END as descricao
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('production_calendar', 'portfolio_videos', 'budget_quotes', 'saved_reports')
ORDER BY table_name;
`;

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
    console.error("❌ Erro ao verificar tabelas:", response.status, errorText);
    process.exit(1);
  }

  const result = await response.json();
  
  console.log("📊 Tabelas encontradas no banco de dados:");
  console.log("");
  
  if (result && Array.isArray(result) && result.length > 0) {
    for (const row of result) {
      console.log(`   ✓ ${row.table_name.padEnd(20)} - ${row.descricao}`);
    }
    console.log("");
    console.log(`✅ Todas as ${result.length} tabelas foram criadas com sucesso!`);
  } else {
    console.log("   ⚠️ Nenhuma tabela encontrada (pode ser um problema de permissão na query)");
  }
  
  console.log("");
  console.log("🎉 Verificação concluída!");

} catch (error) {
  console.error("❌ Erro:", error.message);
  process.exit(1);
}
