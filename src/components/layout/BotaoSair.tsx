"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Botão de logout reutilizável (encerra a sessão Supabase e volta ao login). */
export function BotaoSair({ className }: { className?: string }) {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={sair} className={className}>
      Sair
    </button>
  );
}
