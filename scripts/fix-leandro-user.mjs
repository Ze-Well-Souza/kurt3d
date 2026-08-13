// Script temporário: limpa dados do usuário Leandro para permitir recadastro limpo.
// Uso: node scripts/fix-leandro-user.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const eq = line.indexOf("=");
      return [
        line.slice(0, eq).trim(),
        line
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Busca usuários que possam ser o Leandro (nome ou username)
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    process.exit(1);
  }

  console.log(`\n=== ${data.length} usuários encontrados ===\n`);

  const leandroUsers = data.filter(
    (u) =>
      (u.nome && u.nome.toLowerCase().includes("leandro")) ||
      (u.username && u.username.toLowerCase().includes("leandro")),
  );

  if (leandroUsers.length === 0) {
    console.log("Nenhum usuário 'Leandro' encontrado. Listando todos os usuários:");
    data.forEach((u) => {
      console.log(`  id: ${u.id}`);
      console.log(`  nome: ${u.nome ?? "(vazio)"}`);
      console.log(`  username: ${u.username}`);
      console.log(`  phone: ${u.phone ?? "(vazio)"}`);
      console.log(`  role: ${u.role}`);
      console.log("  ---");
    });
    console.log("\nExecute o script novamente com o ID do usuário a limpar:");
    console.log("  node scripts/fix-leandro-user.mjs <USER_ID>");
    return;
  }

  const userId = process.argv[2] || leandroUsers[0].id;

  if (process.argv[2]) {
    const target = data.find((u) => u.id === userId);
    if (!target) {
      console.error(`Usuário com ID "${userId}" não encontrado.`);
      process.exit(1);
    }
    console.log(`Limpando usuário: ${target.nome ?? target.username} (${target.id})`);
    console.log(`  phone atual: ${target.phone ?? "(vazio)"}`);
    console.log(`  nome atual: ${target.nome ?? "(vazio)"}`);

    const { error: updateError } = await supabase
      .from("users")
      .update({ phone: null, nome: null })
      .eq("id", userId);

    if (updateError) {
      console.error("Erro ao atualizar:", updateError);
      process.exit(1);
    }

    console.log("✅ Usuário limpo com sucesso. Phone e nome foram removidos.");
    return;
  }

  // Sem argumento: mostra os candidatos
  console.log("Usuários que contêm 'Leandro':");
  leandroUsers.forEach((u) => {
    console.log(`  id: ${u.id}`);
    console.log(`  nome: ${u.nome ?? "(vazio)"}`);
    console.log(`  username: ${u.username}`);
    console.log(`  phone: ${u.phone ?? "(vazio)"}`);
    console.log(`  role: ${u.role}`);
    console.log(`  must_change_password: ${u.must_change_password}`);
    console.log("  ---");
  });

  if (leandroUsers.length === 1) {
    console.log(`\nPara limpar este usuário, execute:`);
    console.log(`  node scripts/fix-leandro-user.mjs ${leandroUsers[0].id}`);
  } else {
    console.log(`\nPara limpar um usuário específico, execute:`);
    console.log(`  node scripts/fix-leandro-user.mjs <USER_ID>`);
  }
}

main();
