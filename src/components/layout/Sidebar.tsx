"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";
import { ehSuperadmin } from "@/lib/auth/roles";
import type { Profile, Role } from "@/lib/types/database";
import { SeletorConta, type ContaOpcao } from "@/components/layout/SeletorConta";

interface SidebarProps {
  profile: Profile;
  /** Nome da empresa/conta ativa (vindo do VHSYS, cacheado em accounts). */
  nomeEmpresa: string;
  /** Contas que o usuário pode acessar (para o seletor de troca). */
  contas: ContaOpcao[];
  /** Slug da conta atualmente ativa. */
  slugAtivo: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Se definido, item visível apenas para estes roles. */
  roles?: Role[];
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    roles: ["admin"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/entregas",
    label: "Entregas",
    // Financeiro tem acesso de LEITURA (não opera). Superadmin entra via "admin".
    roles: ["admin", "vendedor", "entregador", "financeiro"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/pedidos",
    label: "Pedidos",
    roles: ["admin", "vendedor", "financeiro"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: "/orcamentos",
    label: "Orçamentos",
    // Financeiro tem acesso de LEITURA (não emite/move).
    roles: ["admin", "vendedor", "financeiro"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/fornecedores",
    label: "Fornecedores",
    // Superadmin entra via "admin" (lógica de filtro abaixo).
    roles: ["admin"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V8a2 2 0 00-2-2h-3V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4M9 9h1m-1 4h1m4-4h1m-1 4h1M5 21h14" />
      </svg>
    ),
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    roles: ["superadmin"],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar({ profile, nomeEmpresa, contas, slugAtivo }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isNavPending, startNavTransition] = useTransition();

  function navegar(href: string) {
    setPendingHref(href);
    startNavTransition(() => {
      router.push(href);
    });
  }

  // Limpa pendingHref quando a rota efetivamente muda
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Image src="/logo.png" alt="Modular" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
          <span className="shrink-0 font-mono text-sm font-bold uppercase text-gray-900">{slugAtivo}</span>
          <span className="truncate text-xs text-gray-500" title={nomeEmpresa}>{nomeEmpresa}</span>
        </div>
      </div>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (drawer mobile / static desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary-900 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-primary-800 px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Image src="/logo.png" alt="Modular" width={40} height={40} priority className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0">
              <span className="block font-mono text-base font-bold uppercase leading-tight tracking-wide">
                {slugAtivo}
              </span>
              <span className="block truncate text-[11px] leading-tight text-primary-300" title={nomeEmpresa}>
                {nomeEmpresa}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary-200 hover:bg-primary-800 hover:text-white lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems
            .filter(
              (item) =>
                !item.roles ||
                item.roles.includes(profile.role) ||
                (ehSuperadmin(profile.role) && item.roles.includes("admin"))
            )
            .map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const isPendingThis = isNavPending && pendingHref === item.href;
            return (
              <button
                key={item.href}
                type="button"
                // Rotas do dashboard são force-dynamic — navega no clique;
                // useTransition + loading.tsx dão o feedback visual.
                onClick={() => navegar(item.href)}
                disabled={isNavPending}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none ${
                  isActive
                    ? "bg-primary-700 text-white"
                    : "text-primary-200 hover:bg-primary-800 hover:text-white"
                } ${isPendingThis ? "opacity-70" : ""}`}
              >
                {isPendingThis ? (
                  <Spinner className="h-5 w-5 shrink-0" />
                ) : (
                  item.icon
                )}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-primary-800 p-3">
          <SeletorConta contas={contas} slugAtivo={slugAtivo} />
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold">
              {profile.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{profile.nome}</p>
              <p className="text-xs capitalize text-primary-300">{profile.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-200 transition-colors hover:bg-primary-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
