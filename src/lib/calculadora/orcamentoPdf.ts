// Gera um PDF simples do orçamento de materiais pela impressão do navegador
// (abre uma janela formatada → "Salvar como PDF"). Sem dependências externas.
// Placeholder até a opção de virar um orçamento do sistema.

import type { ResultadoItem } from "./materiais";

export interface DadosOrcamento {
  titulo: string; // ex.: "Parede Simples"
  composicao?: string; // ex.: "1 chapa ST e 1 RU em cada face"
  area: number;
  itens: ResultadoItem[];
}

function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return m[c];
  });
}

export function imprimirOrcamentoPdf(d: DadosOrcamento): void {
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) return; // bloqueado por popup

  const data = new Date().toLocaleDateString("pt-BR");
  const area = d.area.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const linhas = d.itens
    .map(
      (i) =>
        `<tr><td>${esc(i.nome)}</td><td class="q">${esc(i.quantidade)}</td><td>${esc(i.unidade)}</td></tr>`,
    )
    .join("");

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Orçamento de materiais — ${esc(d.titulo)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1f2937; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; }
  .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .meta { font-size: 12px; color: #6b7280; text-align: right; }
  .resumo { margin: 18px 0; font-size: 13px; }
  .resumo div { margin-bottom: 4px; }
  .resumo strong { display: inline-block; min-width: 110px; color: #6b7280; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #6b7280; }
  td.q, th.q { text-align: right; font-variant-numeric: tabular-nums; }
  footer { margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
</style></head><body>
  <header>
    <div>
      <h1>Modular Forros e Divisórias Drywall</h1>
      <div class="sub">Orçamento de materiais</div>
    </div>
    <div class="meta">${esc(data)}</div>
  </header>

  <div class="resumo">
    <div><strong>Estrutura</strong> ${esc(d.titulo)}</div>
    ${d.composicao ? `<div><strong>Composição</strong> ${esc(d.composicao)}</div>` : ""}
    <div><strong>Área</strong> ${esc(area)} m²</div>
  </div>

  <table>
    <thead><tr><th>Material</th><th class="q">Qtd.</th><th>Unidade</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>

  <footer>Quantidades estimadas por metragem. Documento gerado pela calculadora do sistema.</footer>
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
