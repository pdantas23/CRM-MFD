// Helper compartilhado: "hoje" como YYYY-MM-DD no fuso de São Paulo,
// independente de onde o código roda (server em UTC, browser local, etc.).
// Util puro — sem "use server"/"use client" — reusável em qualquer camada.

/** Retorna a data civil de hoje (YYYY-MM-DD) em America/Sao_Paulo. */
export function hojeISOSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Uma entrega está atrasada se não foi realizada e a data já passou. */
export function ehAtrasada(
  entrega: { entregue_em: string | null; data: string },
  hojeIso: string
): boolean {
  return !entrega.entregue_em && entrega.data < hojeIso;
}
