// Entrypoint Vitest da suíte de performance server-side.
//
// Roda todos os cenários registrados em cenarios.ts via o motor compare,
// imprime a tabela markdown e FALHA o teste se houver regressão
// (mediana > baseline × 1.25). Cenários sem baseline → ESTABELECER (passa);
// cenários PULADOS (RPC ausente etc.) → SKIPPED (passa).
//
// Na Fase 1 o registro está vazio, então o teste passa trivialmente e serve
// só de sanidade da infraestrutura.

import { describe, it, expect } from "vitest";
import { rodarCompare, tabelaMarkdown } from "./compare";

describe("performance (regressão de tempo)", () => {
  it(
    "medianas dentro do baseline (+25%)",
    async () => {
      const { linhas, regrediu } = await rodarCompare();
      // Saída legível no terminal do Vitest.
      console.log(`\n${tabelaMarkdown(linhas)}\n`);
      expect(regrediu, "alguma mediana excedeu baseline × 1.25").toBe(false);
    },
    // Timeout generoso: warmups + N execuções por cenário contra o banco real.
    600_000
  );
});
