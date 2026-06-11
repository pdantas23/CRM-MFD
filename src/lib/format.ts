const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(valor: number): string {
  return brl.format(valor);
}

// Converte "YYYY-MM-DD" para "DD/MM/YYYY" sem criar Date (evita
// deslocamento de fuso horário em datas puras).
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
