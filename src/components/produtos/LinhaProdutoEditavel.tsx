"use client";
// Uma linha da tabela de Produtos, editável no próprio campo. Ao sair de cada
// campo, o que mudou é salvo no CRM (salvamentos da linha em fila, nunca em
// paralelo); o envio ao VHSYS é manual (botão da linha). Valor de venda e
// margem são bidirecionais.

import { useEffect, useRef, useState } from "react";
import { formatBRL, formatarData } from "@/lib/format";
import { enviarProdutoAoVhsys, salvarProduto } from "@/lib/produtos/acoes";
import type { FornecedorVhsys, LinhaProduto } from "@/lib/produtos/dados";
import {
  SEM_SECAO,
  custoLiquido,
  margem,
  precoEquilibrio,
  vendaParaMargem,
} from "@/lib/produtos/precificacao";
import { BadgeConta } from "./BadgeConta";
import { CampoNumero } from "./CampoNumero";
import { SeletorFornecedor } from "./SeletorFornecedor";
import { aplicarEnvio, situacaoDe } from "./situacao";

// Percentuais: o banco guarda fração (0.0982); a tabela mostra pontos (9,82).
const emPct = (f: number | null) => (f === null ? null : Math.round(f * 1e6) / 1e4);
const dePct = (p: number | null) => (p === null ? null : Math.round(p * 1e4) / 1e6);
const brl = (v: number | null) => (v === null ? "—" : formatBRL(v));

interface Form {
  secao: string;
  precoCusto: number | null;
  frete: number | null;
  credito: number | null;
  op: number | null;
  com: number | null;
  imp: number | null;
  venda: number | null;
  fornecedorId: number | null;
}

function formDe(l: LinhaProduto): Form {
  return {
    secao: l.secao === SEM_SECAO ? "" : l.secao,
    precoCusto: l.precoCusto,
    frete: l.frete,
    credito: emPct(l.creditoIcms),
    op: emPct(l.custoOp),
    com: emPct(l.comissao),
    imp: emPct(l.impostoSaida),
    venda: l.valorVenda,
    fornecedorId: l.fornecedorId,
  };
}

const iguais = (a: Form, b: Form) =>
  (Object.keys(a) as (keyof Form)[]).every((k) =>
    typeof a[k] === "number" && typeof b[k] === "number"
      ? Math.abs((a[k] as number) - (b[k] as number)) < 1e-6
      : a[k] === b[k]
  );

