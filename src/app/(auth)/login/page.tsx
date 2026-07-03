"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Cores da marca Modular (vermelho) aplicadas SÓ na tela de login, sobrescrevendo
// as CSS vars primary-* (que por padrão são azuis fora do tema por conta). Assim
// btn-primary e o focus dos inputs ficam vermelhos sem tocar no tema global.
const BRAND_VARS = {
  "--color-primary-500": "225 31 38",
  "--color-primary-600": "212 28 34",
  "--color-primary-700": "176 22 28",
} as React.CSSProperties;

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
    <div
      style={BRAND_VARS}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4"
    >
      {/* Brilho vermelho da marca ao fundo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-8rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary-600/25 blur-[120px]"
      />

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
          <Spinner className="h-8 w-8 text-primary-500" />
        </div>
      )}

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Modular"
            width={112}
            height={112}
            priority
            className="mx-auto mb-2 h-28 w-28 object-contain"
          />
          <h1 className="text-xl font-semibold tracking-wide text-white">Sistema interno</h1>
          <p className="mt-1 text-sm text-neutral-400">Acesso restrito</p>
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
              Gerenciamento interno
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
