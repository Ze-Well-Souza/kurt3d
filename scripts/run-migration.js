import { readFile } from "node:fs/promises";

// Token fornecido pelo usuário
const SUPABASE_MANAGEMENT_TOKEN = "sbp_fb4beb98a448eed5b1b4ba096dbad962e8b42dc2";

// Precisamos descobrir o project_ref - vamos tentar extrair da URL se existir
// Ou o usuário precisa fornecer
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;

if (!SUPABASE_PROJECT_REF) {
  console.error("Erro: SUPABASE_PROJECT_REF não definido.");
  console.error("Por favor, defina a variável de ambiente SUPABASE_PROJECT_REF com o ID do seu projeto Supabase.");
  console.error("Exemplo: export SUPABASE_PROJECT_REF=xxxxxxxxxxxxxx");
  process.exit(1);
}

console.log(`🚀 Iniciando migração para o projeto: ${SUPABASE_PROJECT_REF}`);
console.log("");

try {
  // Ler o arquivo de migration
  const migrationQuery = await readFile(
    new URL("../supabase/migrations/20240630_new_features.sql", import.meta.url),
    "utf-8"
  );

  console.log("📄 Arquivo de migration lido com sucesso");
  console.log(`   Tamanho: ${migrationQuery.length} caracteres`);
  console.log("");

  // Executar a migration via API do Supabase
  console.log("🔗 Conectando à API do Supabase...");
  
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
    console.error("❌ Erro ao aplicar migration!");
    console.error(`   Status HTTP: ${response.status}`);
    console.error(`   Detalhes: ${errorText}`);
    console.error("");
    console.error("Possíveis causas:");
    console.error("   1. Token de gerenciamento inválido ou expirado");
    console.error("   2. Project Ref incorreto");
    console.error("   3. Permissões insuficientes no token");
    console.error("   4. Tabelas já existem (ignore se for o caso)");
    process.exit(1);
  }

  const result = await response.json();
  
  console.log("");
  console.log("✅ Migration aplicada com sucesso!");
  console.log("");
  console.log("📊 Resultado:");
  console.log(`   Status: ${response.status}`);
  if (result && typeof result === 'object') {
    console.log(`   Resposta: ${JSON.stringify(result).substring(0, 200)}...`);
  }
  console.log("");
  console.log("📋 Tabelas criadas/atualizadas:");
  console.log("   ✓ production_calendar (Calendário de Produção)");
  console.log("   ✓ portfolio_videos (Vídeos/Reels)");
  console.log("   ✓ budget_quotes (Orçamentos)");
  console.log("   ✓ saved_reports (Relatórios Salvos)");
  console.log("");
  console.log("🎉 Migração concluída! As novas funcionalidades estão disponíveis.");
  console.log("");
  console.log("Próximos passos:");
  console.log("   1. Acesse /admin/calendar para gerenciar o calendário de produção");
  console.log("   2. Acesse /admin/reports para visualizar relatórios");
  console.log("   3. Use a função de exportação CSV em Finanças e Pedidos");
  console.log("");

} catch (error) {
  console.error("");
  console.error("❌ Erro durante a migração:");
  console.error(`   ${error.message}`);
  console.error("");
  if (error.stack) {
    console.error("Stack trace:");
    console.error(error.stack);
  }
  process.exit(1);
}
