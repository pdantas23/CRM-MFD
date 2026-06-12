import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Config mínima do Vitest — só para a suíte de performance.
// Resolve o alias "@/..." para src/ (igual ao tsconfig paths) e roda em Node
// (os cenários batem no Supabase via @supabase/supabase-js, sem DOM).
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/perf/**/*.test.ts"],
    // Sem cache entre runs — queremos medida fria por execução no CI.
    cache: false,
  },
});
