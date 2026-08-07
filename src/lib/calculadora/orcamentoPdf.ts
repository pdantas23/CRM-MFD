// Gera PDFs simples de orçamento pela impressão do navegador (abre uma janela
// formatada → "Salvar como PDF"). Sem dependências externas. Placeholder até a
// opção de virar um orçamento do sistema. Dois formatos: materiais de drywall
// (imprimirOrcamentoPdf) e piso vinílico (imprimirOrcamentoPisoPdf).

import type { ResultadoItem } from "./materiais";

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

function brl2(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ESTILO = `
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1f2937; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; }
  h1 { font-size: 18px; margin: 0; }
  h2 { font-size: 13px; margin: 22px 0 6px; color: #374151; }
  .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .meta { font-size: 12px; color: #6b7280; text-align: right; }
  .resumo { margin: 18px 0; font-size: 13px; }
  .resumo div { margin-bottom: 4px; }
  .resumo strong { display: inline-block; min-width: 120px; color: #6b7280; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #6b7280; }
  td.q, th.q { text-align: right; font-variant-numeric: tabular-nums; }
  .det { font-size: 11px; color: #9ca3af; }
  footer { margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
`;

// Abre a janela de impressão com o corpo informado.
function abrirImpressao(tituloPagina: string, corpo: string): void {
  const win = window.open("", "_blank", "width=820,height=920");
  if (!win) return; // bloqueado por popup
  win.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
      `<title>${esc(tituloPagina)}</title><style>${ESTILO}</style></head><body>${corpo}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
}

function cabecalho(subtitulo: string): string {
  const data = new Date().toLocaleDateString("pt-BR");
  return `<header><div><h1>Modular Forros e Divisórias Drywall</h1>
    <div class="sub">${esc(subtitulo)}</div></div><div class="meta">${esc(data)}</div></header>`;
}

// ── Drywall (paredes/forros) ─────────────────────────────────────────────────

export interface DadosOrcamento {
  titulo: string; // ex.: "Parede Simples"
  composicao?: string; // ex.: "1 chapa ST e 1 RU em cada face"
  area: number;
  itens: ResultadoItem[];
}

export function imprimirOrcamentoPdf(d: DadosOrcamento): void {
  const linhas = d.itens
    .map((i) => `<tr><td>${esc(i.nome)}</td><td class="q">${esc(i.quantidade)}</td><td>${esc(i.unidade)}</td></tr>`)
    .join("");
  const corpo = `${cabecalho("Orçamento de materiais")}
    <div class="resumo">
      <div><strong>Estrutura</strong> ${esc(d.titulo)}</div>
      ${d.composicao ? `<div><strong>Composição</strong> ${esc(d.composicao)}</div>` : ""}
      <div><strong>Área</strong> ${esc(brl2(d.area))} m²</div>
    </div>
    <table><thead><tr><th>Material</th><th class="q">Qtd.</th><th>Unidade</th></tr></thead>
    <tbody>${linhas}</tbody></table>
    <footer>Quantidades estimadas por metragem. Documento gerado pela calculadora do sistema.</footer>`;
  abrirImpressao(`Orçamento de materiais — ${d.titulo}`, corpo);
}

// ── Piso vinílico ────────────────────────────────────────────────────────────

export interface DadosOrcamentoPiso {
  marca: string;
  piso: string; // ex.: "Sofisticato Colado"
  formato: string; // "Réguas" | "Placas" | "Mantas"
  dimensao: string;
  espessura: string;
  m2Caixa: number;
  uso: string;
  area: number;
  unidade: string; // "caixa(s)" | "rolo(s)"
  real: number;
  recomendada: number;
  areaCoberta: number;
  insumos: { nome: string; quantidade: number; unidade: string; detalhe: string }[];
}

export function imprimirOrcamentoPisoPdf(d: DadosOrcamentoPiso): void {
  const emb = d.unidade === "rolo(s)" ? "rolo" : "cx";
  const insumos = d.insumos
    .map(
      (i) =>
        `<tr><td>${esc(i.nome)}<div class="det">${esc(i.detalhe)}</div></td>` +
        `<td class="q">${esc(i.quantidade)}</td><td>${esc(i.unidade)}</td></tr>`,
    )
    .join("");
  const corpo = `${cabecalho("Orçamento de piso vinílico")}
    <div class="resumo">
      <div><strong>Marca</strong> ${esc(d.marca)}</div>
      <div><strong>Piso</strong> ${esc(d.piso)} (${esc(d.formato)})</div>
      <div><strong>Especificação</strong> ${esc(d.dimensao)} · ${esc(d.espessura)} · ${esc(brl2(d.m2Caixa))} m²/${emb}</div>
      <div><strong>Uso</strong> ${esc(d.uso)}</div>
      <div><strong>Área da obra</strong> ${esc(brl2(d.area))} m²</div>
    </div>
    <h2>Piso</h2>
    <table><tbody>
      <tr><td>Quantidade real (calculada)</td><td class="q">${esc(brl2(d.real))}</td><td>${esc(d.unidade)}</td></tr>
      <tr><td>Quantidade recomendada (+10%)</td><td class="q">${esc(d.recomendada)}</td><td>${esc(d.unidade)}</td></tr>
      <tr><td>Área coberta</td><td class="q">${esc(brl2(d.areaCoberta))}</td><td>m²</td></tr>
    </tbody></table>
    <h2>Insumos</h2>
    <table><thead><tr><th>Material</th><th class="q">Qtd.</th><th>Unidade</th></tr></thead>
    <tbody>${insumos}</tbody></table>
    <footer>Quantidades estimadas. Recomendada = real + 10%, em ${emb === "rolo" ? "rolos" : "caixas"} fechados.
    Documento gerado pela calculadora do sistema.</footer>`;
  abrirImpressao(`Orçamento de piso — ${d.piso}`, corpo);
}
