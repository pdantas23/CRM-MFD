"use client";

import { useEffect, useState, useTransition } from "react";
import {
  atualizarConta,
  criarSuperadminConta,
  listarSuperadminsConta,
} from "@/lib/accounts/admin-acoes";
import type { Account } from "@/lib/accounts/repo";

interface Props {
  conta: Account;
  onClose: () => void;
  onChanged: () => void;
}

type Feedback = { tipo: "ok" | "erro"; msg: string } | null;

export function ContaEditPanel({ conta, onClose, onChanged }: Props) {
  // ── Edição da conta ──────────────────────────────────────────────────────
  const [slug, setSlug] = useState(conta.slug);
  const [themeColor, setThemeColor] = useState(conta.themeColor);
  const [apiBase, setApiBase] = useState(conta.apiBase);
  const [accessToken, setAccessToken] = useState("");
  const [secretToken, setSecretToken] = useState("");
  const [salvando, startSalvar] = useTransition();
  const [fbConta, setFbConta] = useState<Feedback>(null);

  // ── Superadmins da conta ─────────────────────────────────────────────────
  const [supers, setSupers] = useState<{ id: string; nome: string }[]>([]);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [criando, startCriar] = useTransition();
  const [fbSuper, setFbSuper] = useState<Feedback>(null);

  function carregarSupers() {
    listarSuperadminsConta(conta.id).then((r) => {
      if (r.ok) setSupers(r.usuarios);
    });
  }
  useEffect(carregarSupers, [conta.id]);

  function salvarConta() {
    setFbConta(null);
    startSalvar(async () => {
      const res = await atualizarConta(conta.id, {
        slug,
        themeColor,
        apiBase,
        accessToken: accessToken || undefined,
        secretToken: secretToken || undefined,
      });
      if (res.ok) {
        setFbConta({ tipo: "ok", msg: "Conta atualizada." });
        setAccessToken("");
        setSecretToken("");
        onChanged();
      } else {
        setFbConta({ tipo: "erro", msg: res.erro });
      }
    });
  }

  function criarSuper() {
    setFbSuper(null);
    startCriar(async () => {
      const res = await criarSuperadminConta({ contaId: conta.id, nome, senha });
      if (res.ok) {
        setFbSuper({ tipo: "ok", msg: `Superadmin "${nome}" criado.` });
        setNome("");
        setSenha("");
        carregarSupers();
        onChanged();
      } else {
        setFbSuper({ tipo: "erro", msg: res.erro });
      }
    });
  }

  const corValida = /^#[0-9a-fA-F]{6}$/.test(themeColor);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Editar conta — {conta.nomeEmpresa ?? conta.slug}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Dados da conta */}
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Slug</label>
                <input
                  className="input-base"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Cor</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={corValida ? themeColor : "#1a73e8"}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                    aria-label="Cor do tema"
                  />
                  <input
                    className="input-base w-28 font-mono"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Base da API</label>
              <input
                className="input-base font-mono"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                spellCheck={false}
              />
            </div>

            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Rotacionar credenciais (opcional)
              </summary>
              <div className="mt-3 space-y-3">
                <input
                  className="input-base font-mono"
                  placeholder="Novo access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <input
                  className="input-base font-mono"
                  placeholder="Novo secret token"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500">
                  Deixe em branco para manter as credenciais atuais. Ao rotacionar, o
                  nome da empresa é rebuscado no VHSYS.
                </p>
              </div>
            </details>

            {fbConta && (
              <div
                className={`rounded-lg px-4 py-2.5 text-sm ${
                  fbConta.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {fbConta.msg}
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={salvarConta} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar conta"}
              </button>
            </div>
          </section>

          {/* Superadmins */}
          <section className="space-y-3 border-t border-gray-200 pt-5">
            <h4 className="text-sm font-semibold text-gray-900">Superadmins desta conta</h4>

            {supers.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum superadmin cadastrado.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {supers.map((s) => (
                  <li key={s.id} className="px-3 py-2 text-sm text-gray-800">
                    {s.nome}
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-stretch">
                  <input
                    className="input-base rounded-r-none"
                    placeholder="Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    spellCheck={false}
                  />
                  <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 font-mono text-sm text-gray-500">
                    -{conta.slug}
                  </span>
                </div>
              </div>
              <input
                className="input-base"
                type="password"
                placeholder="Senha (mín. 6)"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-gray-500">
              O slug da conta (<span className="font-mono">-{conta.slug}</span>) é
              adicionado automaticamente ao nome — login final:{" "}
              <span className="font-mono text-gray-700">
                {(nome.trim() || "nome")}-{conta.slug}
              </span>
              .
            </p>

            {fbSuper && (
              <div
                className={`rounded-lg px-4 py-2.5 text-sm ${
                  fbSuper.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {fbSuper.msg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={criarSuper}
                disabled={criando || !nome || senha.length < 6}
              >
                {criando ? "Criando..." : "Criar superadmin"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
