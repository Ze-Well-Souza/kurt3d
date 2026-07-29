import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Primeiro teste do arquivo paga o custo de import/transform sob carga;
    // 5s (padrao) causava timeouts intermitentes em maquinas mais lentas.
    testTimeout: 20000,
  },
});

