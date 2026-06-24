"use client";

import { useEffect, useState } from "react";

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? "h-5 w-5"}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Mensagens dos códigos de erro devolvidos pelo endpoint (?erro=...).
const MENSAGENS_ERRO: Record<string, string> = {
  campos: "Preencha nome e senha.",
  nome: "Nome não encontrado. Verifique e tente novamente.",
  config: "Usuário sem e-mail configurado.",
  senha: "Senha incorreta. Tente novamente.",
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Erro vindo do redirect do endpoint. Lido via window.location para não
  // exigir <Suspense> de useSearchParams.
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get("erro");
    if (codigo) setError(MENSAGENS_ERRO[codigo] ?? "Erro ao entrar.");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700 px-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-900 to-primary-700">
          <Spinner className="h-8 w-8 text-white" />
        </div>
      )}

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <svg className="h-9 w-9 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "CRM"}
          </h1>
          <p className="mt-1 text-primary-200">
            {process.env.NEXT_PUBLIC_APP_LOGIN_SUBTITLE ?? "Acesso interno"}
          </p>
        </div>

        <div className="card p-8">
          {/* Submit NATIVO (sem preventDefault): navegação real para o endpoint,
              que redireciona em sucesso/erro. É o que faz o iCloud Keychain /
              gerenciadores de senha reconhecerem o login e oferecerem salvar. */}
          <form
            method="post"
            action="/api/auth/login"
            onSubmit={() => setLoading(true)}
            className="space-y-5"
          >
            <div>
              <label htmlFor="nome" className="mb-1.5 block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                autoComplete="username"
                className="input-base"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <><Spinner /> Entrando...</> : "Entrar"}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-100 pt-4 text-center">
            <a
              href="/gerenciamento"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
            >
              Gerenciamento interno do CRM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
