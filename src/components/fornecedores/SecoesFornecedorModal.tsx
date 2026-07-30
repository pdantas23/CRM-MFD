"use client";
// Modal para marcar em quais seções (Drywall / Piso Vinílico / Solução
// Acústica) um fornecedor está. Salva via server action e recarrega a lista.

import { useState, useTransition } from "react";
import { SECOES_FORNECEDOR } from "@/lib/fornecedores/secoes";
import { salvarSecoesFornecedor } from "@/lib/fornecedores/acoes";
import type { FornecedorComMateriais } from "./ListaFornecedores";

export function SecoesFornecedorModal({
  fornecedor,
  onFechar,
  onSalvo,
}: {
  fornecedor: FornecedorComMateriais;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [secoes, setSecoes] = useState<string[]>(fornecedor.secoes);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(chave: string) {
    setSecoes((prev) =>
      prev.includes(chave) ? prev.filter((s) => s !== chave) : [...prev, chave]
    );
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarSecoesFornecedor(fornecedor.id, secoes);
      if (!res?.ok) {
        setErro(res?.erro ?? "Falha ao salvar. Tente novamente.");
        return;
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
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Seções do fornecedor</h2>
          <p className="text-sm text-gray-500">{fornecedor.nome}</p>
        </div>

        <div className="space-y-2 px-6 py-4">
          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
          )}
          {SECOES_FORNECEDOR.map((s) => (
            <label
              key={s.chave}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={secoes.includes(s.chave)}
                onChange={() => toggle(s.chave)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              {s.label}
            </label>
          ))}
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
