// Etiqueta da conta (SA, KCM…) de cada produto da tabela única.
const CORES: Record<string, string> = {
  sa: "bg-sky-100 text-sky-800 border-sky-200",
  kcm: "bg-violet-100 text-violet-800 border-violet-200",
};

export function BadgeConta({ slug }: { slug: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase ${
        CORES[slug] ?? "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {slug}
    </span>
  );
}