export function LinhaProdutoEditavel({
  linha,
  icmsAtual,
  fornecedores,
  onAtualizada,
  onAbrir,
}: {
  linha: LinhaProduto;
  icmsAtual: number;
  /** Fornecedores do VHSYS da conta desta linha. */
  fornecedores: FornecedorVhsys[];
  onAtualizada: (l: LinhaProduto) => void;
  /** Abre o modal do produto (clique no nome). */
  onAbrir: (l: LinhaProduto) => void;
}) {
  const [form, setForm] = useState<Form>(() => formDe(linha));
  const [estado, setEstado] = useState<"livre" | "salvando" | "enviando">("livre");
  const [erro, setErro] = useState<string | null>(null);

  // Últimos valores para a fila de salvamento (que roda depois do render).
  const formRef = useRef(form);
  formRef.current = form;
  const linhaRef = useRef(linha);
  const fila = useRef<Promise<LinhaProduto | null>>(Promise.resolve(null));

  // Dados novos vindos de FORA (ex.: parâmetros alterados) substituem o form.
  // A própria linha salva volta como prop idêntica a linhaRef — aí não mexe no
  // form, para não apagar o que já foi digitado em outro campo nesse meio-tempo.
  useEffect(() => {
    if (linha === linhaRef.current) return;
    linhaRef.current = linha;
    setForm(formDe(linha));
  }, [linha]);

  const mudar = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const sujo = !iguais(form, formDe(linha));

  // Pede confirmação ao fechar/recarregar a página com alteração não salva.
  useEffect(() => {
    if (!sujo && estado !== "salvando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo, estado]);

  // Linha como ficaria salva — base de todas as contas exibidas.
  const atual: LinhaProduto = {
    ...linha,
    secao: form.secao.trim() || SEM_SECAO,
    precoCusto: form.precoCusto,
    frete: form.frete,
    creditoIcms: dePct(form.credito),
    custoOp: dePct(form.op) ?? 0,
    comissao: dePct(form.com) ?? 0,
    impostoSaida: dePct(form.imp) ?? 0,
    valorVenda: form.venda,
    fornecedorId: form.fornecedorId,
  };
  const liq = custoLiquido(atual, icmsAtual);
  const equilibrio = precoEquilibrio(atual, icmsAtual);
  const m = margem(atual, icmsAtual, form.venda);
  const situacao = sujo ? null : situacaoDe(linha, icmsAtual);

  function mudarMargem(p: number | null) {
    if (p === null) return mudar("venda", null);
    const v = vendaParaMargem(atual, icmsAtual, p / 100);
    if (v !== null) mudar("venda", v); // arredonda só ao salvar (não reescreve a margem digitada)
  }

  // Salva o estado MAIS RECENTE do form (lido das refs), comparando com a
  // última versão salva — assim saídas rápidas de campo não salvam em dobro.
  async function salvarAgora(): Promise<LinhaProduto | null> {
    const f = formRef.current;
    const base = linhaRef.current;
    if (iguais(f, formDe(base)) && base.id) return base;
    if (f.op === null || f.com === null || f.imp === null) {
      setErro("Preencha custos operacionais, comissões e imposto de saída.");
      return null;
    }
    const venda = f.venda === null ? null : Math.round(f.venda * 100) / 100;
    const salva: LinhaProduto = {
      ...base,
      secao: f.secao.trim() || SEM_SECAO,
      precoCusto: f.precoCusto,
      frete: f.frete,
      creditoIcms: dePct(f.credito),
      custoOp: dePct(f.op)!,
      comissao: dePct(f.com)!,
      impostoSaida: dePct(f.imp)!,
      valorVenda: venda,
      fornecedorId: f.fornecedorId,
      avisoCompra: null,
      alteradoEm: new Date().toISOString(),
    };
    setEstado("salvando");
    setErro(null);
    let res: Awaited<ReturnType<typeof salvarProduto>>;
    try {
      res = await salvarProduto({
        id: base.id,
        contaId: base.contaId,
        idVhsys: base.idVhsys,
        secao: f.secao.trim() || null,
        precoCusto: salva.precoCusto,
        frete: salva.frete,
        creditoIcms: salva.creditoIcms,
        custoOp: salva.custoOp,
        comissao: salva.comissao,
        impostoSaida: salva.impostoSaida,
        valorVenda: venda,
        fornecedorId: salva.fornecedorId,
      });
    } catch {
      res = { ok: false, erro: "Sem conexão com o servidor. Tente de novo." };
    }
    setEstado("livre");
    if (!res.ok || !res.id) {
      setErro(res.erro ?? "Falha ao salvar.");
      return null;
    }
    linhaRef.current = { ...salva, id: res.id };
    // A venda vinda da margem tem várias casas e foi salva em centavos: se nada
    // mudou desde este salvamento, alinha o form ao salvo (senão a linha ficaria
    // "não salva" para sempre e sem o botão Enviar).
    setForm((atualForm) => (iguais(atualForm, f) ? formDe(linhaRef.current) : atualForm));
    onAtualizada(linhaRef.current);
    return linhaRef.current;
  }

  function salvar(): Promise<LinhaProduto | null> {
    fila.current = fila.current.then(salvarAgora, salvarAgora);
    return fila.current;
  }

  async function enviar() {
    const l = await salvar();
    if (!l?.id) return;
    setEstado("enviando");
    setErro(null);
    let res: Awaited<ReturnType<typeof enviarProdutoAoVhsys>>;
    try {
      res = await enviarProdutoAoVhsys(l.id);
    } catch {
      res = { ok: false, erro: "Sem conexão com o servidor. Tente de novo." };
    }
    setEstado("livre");
    linhaRef.current = aplicarEnvio(linhaRef.current, res);
    onAtualizada(linhaRef.current);
  }

  // Escolher no seletor já salva (não há "sair do campo" num clique de lista).
  function escolherFornecedor(id: number) {
    formRef.current = { ...formRef.current, fornecedorId: id };
    setForm(formRef.current);
    void salvar();
  }

  // Salva ao sair de qualquer campo da linha (o foco que sai borbulha até o <tr>).
  function aoSairDeCampo() {
    void salvar();
  }

  const td = "px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap";
  const tdTexto = "px-3 py-1.5 text-right tabular-nums whitespace-nowrap";
  const podeEnviar = linha.idVhsys !== null && linha.vhsys !== null && (liq !== null || equilibrio !== null);

  return (
    <tr
      onBlur={aoSairDeCampo}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLElement).blur?.();
      }}
      className={`border-t border-gray-100 ${erro ? "bg-red-50" : sujo ? "bg-amber-50/40" : "hover:bg-gray-50"}`}
      title={erro ?? undefined}
    >
      <td className="max-w-xs px-3 py-1.5">
        <div className="flex items-center gap-2">
          <BadgeConta slug={linha.contaSlug} />
          <button
            type="button"
            onClick={() => void salvar().then(() => onAbrir(linhaRef.current))}
            title={linha.produto}
            className="truncate text-left text-gray-900 hover:text-primary-700 hover:underline"
          >
            {linha.produto}
          </button>
        </div>
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.precoCusto} onChange={(v) => mudar("precoCusto", v)} prefixo="R$" className="w-28" />
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.frete} onChange={(v) => mudar("frete", v)} prefixo="R$" className="w-24" />
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.credito} onChange={(v) => mudar("credito", v)} sufixo="%" className="w-20" placeholder="cheio" />
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.op} onChange={(v) => mudar("op", v)} sufixo="%" className="w-20" />
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.com} onChange={(v) => mudar("com", v)} sufixo="%" className="w-20" />
      </td>
      <td className={td}>
        <CampoNumero compacto value={form.imp} onChange={(v) => mudar("imp", v)} sufixo="%" className="w-20" />
      </td>
      <td className={`${tdTexto} font-medium`}>{brl(liq)}</td>
      <td className={tdTexto}>{brl(equilibrio)}</td>
      <td className={td}>
        <div className="flex items-center justify-end gap-1.5">
          {form.venda === null && equilibrio !== null && (
            <span
              title="Sem valor de venda: o VHSYS recebe o preço de equilíbrio"
              className="rounded-full border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-semibold uppercase text-amber-700"
            >
              sem margem
            </span>
          )}
          <CampoNumero
            compacto
            value={form.venda}
            onChange={(v) => mudar("venda", v)}
            placeholder={equilibrio === null ? "" : equilibrio.toFixed(2).replace(".", ",")}
            prefixo="R$"
            className="w-28"
          />
        </div>
      </td>
      <td className={td}>
        <CampoNumero
          compacto
          value={m === null ? null : m * 100}
          onChange={mudarMargem}
          sufixo="%"
          className={`w-20 font-medium ${m === null ? "" : m < 0 ? "text-red-600" : "text-green-700"}`}
        />
      </td>
      <td className="px-1.5 py-1.5">
        <SeletorFornecedor valor={form.fornecedorId} opcoes={fornecedores} onEscolher={escolherFornecedor} />
      </td>
      <td className={`${tdTexto} text-gray-600`}>
        <span className="inline-flex items-center gap-1">
          {linha.avisoCompra && (
            <span title={linha.avisoCompra} className="cursor-help text-amber-600">
              ⚠
            </span>
          )}
          {linha.ultimaCompra ? formatarData(linha.ultimaCompra) : "—"}
        </span>
      </td>
      <td className="px-3 py-1.5 text-center whitespace-nowrap">
        {estado !== "livre" ? (
          <span className="text-xs text-gray-500">{estado === "salvando" ? "Salvando…" : "Enviando…"}</span>
        ) : erro ? (
          <button
            type="button"
            onClick={() => void salvar()}
            title={erro}
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Não salvo · tentar de novo
          </button>
        ) : sujo ? (
          <span className="text-xs text-amber-600">Não salvo</span>
        ) : situacao === "ok" ? (
          <span title="Igual ao VHSYS" className="text-green-600">
            ✓
          </span>
        ) : situacao === "sem_vhsys" ? (
          <span className="text-xs text-gray-400">Sem VHSYS</span>
        ) : podeEnviar ? (
          <button
            type="button"
            onClick={enviar}
            title={
              situacao === "erro"
                ? `Erro no último envio: ${linha.erroEnvio}`
                : `No VHSYS: custo ${brl(linha.vhsys?.valorCusto ?? null)} · venda ${brl(linha.vhsys?.valor ?? null)}`
            }
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              situacao === "erro"
                ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
            }`}
          >
            {situacao === "erro" ? "Reenviar" : "Enviar"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
