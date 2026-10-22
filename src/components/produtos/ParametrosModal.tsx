"use client";
// Parâmetros de precificação por conta: ICMS atual (usado no DIFAL de todos os
// produtos) e as taxas padrão aplicadas a produtos ainda sem precificação.

import { useState, useTransition } from "react";
import { salvarConfigPrecificacao } from "@/lib/produtos/acoes";
import type { ConfigPrecificacao } from "@/lib/produtos/precificacao";
import { CampoNumero } from "./CampoNumero";
import { BadgeConta } from "./BadgeConta";

const emPct = (f: number) => Math.round(f * 1e6) / 1e4;
const dePct = (p: number | null) => (p === null ? null : Math.round(p * 1e4) / 1e6);

type Form = Record<"icms" | "op" | "com" | "imp", number | null>;

export function ParametrosModal({
  configs,
  slugs,
  onFechar,
  onSalvo,
}: {
  configs: ConfigPrecificacao[];
  slugs: Map<string, string>;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [forms, setForms] = useState<Record<string, Form>>(() =>
    Object.fromEntries(
      configs.map((c) => [
        c.contaId,
        { icms: emPct(c.icmsAtual), op: emPct(c.custoOpPadrao), com: emPct(c.comissaoPadrao), imp: emPct(c.impostoSaidaPadrao) },
      ])
    )
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function mudar(contaId: string, campo: keyof Form, v: number | null) {
    setForms((prev) => ({ ...prev, [contaId]: { ...prev[contaId], [campo]: v } }));
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      for (const c of configs) {
        const f = forms[c.contaId];
        if (Object.values(f).some((v) => v === null)) {
          setErro("Preencha todos os campos.");
          return;
        }
        const res = await salvarConfigPrecificacao({
          contaId: c.contaId,
          icmsAtual: dePct(f.icms)!,
          custoOpPadrao: dePct(f.op)!,
          comissaoPadrao: dePct(f.com)!,
          impostoSaidaPadrao: dePct(f.imp)!,
        });
        if (!res.ok) {
          setErro(`${slugs.get(c.contaId)?.toUpperCase()}: ${res.erro ?? "falha ao salvar."}`);
          return;
        }
      }
      onSalvo();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Parâmetros de precificação</h2>
          <p className="text-sm text-gray-500">
            O ICMS atual entra no custo líquido de todos os produtos da conta. As taxas padrão valem para produtos
            ainda sem precificação.
          </p>
        </div>

        <div className="space-y-4 px-6 py-4">
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {configs.map((c) => {
            const f = forms[c.contaId];
            return (
              <div key={c.contaId} className="grid grid-cols-[3.5rem_repeat(4,1fr)] items-end gap-3">
                <div className="pb-2.5">
                  <BadgeConta slug={slugs.get(c.contaId) ?? ""} />
                </div>
                {(
                  [
                    ["icms", "ICMS atual"],
                    ["op", "Custos op."],
                    ["com", "Comissões"],
                    ["imp", "Imposto saída"],
                  ] as const
                ).map(([campo, label]) => (
                  <div key={campo}>
                    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                    <CampoNumero value={f[campo]} onChange={(v) => mudar(c.contaId, campo, v)} sufixo="%" />
                  </div>
                ))}
              </div>
            );
          })}
          <p className="text-xs text-gray-400">
            Mudar o ICMS atual muda o custo líquido dos produtos; eles ficam com “Enviar” na coluna VHSYS até serem
            reenviados.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onFechar} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={salvar} disabled={pending} className="btn-primary">
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
