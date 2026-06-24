"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarConta,
  alternarAtivoConta,
  sincronizarContaCompleto,
  type NovaContaInput,
} from "@/lib/accounts/admin-acoes";
import { ContaEditPanel } from "@/components/configuracoes/ContaEditPanel";
import type { Account } from "@/lib/accounts/repo";

interface Props {
  contas: Account[];
}

const VAZIO: NovaContaInput = {
  slug: "",
  accessToken: "",
  secretToken: "",
  apiBase: "",
  themeColor: "#1a73e8",
};

export function ContasClient({ contas }: Props) {
  const router = useRouter();
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState<NovaContaInput>(VAZIO);
  const [salvando, startSalvar] = useTransition();
  const [togglando, startToggle] = useTransition();
  const [sincronizando, startSync] = useTransition();
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const [editando, setEditando] = useState<Account | null>(null);

  function set<K extends keyof NovaContaInput>(k: K, v: NovaContaInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function salvar() {
    setFeedback(null);
    startSalvar(async () => {
      const res = await criarConta(form);
      if (res.ok) {
        const empresa = res.nomeEmpresa ? ` (empresa: ${res.nomeEmpresa})` : "";
        const msg = res.sincronizada
          ? `Conta criada e sincronizada${empresa}.`
          : `Conta criada${empresa}, mas a sincronização falhou${
              res.erroSync ? ` — ${res.erroSync}` : ""
            }. Use "Sincronizar".`;
        setFeedback({ tipo: res.sincronizada ? "ok" : "erro", msg });
        setForm(VAZIO);
        setFormAberto(false);
        router.refresh();
      } else {
        setFeedback({ tipo: "erro", msg: res.erro });
      }
    });
  }

  function toggle(conta: Account) {
    setFeedback(null);
    startToggle(async () => {
      const res = await alternarAtivoConta(conta.id, !conta.ativo);
      if (!res.ok) setFeedback({ tipo: "erro", msg: res.erro });
      else router.refresh();
    });
  }

  function sincronizar(conta: Account) {
    setFeedback(null);
    startSync(async () => {
      const res = await sincronizarContaCompleto(conta.id);
      if (res.ok) setFeedback({ tipo: "ok", msg: `Conta "${conta.slug}" sincronizada.` });
      else setFeedback({ tipo: "erro", msg: res.erro });
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Contas VHSYS</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cadastre e gerencie as contas (CNPJs/filiais). As credenciais são
            cifradas; o nome da empresa é buscado no VHSYS automaticamente.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => {
            setForm(VAZIO);
            setFeedback(null);
            setFormAberto((v) => !v);
          }}
        >
          {formAberto ? "Cancelar" : "Adicionar conta"}
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Formulário de cadastro */}
      {formAberto && (
        <div className="space-y-4 rounded-xl border border-gray-200 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Slug (identificador)
              </label>
              <input
                className="input-base"
                placeholder="ex.: matriz"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Cor do tema
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.themeColor ?? "") ? form.themeColor : "#1a73e8"}
                  onChange={(e) => set("themeColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                  aria-label="Cor do tema"
                />
                <input
                  className="input-base w-28 font-mono"
                  value={form.themeColor}
                  onChange={(e) => set("themeColor", e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Access token
            </label>
            <input
              className="input-base font-mono"
              value={form.accessToken}
              onChange={(e) => set("accessToken", e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Secret access token
            </label>
            <input
              className="input-base font-mono"
              value={form.secretToken}
              onChange={(e) => set("secretToken", e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Base da API (opcional)
            </label>
            <input
              className="input-base font-mono"
              placeholder="https://api.vhsys.com/v2"
              value={form.apiBase}
              onChange={(e) => set("apiBase", e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Cadastrando e sincronizando..." : "Cadastrar conta"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de contas */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Conta</th>
              <th className="px-4 py-2.5 font-medium">Cor</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma conta cadastrada.
                </td>
              </tr>
            )}
            {contas.map((conta) => (
              <tr key={conta.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {conta.nomeEmpresa ?? conta.slug}
                  </div>
                  <div className="text-xs text-gray-500">{conta.slug}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-black/10 align-middle"
                    style={{ backgroundColor: conta.themeColor }}
                    title={conta.themeColor}
                  />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      conta.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {conta.ativo ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => sincronizar(conta)}
                      disabled={sincronizando}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      title="Puxar dados do VHSYS agora (completo)"
                    >
                      {sincronizando ? "Sincronizando..." : "Sincronizar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(conta)}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(conta)}
                      disabled={togglando}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      {conta.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <ContaEditPanel
          conta={editando}
          onClose={() => setEditando(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}
