// Etiqueta de status do serviço de montagem (fase + atraso): pílula suave com
// marcador colorido; o atraso aparece como um contador "3d" dentro da pílula.
import { ROTULO_FASE, type StatusServico } from "@/lib/montagens/status";

const ESTILO = {
  previsto: { pilula: "bg-amber-50 text-amber-800 ring-amber-600/20", ponto: "bg-amber-500" },
  andamento: { pilula: "bg-blue-50 text-blue-700 ring-blue-600/20", ponto: "bg-blue-500" },
  finalizado: { pilula: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", ponto: "bg-emerald-500" },
  atrasado: { pilula: "bg-red-50 text-red-700 ring-red-600/20", ponto: "bg-red-500" },
} as const;

export function BadgeStatus({ st }: { st: StatusServico }) {
  const chave = st.atrasado ? "atrasado" : st.fase;
  const { pilula, ponto } = ESTILO[chave];
  const rotulo = st.atrasado ? (st.fase === "previsto" ? "Início atrasado" : "Atrasado") : ROTULO_FASE[st.fase];
  const dias = st.atrasado || st.terminouAtrasado ? st.diasAtraso : 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${pilula}`}
      title={st.terminouAtrasado ? `Terminou ${st.diasAtraso} dia(s) depois do previsto` : undefined}
    >
      {st.fase === "finalizado" && !st.atrasado ? (
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <span className="relative flex h-1.5 w-1.5">
          {chave === "andamento" && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${ponto}`} />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${ponto}`} />
        </span>
      )}
      {rotulo}
      {dias > 0 && (
        <span
          className={`rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${
            st.atrasado ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {st.atrasado ? `${dias}d` : `+${dias}d`}
        </span>
      )}
    </span>
  );
}
