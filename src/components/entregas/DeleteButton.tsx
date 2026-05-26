"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DeleteButtonProps {
  entregaId: string;
  anexoUrl: string | null;
}

export function DeleteButton({ entregaId, anexoUrl }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();

    if (anexoUrl) {
      const urlParts = anexoUrl.split(`/anexos-entregas/`);
      if (urlParts[1]) {
        await supabase.storage.from("anexos-entregas").remove([urlParts[1]]);
      }
    }

    await supabase.from("entregas").delete().eq("id", entregaId);

    router.push("/entregas");
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Confirmar exclusão?</span>
        <button onClick={handleDelete} disabled={loading} className="btn-danger text-xs px-3 py-1.5">
          {loading ? "Excluindo..." : "Sim, excluir"}
        </button>
        <button onClick={() => setConfirm(false)} className="btn-secondary text-xs px-3 py-1.5">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="btn-danger">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Excluir
    </button>
  );
}
