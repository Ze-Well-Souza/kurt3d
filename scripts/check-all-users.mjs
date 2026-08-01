// Verifica todos os usuários no banco, buscando qualquer registro com telefone 11941044187 ou nome "Leandro"
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
      return [line.slice(0, eq).trim(), line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    console.error("Erro:", error);
    process.exit(1);
  }

  console.log(`\n=== ${data.length} usuários no banco ===\n`);

  // Busca por telefone 11941044187
  const byPhone = data.filter((u) => u.phone && u.phone.includes("11941044187"));

  // Busca por nome contendo "Leandro"
  const byName = data.filter(
    (u) => u.nome && u.nome.toLowerCase().includes("leandro"),
  );

  // Busca por username contendo "Leandro"
  const byUsername = data.filter(
    (u) => u.username && u.username.toLowerCase().includes("leandro"),
  );

  console.log("--- Por telefone 11941044187 ---");
  if (byPhone.length === 0) {
    console.log("  Nenhum encontrado.\n");
  } else {
    byPhone.forEach((u) => {
      console.log(`  id: ${u.id}`);
      console.log(`  nome: ${u.nome ?? "(vazio)"}`);
      console.log(`  username: ${u.username}`);
      console.log(`  phone: ${u.phone ?? "(vazio)"}`);
      console.log(`  role: ${u.role}`);
      console.log(`  must_change_password: ${u.must_change_password}`);
      console.log("  ---");
    });
  }

  console.log("--- Por nome 'Leandro' ---");
  if (byName.length === 0) {
    console.log("  Nenhum encontrado.\n");
  } else {
    byName.forEach((u) => {
      console.log(`  id: ${u.id}`);
      console.log(`  nome: ${u.nome ?? "(vazio)"}`);
      console.log(`  username: ${u.username}`);
      console.log(`  phone: ${u.phone ?? "(vazio)"}`);
      console.log(`  role: ${u.role}`);
      console.log(`  must_change_password: ${u.must_change_password}`);
      console.log("  ---");
    });
  }

  console.log("--- Por username 'Leandro' ---");
  if (byUsername.length === 0) {
    console.log("  Nenhum encontrado.\n");
  } else {
    byUsername.forEach((u) => {
      console.log(`  id: ${u.id}`);
      console.log(`  nome: ${u.nome ?? "(vazio)"}`);
      console.log(`  username: ${u.username}`);
      console.log(`  phone: ${u.phone ?? "(vazio)"}`);
      console.log(`  role: ${u.role}`);
      console.log(`  must_change_password: ${u.must_change_password}`);
      console.log("  ---");
    });
  }

  // Mostra todos os usuários para referência
  console.log("=== TODOS OS USUÁRIOS ===");
  data.forEach((u) => {
    console.log(`  [${u.role}] nome="${u.nome ?? ""}" username="${u.username}" phone="${u.phone ?? ""}" mustChange=${u.must_change_password}`);
  });
}

main();
